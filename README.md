# Chinese Character Learning Game

An educational browser-based game that helps young students learn Chinese characters through interactive gameplay. Inspired by Pacman, players must collect the correct Chinese characters to complete sentences while avoiding wrong characters.

## About the Game

This game combines entertainment with education to make learning Chinese characters fun and engaging. The game displays a sentence with missing characters (shown as empty squares □), and players control Pacman to collect only the correct Chinese character "ghosts" that complete the sentence. Collecting wrong characters results in game over, while collecting all correct characters leads to victory.


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

The game will be available at `http://localhost:5173` (or another port if 5173 is in use). Open this URL in your web browser to play.

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

- **Arrow Keys** or **WASD** - Move Pacman
- **Spacebar** - Restart game (after game over or victory)

## Gameplay

1. A sentence with missing characters is displayed at the bottom of the screen
2. Missing characters are shown as empty squares (□)
3. Chinese character "ghosts" move around the screen
4. Control Pacman to collect only the **correct** characters that complete the sentence
5. Avoid **wrong** characters - touching them ends the game immediately
6. Win by collecting all correct characters to complete the sentence
7. Press **Spacebar** to restart and play a new random level

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
│   └── sentences.json          # Sentence data with correct/wrong characters
├── src/
│   ├── entities/
│   │   ├── Pacman.ts           # Player character controller
│   │   └── CharacterGhost.ts  # Chinese character ghost entities
│   ├── managers/
│   │   ├── AudioManager.ts    # Music and sound effects
│   │   ├── DataLoader.ts      # Loads sentence data from JSON
│   │   ├── GameState.ts       # Game state management
│   │   └── SentenceManager.ts # Manages sentence display
│   ├── scenes/
│   │   └── GameScene.ts       # Main game scene
│   ├── utils/
│   │   └── types.ts           # TypeScript type definitions
│   └── main.ts                # Game entry point
├── index.html                 # HTML entry point
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
└── vite.config.ts             # Vite build configuration
```

## Development

### Building

```bash
npm run build
```

### Type Checking

TypeScript will check types during the build process. For development, your IDE should provide real-time type checking.

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
