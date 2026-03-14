import { PreloadScene } from "./scenes/PreloadScene.js";
import { GameScene } from "./scenes/GameScene.js";
import { UIScene } from "./scenes/UIScene.js";
// Flow Scenes
import { DifficultySelectScene } from "./scenes/DifficultySelectScene.js";
import { ControlsScene } from "./scenes/ControlsScene.js";
import { IntroScene } from "./scenes/IntroScene.js";
import { WinScene } from "./scenes/WinScene.js";
import { GameOverScene } from "./scenes/GameOverScene.js";
import { LeaderboardScene } from "./scenes/LeaderboardScene.js";
import { PauseScene } from "./scenes/PauseScene.js";
// Alte Minigames
import { SimonSaysScene } from "./scenes/SimonSaysScene.js";
import { WireTaskScene } from "./scenes/WireTaskScene.js";
import { TimingHackScene } from "./scenes/TimingHackScene.js";
import { PatternUnlockScene } from "./scenes/PatternUnlockScene.js";
// NEUE Minigames
import { SlidePuzzleScene } from "./scenes/SlidePuzzleScene.js";
import { SignalTuningScene } from "./scenes/SignalTuningScene.js";
// HACKER-STYLE Minigames (PC-basiert)
import { CodeFillScene } from "./scenes/CodeFillScene.js";
import { PasswordCrackScene } from "./scenes/PasswordCrackScene.js";
import { MemoryCorruptScene } from "./scenes/MemoryCorruptScene.js";
// DOOR Minigames
import { LockpickScene } from "./scenes/LockpickScene.js";
// Note Viewer
import { NoteViewScene } from "./scenes/NoteViewScene.js";

import { Config } from "./utils/Config.js";

const config = {
  type: Phaser.AUTO,
  title: "Technische Hochschule – Night Protocol",
  parent: "game-container",
  width: Config.width,
  height: Config.height,
  backgroundColor: "#111",
  render: {
    pixelArt: true,
    antialias: false,
  },
  canvasContext: { willReadFrequently: true },
  physics: {
    default: "arcade",
    arcade: {
      debug: Config.physics.debug,
      gravity: { y: Config.physics.gravity },
    },
  },
  // Array erweitert:
  scene: [
    PreloadScene,
    // Flow
    ControlsScene,
    DifficultySelectScene,
    IntroScene,
    GameScene,
    UIScene,
    WinScene,
    GameOverScene,
    LeaderboardScene,
    PauseScene,
    // Minigames
    SimonSaysScene,
    WireTaskScene,
    TimingHackScene,
    PatternUnlockScene,
    SlidePuzzleScene,
    SignalTuningScene,
    CodeFillScene,
    PasswordCrackScene,
    MemoryCorruptScene,
    // Door Minigames
    LockpickScene,
    // Note Viewer
    NoteViewScene,
  ],
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
};

const game = new Phaser.Game(config);
