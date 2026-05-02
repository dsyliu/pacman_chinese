# Chinese Character Learning Game

An educational browser-based game that helps young students learn Chinese characters through interactive gameplay. Built around a classic Pac-Man-style maze, players navigate corridors to collect the correct Chinese characters that complete sentences while avoiding wrong characters.

## About the Game

This game combines entertainment with education to make learning Chinese characters fun and engaging. The game displays a sentence with missing characters (shown as `?`), and players control Pacman through a 28×31 tile maze to collect only the correct Chinese character "ghosts" that complete the sentence. Collecting wrong characters results in game over, while collecting all correct characters leads to victory.

Each game randomly selects one of three hand-designed mazes and one sentence from `data/sentences.json`, so no two playthroughs are identical. The canvas auto-scales to fit any browser viewport.


## Technology Stack

- **Phaser.js 3** - 2D game framework
- **TypeScript** - Type-safe JavaScript
- **Vite** - Build tool and development server
- **Web Audio API** - Programmatic music generation

## Installation

### Prerequisites

- Node.js (version 16 or higher)
- npm (comes with Node.js)

### Steps

1. **Clone or download the project**
   ```bash
   cd pacman_chinese
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

   This will install:
   - Phaser.js (game framework)
   - TypeScript (type-safe JavaScript)
   - Vite (build tool)

## Running the Game

### Development Mode

To run the game in development mode with hot-reloading:

```bash
npm run dev
```

The game will be available at `http://localhost:3000` (or another port if 3000 is in use). Open this URL in your web browser to play.

### Production Build

To create an optimized production build:

```bash
npm run build
```

The built files will be in the `dist/` directory. You can serve these files using any static web server.

### Preview Production Build

To preview the production build locally:

```bash
npm run preview
```

## Game Controls

- **Click** or **Any Key** - Dismiss the start splash and begin play (also unlocks browser audio)
- **Arrow Keys** or **WASD** - Move Pacman
- **Spacebar** - Restart game (after game over or victory)

## Gameplay

1. The first time the game loads, a "Click or Press Any Key to Start" splash appears — this also unlocks browser audio so the music plays from the very first move.
2. A sentence with missing characters is displayed at the bottom of the screen.
3. Missing characters are shown as `?`.
4. Chinese character "ghosts" wander through the maze corridors, picking random valid directions at each intersection.
5. Control Pacman through the maze to collect only the **correct** characters that complete the sentence.
6. Pacman is grid-aligned: queue a turn before reaching an intersection and it will turn when the path opens.
7. Avoid **wrong** characters - touching them ends the game immediately.
8. Win by collecting all correct characters to complete the sentence.
9. Press **Spacebar** to restart and play a new random level (with a fresh random maze).

## Customizing Sentences

Edit `data/sentences.json` to add or modify sentences:

```json
{
  "levels": [
    {
      "id": 1,
      "sentence": "我 你",
      "blanks": [1],
      "correctChars": ["愛"],
      "wrongChars": ["恨", "怕", "想", "看", "打"],
      "translation": "I love you"
    }
  ]
}
```

- `sentence`: The sentence with spaces where blanks should appear
- `blanks`: Array of character indices where blanks are located
- `correctChars`: Array of correct Chinese characters to complete the sentence
- `wrongChars`: Array of wrong characters that will appear as obstacles
- `translation`: English translation (displayed below the sentence)

## Project Structure

```
pacman_chinese/
├── data/
│   └── sentences.json                # Sentence data with correct/wrong characters
├── deploy/
│   └── oci-cloud-init.yaml           # One-shot cloud-init for Oracle Cloud
├── src/
│   ├── entities/
│   │   ├── Maze.ts                   # Three layouts, wall rendering, tile helpers
│   │   ├── Pacman.ts                 # Player character controller
│   │   ├── CharacterGhost.ts         # Chinese character ghost entities
│   │   └── __tests__/                # Vitest specs (Maze invariants, movement, etc.)
│   ├── managers/
│   │   ├── AudioManager.ts           # Web Audio music + autoplay handling
│   │   ├── DataLoader.ts             # Loads sentence data from JSON
│   │   ├── GameState.ts              # Game state machine
│   │   ├── SentenceManager.ts        # Manages sentence display
│   │   └── __tests__/
│   ├── scenes/
│   │   ├── GameScene.ts              # Main game scene + start splash
│   │   └── __tests__/
│   ├── test-utils/
│   │   └── phaserMock.ts             # Module-level Phaser stand-in for tests
│   ├── utils/
│   │   └── types.ts                  # TypeScript type definitions
│   └── main.ts                       # Game entry point + Phaser scale config
├── index.html                        # HTML entry point
├── package.json                      # Dependencies and scripts
├── tsconfig.json                     # TypeScript configuration
├── vite.config.ts                    # Vite build configuration
└── vitest.config.ts                  # Vitest + coverage configuration
```

## Development

### Building

```bash
npm run build
```

### Tests

```bash
npm test             # run the full Vitest suite once
npm run test:watch   # watch mode while developing
npm run coverage     # v8 coverage report
```

Tests live in `__tests__/` subfolders next to the file they cover. Phaser is mocked at module level (`src/test-utils/phaserMock.ts`) so the suite runs in milliseconds without pulling the full framework.

### Type Checking

TypeScript will check types during the build process. For development, your IDE should provide real-time type checking.

## Deployment to Oracle Cloud

`deploy/oci-cloud-init.yaml` is a turn-key cloud-init script that brings up a fresh Oracle Linux 8/9 instance, installs nginx + Node 20, clones this repo, builds the production bundle, and serves it on port 80. To use it:

1. In the OCI console, launch a Compute instance (Always-Free shape works fine).
2. Under **Show advanced options → Management**, paste the file contents into the **Cloud-init script** field (or upload it).
3. Add an Ingress rule on the instance's VCN Security List allowing TCP 80 from `0.0.0.0/0`.
4. Make sure the instance has a public IP. After 3–5 minutes, browse to `http://<public-ip>/`.

## Browser Compatibility

The game works in modern browsers that support:
- HTML5 Canvas
- ES6+ JavaScript
- Web Audio API

Tested browsers:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## License

This project is open source and available for educational purposes.

## Contributing

Feel free to add more sentences to `data/sentences.json` or improve the game mechanics!
