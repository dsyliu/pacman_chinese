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

**Collision detection** (`GameScene.checkCollisions`): Manual distance check each frame (no Phaser arcade physics bodies). Threshold is `TILE_SIZE * 0.7`. Touching a correct ghost calls `collectCorrectCharacter`; touching a wrong ghost calls `gameOver`.

**Audio** (`src/managers/AudioManager.ts`): Uses the Web Audio API directly — no Phaser audio system. Background music is a looping 16-note I-vi-IV-V arpeggio, scheduled ahead-of-time via `setInterval` and routed through a `bgMasterGain` node so `stopBackgroundMusic` can ramp it to 0 instantly (otherwise pre-scheduled oscillators keep playing past game-end). Victory and game-over stings are one-shot note sequences. To satisfy the browser autoplay policy, `AudioManager` installs window/document-level capture-phase listeners on first user interaction and calls `audioContext.resume()` — but the **start splash in `GameScene` is what actually unlocks audio in practice**, since the same gesture both dismisses it and resumes the context.

**Level data** (`data/sentences.json`): Fetched at runtime by `DataLoader` (cached after first load). A random level is selected on each play/restart. The `sentence` field uses spaces/underscores to mark blank positions; `blanks` is an array of character indices where blanks appear; `correctChars` and `wrongChars` are the ghost populations.

**Sentence display** (`SentenceManager`): Rebuilds Phaser `Text` objects from scratch on every character collection. Blanks are shown as `?` with single ASCII spaces on either side (e.g. `我 ? 你`) until filled. Filled blanks keep the same surrounding spaces (`我 愛 你`) so the layout doesn't shift when a character is collected.

**State machine**: Four states defined in `src/utils/types.ts` — `MENU`, `PLAYING`, `GAME_OVER`, `VICTORY`. `GameScene.update` is gated on `PLAYING`; transitions are triggered by collision outcomes. After `create()`, the scene holds in `MENU` and shows a "Click or Press Any Key to Start" splash (depth 2000); the first interaction calls `beginGame()`, which destroys the splash, resumes the audio context, starts background music, and transitions to `PLAYING`. Restarts after game-over/victory skip the splash since audio is already unlocked.

**Viewport scaling**: `main.ts` uses `Phaser.Scale.FIT` with internal dimensions 1152×1112 — the maze occupies the left 896px (`BOARD_PIXEL_WIDTH`, exported from `Maze.ts`) and the scoreboard panel occupies the right 256px. Sentence/translation/splash/end-screen text are centered on the maze midpoint (`BOARD_PIXEL_WIDTH / 2 = 448`), **not** the screen midpoint, so they stay visually anchored under the maze. The canvas auto-scales down proportionally to fit the browser viewport (no scrollbars), and `index.html`'s flex container handles centering — do **not** add `autoCenter: CENTER_BOTH` back, as it double-centers and pushes the canvas off-screen.

**Scoreboard** (`src/managers/ScoreboardManager.ts`): Renders a Score / Played / Won / Lost panel to the right of the maze. `won`, `lost`, and `points` are persisted to `sessionStorage` under key `pacman_chinese.scoreboard.v1`, so all three survive page reloads but reset when the tab/browser is closed (matches the per-session intent). `played` is computed as `won + lost` — only completed games count, not in-progress ones. Hooked from `GameScene.update()` (calls `addPoints(1)` whenever Pacman lands on a dot), `GameScene.victory()` (calls `addWinBonus()` for +100 and `recordWin`), and `GameScene.gameOver()` (calls `recordLoss`); the win/loss recordings are guaranteed single-call per game because `update()` is gated on `state === PLAYING`.

**End-screen text on top**: `gameOverText`, `victoryText`, and the start splash all call `setDepth(>=1000)` so the maze (re-created on restart) cannot render over them.

### Data format for new levels

```json
{
  "id": 2,
  "sentence": "我 你",
  "blanks": [1],
  "correctChars": ["愛"],
  "wrongChars": ["恨", "怕", "想", "看", "打"],
  "translation": "I love you"
}
```

- `sentence`: space/underscore between characters marks where blanks go; the index in `blanks` refers to the character position in the split array
- Max 5 wrong ghosts are spawned (`MAX_WRONG_GHOSTS` constant in `GameScene.ts`)
- Ghosts spawn at least 5 Manhattan-distance tiles from Pacman's start tile (col 13, row 24)

## Deployment

`deploy/oci-cloud-init.yaml` is a turn-key cloud-init script for Oracle Cloud Infrastructure (Oracle Linux 8/9). It installs nginx + Node 20, clones this public repo, builds, and serves `dist/` on port 80. Two manual OCI-console steps are still required: open TCP 80 in the VCN security list, and assign a public IP.
