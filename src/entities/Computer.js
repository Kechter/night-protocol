import { DEPTH } from '../utils/Constants.js';

export class Computer extends Phaser.GameObjects.Container {
    constructor(scene, x, y, properties, width, height) {
        super(scene, x, y);
        this.scene = scene;
        this.width = width || 32;
        this.height = height || 32;
        
        // Properties aus Tiled (z.B. minigame: 'signal')
        this.minigame = properties.minigame || null;
        this.id = properties.id || 'unknown_pc';
        this.isHacked = false;
        
        // Physics Body (nur für Positionsbestimmung / Debug, keine Kollision nötig)
        this.scene.physics.add.existing(this);
        this.body.setSize(this.width, this.height);
        this.body.setImmovable(true);
        
        // 1. Highlight-Prompt (Taste "E")
        // Standardmäßig unsichtbar, erscheint wenn Spieler nah dran ist
        this.promptContainer = this.scene.add.container(0, -this.height);
        
        const keyBg = this.scene.add.rectangle(0, 0, 20, 20, 0x000000)
            .setStrokeStyle(1, 0xffffff);
        const keyText = this.scene.add.text(0, 0, 'E', {
            fontFamily: 'monospace', fontSize: '14px', color: '#ffffff'
        }).setOrigin(0.5);
        
        this.promptContainer.add([keyBg, keyText]);
        this.promptContainer.setDepth(DEPTH.UI);
        this.promptContainer.setVisible(false);
        this.add(this.promptContainer);

        // 2. Status Text (z.B. "HACKED")
        this.statusText = this.scene.add.text(0, -this.height - 20, '', {
            fontFamily: 'monospace', fontSize: '10px', color: '#00ff00', 
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5).setDepth(DEPTH.UI);
        this.add(this.statusText);

        this.scene.add.existing(this);
        
        // Input Key für Interaktion
        this.keyE = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    }

    update() {
        if (this.isHacked) return;

        // Distanz-Check zum Spieler
        const player = this.scene.player;
        if (!player) return;

        // Zentrum des Computers vs Zentrum des Spielers
        const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
        const activationRange = 50; // Pixel Radius (ca. 3 Tiles)

        if (dist < activationRange) {
            // Spieler ist nah dran -> Prompt zeigen
            this.promptContainer.setVisible(true);
            
            // Leichter Schwebe-Effekt für den Prompt
            this.promptContainer.y = -this.height + Math.sin(this.scene.time.now / 150) * 2;

            // Interaktion prüfen
            if (Phaser.Input.Keyboard.JustDown(this.keyE)) {
                if (this.minigame) {
                    this.startHack();
                } else {
                    this.showFeedback("NO SYSTEM", 0xff0000);
                }
            }
        } else {
            this.promptContainer.setVisible(false);
        }
    }

    startHack() {
        // Spiel pausieren
        this.scene.scene.pause('GameScene');

        // Mapping Minigame Name -> Scene Name
        let sceneKey = '';
        switch(this.minigame) {
            case 'simon': sceneKey = 'SimonSaysScene'; break;
            case 'wires': sceneKey = 'WireTaskScene'; break;
            case 'timing': sceneKey = 'TimingHackScene'; break;
            case 'pattern': sceneKey = 'PatternUnlockScene'; break;
            case 'slide': sceneKey = 'SlidePuzzleScene'; break;
            case 'signal': sceneKey = 'SignalTuningScene'; break;
            default: 
                console.warn("Unbekanntes Minigame:", this.minigame);
                this.scene.scene.resume('GameScene');
                return;
        }

        this.scene.scene.launch(sceneKey, {
            onResult: (success) => {
                if (success) {
                    this.onHackSuccess();
                } else {
                    this.onHackFail();
                }
            }
        });
    }

    onHackSuccess() {
        this.isHacked = true;
        this.promptContainer.setVisible(false);
        this.showFeedback("ACCESS GRANTED", 0x00ff00);
        
        // Hier könnte man später Events feuern (z.B. Türen woanders öffnen)
        console.log(`Computer ${this.id} gehackt!`);
    }

    onHackFail() {
        this.showFeedback("ACCESS DENIED", 0xff0000);
    }

    showFeedback(text, color) {
        this.statusText.setText(text);
        this.statusText.setColor('#' + color.toString(16));
        
        // Text nach 2 Sekunden ausblenden, falls nicht gehackt
        if (!this.isHacked) {
            this.scene.time.delayedCall(2000, () => {
                this.statusText.setText("");
            });
        }
    }
}