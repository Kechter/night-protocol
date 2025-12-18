import { PreloadScene } from './scenes/PreloadScene.js';
import { GameScene } from './scenes/GameScene.js';
import { UIScene } from './scenes/UIScene.js';


const config = {
    type: Phaser.AUTO,
    title: 'Technische Hochschule – Night Protocol',
    parent: 'game-container',
    width: 800, 
    height: 600,
    backgroundColor: '#111', // Etwas dunkler passend zum Thema
    render: { pixelArt: true },
    canvasContext: { willReadFrequently: true }, // Performance Optimierung
    physics: { 
        default: 'arcade', 
        arcade: { 
            debug: false, // Auf false setzen für Release
            gravity: { y: 0 }
        } 
    },
    scene: [PreloadScene, GameScene, UIScene], 
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
};

const game = new Phaser.Game(config);