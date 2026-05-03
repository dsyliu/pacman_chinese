# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server at http://localhost:3000 (hot-reload)
npm run build        # Type-check then bundle to dist/
npm run preview      # Serve the production build locally
npm test             # Run Vitest suite once
npm run test:watch   # Vitest in watch mode
npm run coverage     # Vitest with v8 coverage report
```

Type checking runs as part of `npm run build` (`tsc && vite build`). Tests live in `__tests__/` subfolders next to the file under test (e.g. `src/entities/__tests__/Maze.test.ts`). Phaser is mocked at module level via `src/test-utils/phaserMock.ts` so the suite never imports the real 1.5 MB framework.

## Architecture

Single-scene Phaser 3 game written in TypeScript. The only Phaser scene is `GameScene`, which owns and coordinates all subsystems.

### Entity / Manager split

| Layer | Files | Responsibility |
|---|---|---|
| Entities | `Maze`, `Pacman`, `CharacterGhost` | Self-contained game objects; update themselves each frame |
| Managers | `GameStateManager`, `SentenceManager`, `DataLoader`, `AudioManager`, `ScoreboardManager` | Cross-cutting concerns owned by `GameScene` |
| Scene | `GameScene` | Wires entities + managers together; drives collision logic and state transitions |

### Key implementation details

**Maze** (`src/entities/Maze.ts`): Three hardcoded 28×31 layouts in the `LAYOUTS` array — `GameScene` picks one at random on every play/restart via `Maze.LAYOUT_COUNT`. `TILE_SIZE = 32px`. All coordinate math flows through `tileToWorld` / `worldToTile` helpers. Walls are rendered with `Phaser.GameObjects.Graphics` — there are no sprites or tilemaps. The Maze also owns a separate dot Graphics layer: `spawnDots(excludeCol, excludeRow)` populates one dot on every path tile (skipping the Pacman start), `tryEatDot(col, row)` consumes a dot and returns whether one was present, `hasDot(col, row)` is a readonly check. Layout invariants (every cell reachable, no 2×2 open blocks, fully enclosed border) are enforced by tests in `src/entities/__tests__/Maze.test.ts`.

**Grid-aligned movement** (`Pacman`, `CharacterGhost`): Both entities move at a pixel speed but snap to tile centers. Pacman queues a direction change and applies it only when it reaches a tile center and the next tile is open — this is the classic Pac-Man "pre-turn" feel. Ghosts use the same center-snapping logic and pick a random non-reversing direction at each intersection.

**Input modes** (`src/utils/input.ts`): `detectInputMode()` returns `'touch'` if `matchMedia('(pointer: coarse)')` matches, else `'keyboard'`. This is feature-detection (CSS-level), not UA sniffing — it correctly handles iPad+keyboard, Surface tablets, and laptops with touchscreens. In keyboard mode, only Pacman's `cursors.*.isDown` polling is used. In touch mode, `GameScene.renderDPad()` draws four interactive arrow buttons (↑↓←→) inside the side panel and wires each to `Pacman.queueDirection(dx, dy)` — the same queue keyboard input writes to, so the rest of the movement logic is mode-agnostic. There is no swipe handler (an earlier swipe-based design was rejected for being imprecise). The visible CONTROLS panel and restart hint also flip between the two modes. Restart-on-tap-anywhere is registered scene-wide in `beginGame()` and gated on `state === GAME_OVER || state === VICTORY`; restart-on-SPACE is registered separately and is unconditional, both single-bound via flags (`tapRestartBound`, `spaceRestartBound`).

**Collision detection** (`GameScene.checkCollisions`): Manual distance check each frame (no Phaser arcade physics bodies). Threshold is `TILE_SIZE * 0.7`. Touching a correct ghost calls `collectCorrectCharacter`; touching a wrong ghost calls `gameOver`.

**Audio** (`src/managers/AudioManager.ts`): Uses the Web Audio API directly — no Phaser audio system. Background music is a looping 16-note I-vi-IV-V arpeggio, scheduled ahead-of-time via `setInterval` and routed through a `bgMasterGain` node so `stopBackgroundMusic` can ramp it to 0 instantly (otherwise pre-scheduled oscillators keep playing past game-end). Victory and game-over stings are one-shot note sequences. To satisfy the browser autoplay policy, `AudioManager` installs window/document-level capture-phase listeners on first user interaction and calls `audioContext.resume()` — but the **start splash in `GameScene` is what actually unlocks audio in practice**, since the same gesture both dismisses it and resumes the context.

**Lessons & sentences** (`data/sentences.json`): Fetched at runtime by `DataLoader` (cached after first load). Top-level shape is `{ lessons: [{ id, name, sentences: [...] }] }`. Each `sentences[i]` is a `LevelData` (`{ id, sentence, correctChars, wrongChars, translation }`). On play/restart, `GameScene` picks a random sentence from `currentLessonId`'s lesson; clicking another lesson in the menu calls `selectLesson(id)` which updates `currentLessonId` and triggers `restart()`. The `sentence` field uses spaces (` `) to mark blank positions — there is no separate `blanks` array; `getBlankIndices(sentence)` in `src/utils/sentence.ts` derives indices from the spaces. `correctChars` and `wrongChars` are the ghost populations.

**Lesson menu** (`src/managers/LessonMenuManager.ts`): Renders clickable lesson labels in either a `vertical` column (landscape, left of maze) or `horizontal` row (portrait, above maze). The active lesson is colored gold (`#FFD24A`); inactive lessons are gray (`#BBBBBB`) with a white hover state. Each label is a Phaser `Text` with `setInteractive` + `pointerdown` wired to the `onSelect` callback. `setSelected(id)` swaps highlight colors without re-rendering.

**Sentence display** (`SentenceManager`): Rebuilds Phaser `Text` objects from scratch on every character collection. Blanks are shown as `?` with single ASCII spaces on either side (e.g. `我 ? 你`) until filled. Filled blanks keep the same surrounding spaces (`我 愛 你`) so the layout doesn't shift when a character is collected.

**State machine**: Four states defined in `src/utils/types.ts` — `MENU`, `PLAYING`, `GAME_OVER`, `VICTORY`. `GameScene.update` is gated on `PLAYING`; transitions are triggered by collision outcomes. After `create()`, the scene holds in `MENU` and shows a "Click or Press Any Key to Start" splash (depth 2000); the first interaction calls `beginGame()`, which destroys the splash, resumes the audio context, starts background music, and transitions to `PLAYING`. Restarts after game-over/victory skip the splash since audio is already unlocked.

**Viewport scaling and orientation** (`src/utils/layout.ts`): `getCanvasDimensions()` reads `matchMedia('(orientation: portrait)')` once at startup and returns either `LANDSCAPE_CANVAS` (1280×1112: 128px lesson column on the left + 896px maze + 256px scoreboard column on the right) or `PORTRAIT_CANVAS` (896×1560: 60px lesson bar at the top + 992px maze + sentence + horizontal scoreboard panel below). `getMazeOffset(orientation)` returns `{x: 128, y: 0}` (landscape) or `{x: 0, y: 60}` (portrait); the `Maze` constructor takes this and calls `setPosition` on its Graphics layers, while `tileToWorld`/`worldToTile` apply the offset so Pacman, Ghosts, sentence text, and end-screen text all line up. `getPanelRect(orientation)` resolves the scoreboard column; `getLessonRect(orientation)` resolves the lesson menu rect. In landscape, `ScoreboardManager.render` uses `layoutMode: 'vertical'` (the default) — SCORE/STATS/HOW TO PLAY/CONTROLS stacked top to bottom in a 256×~925px column. In portrait, `GameScene` passes `layoutMode: 'horizontal'`: a single horizontal band where the top row holds five labels (SCORE | Played | Won | Lost | CONTROLS) all at the same y, and the row beneath holds the corresponding numeric values plus the controls body — also at one shared y. HOW TO PLAY runs along the bottom. The D-pad in portrait+touch is centered on the CONTROLS column at the value y. Whole panel is ~210px tall. The D-pad in portrait+touch sits in the right column (col3 ≈ 5/6 panel width) aligned with the CONTROLS header, not centered. `main.ts` reads the dims at startup; rotating the device after launch will not re-layout — Phaser auto-fits the existing canvas, but text positions stay where they were. Sentence/translation/splash/end-screen text are anchored to the maze midpoint (`BOARD_PIXEL_WIDTH / 2 = 448`) and to `BOARD_PIXEL_HEIGHT / 2 = 496` — **not** the screen midpoint — so they stay on the maze regardless of canvas height. The canvas auto-scales down proportionally to fit the browser viewport (no scrollbars), and `index.html`'s flex container handles centering — do **not** add `autoCenter: CENTER_BOTH` back, as it double-centers and pushes the canvas off-screen.

**Scoreboard** (`src/managers/ScoreboardManager.ts`): Renders a Score / Played / Won / Lost panel to the right of the maze. `won`, `lost`, and `points` are persisted to `sessionStorage` under key `pacman_chinese.scoreboard.v1`, so all three survive page reloads but reset when the tab/browser is closed (matches the per-session intent). `played` is computed as `won + lost` — only completed games count, not in-progress ones. Hooked from `GameScene.update()` (calls `addPoints(1)` whenever Pacman lands on a dot), `GameScene.victory()` (calls `addWinBonus()` for +100 and `recordWin`), and `GameScene.gameOver()` (calls `recordLoss`); the win/loss recordings are guaranteed single-call per game because `update()` is gated on `state === PLAYING`.

**End-screen text on top**: `gameOverText`, `victoryText`, and the start splash all call `setDepth(>=1000)` so the maze (re-created on restart) cannot render over them.

### Data format for new lessons

```json
{
  "lessons": [
    {
      "id": 1,
      "name": "Lesson 1",
      "sentences": [
        {
          "id": 1,
          "sentence": "我 你",
          "correctChars": ["愛"],
          "wrongChars": ["恨", "怕", "想", "看", "打"],
          "translation": "I love you"
        }
      ]
    }
  ]
}
```

- Each lesson should have ~4 sentences. The lesson menu shows them in `lessons[]` order, with the first lesson selected by default.
- `sentence`: each ASCII space character marks a blank — its position in the string is the blank's character index. To produce two consecutive blanks, use two spaces (e.g. `"上山找  "`).
- Max 5 wrong ghosts are spawned (`MAX_WRONG_GHOSTS` constant in `GameScene.ts`)
- Ghosts spawn at least 5 Manhattan-distance tiles from Pacman's start tile (col 13, row 24)

## Deployment

`deploy/oci-cloud-init.yaml` is a turn-key cloud-init script for Oracle Cloud Infrastructure (Oracle Linux 8/9). It installs nginx + Node 20, clones this public repo, builds, and serves `dist/` on port 80. Two manual OCI-console steps are still required: open TCP 80 in the VCN security list, and assign a public IP.
