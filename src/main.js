import { PreloadScene } from './scenes/PreloadScene.js';
import { GameScene } from './scenes/GameScene.js';
import { UIScene } from './scenes/UIScene.js';
// Alte Minigames
import { SimonSaysScene } from './scenes/SimonSaysScene.js';
import { WireTaskScene } from './scenes/WireTaskScene.js';
import { TimingHackScene } from './scenes/TimingHackScene.js'; 
import { PatternUnlockScene } from './scenes/PatternUnlockScene.js';
// NEUE Minigames
import { SlidePuzzleScene } from './scenes/SlidePuzzleScene.js';
import { SignalTuningScene } from './scenes/SignalTuningScene.js';


const config = {
    type: Phaser.AUTO,
    title: 'Technische Hochschule – Night Protocol',
    parent: 'game-container',
    width: 800, 
    height: 600,
    backgroundColor: '#111', 
    render: { pixelArt: true },
    canvasContext: { willReadFrequently: true },
    physics: { 
        default: 'arcade', 
        arcade: { 
            debug: false, 
            gravity: { y: 0 }
        } 
    },
    // Array erweitert:
    scene: [
        PreloadScene, 
        GameScene, 
        UIScene, 
        SimonSaysScene, 
        WireTaskScene, 
        TimingHackScene, 
        PatternUnlockScene,
        SlidePuzzleScene,  // NEU
        SignalTuningScene  // NEU
    ], 
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
};

const game = new Phaser.Game(config);