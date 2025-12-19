import { DEPTH } from '../utils/Constants.js';

export class TimingHackScene extends Phaser.Scene {
    constructor() {
        super({ key: 'TimingHackScene' });
    }

    init(data) {
        this.onResult = data.onResult;
        
        this.hitsNeeded = 3;
        this.currentHits = 0;
        
        this.barWidth = 400;
        this.barHeight = 40;
        
        // Start-Konfiguration
        this.cursorSpeed = 300; // Pixel pro Sekunde
        this.cursorDir = 1; // 1 = rechts, -1 = links
        this.targetWidth = 100; // Breite des grünen Bereichs
        
        this.isLocked = false; // Input Sperre nach Treffer
    }

    create() {
        // Hintergrund
        this.add.rectangle(400, 300, 800, 600, 0x000000, 0.85);

        this.container = this.add.container(400, 300);

        // Panel Background
        const bg = this.add.rectangle(0, 0, 500, 300, 0x1a252f).setStrokeStyle(4, 0x3498db);
        this.container.add(bg);

        // Titel
        const title = this.add.text(0, -120, 'TIMING OVERRIDE', {
            fontFamily: 'monospace', fontSize: '24px', color: '#3498db', fontStyle: 'bold'
        }).setOrigin(0.5);
        this.container.add(title);

        // Status
        this.statusText = this.add.text(0, 100, `LOCKS REMAINING: ${this.hitsNeeded}`, {
            fontFamily: 'monospace', fontSize: '18px', color: '#ffffff'
        }).setOrigin(0.5);
        this.container.add(this.statusText);

        // Die "Bar" (Hintergrundbalken)
        this.track = this.add.rectangle(0, 0, this.barWidth, this.barHeight, 0x000000).setStrokeStyle(2, 0x555555);
        this.container.add(this.track);

        // Die "Zone" (Der Zielbereich)
        this.targetZone = this.add.rectangle(0, 0, this.targetWidth, this.barHeight - 4, 0x2ecc71);
        this.container.add(this.targetZone);

        // Der "Cursor" (Der bewegliche Strich)
        this.cursor = this.add.rectangle(-this.barWidth/2, 0, 10, this.barHeight + 10, 0xffffff);
        this.container.add(this.cursor);
        
        // Cursor-Position initialisieren (relative X Koordinate im Container)
        this.cursorX = -this.barWidth / 2;

        // Input
        this.input.on('pointerdown', () => this.checkHit());
        this.input.keyboard.on('keydown-SPACE', () => this.checkHit());
        
        this.resetRound();
    }

    resetRound() {
        // Zufällige Position für die Zone
        const maxOffset = (this.barWidth - this.targetWidth) / 2;
        const randomX = Phaser.Math.Between(-maxOffset, maxOffset);
        this.targetZone.x = randomX;
        this.targetZone.width = this.targetWidth;
        
        this.isLocked = false;
        
        // Farbe zurücksetzen
        this.targetZone.fillColor = 0x2ecc71; 
    }

    update(time, delta) {
        if (this.isLocked) return;

        // Bewegung berechnen
        const moveStep = this.cursorSpeed * (delta / 1000) * this.cursorDir;
        this.cursorX += moveStep;

        // Kollision mit Rändern (Bounce)
        const limit = this.barWidth / 2;
        if (this.cursorX > limit) {
            this.cursorX = limit;
            this.cursorDir = -1;
        } else if (this.cursorX < -limit) {
            this.cursorX = -limit;
            this.cursorDir = 1;
        }

        this.cursor.x = this.cursorX;
    }

    checkHit() {
        if (this.isLocked) return;
        this.isLocked = true;

        // Kollisionsprüfung (Einfache X-Abstand Prüfung)
        const dist = Math.abs(this.cursor.x - this.targetZone.x);
        const hitWidth = (this.targetWidth / 2) + (this.cursor.width / 2);

        if (dist < hitWidth) {
            // TREFFER
            this.currentHits++;
            this.targetZone.fillColor = 0xffffff; // Flash Effekt
            
            if (this.currentHits >= this.hitsNeeded) {
                this.winGame();
            } else {
                // Nächste Runde schwerer machen
                this.statusText.setText(`LOCKS REMAINING: ${this.hitsNeeded - this.currentHits}`);
                this.cursorSpeed += 100; // Schneller
                this.targetWidth *= 0.8; // Kleiner
                
                this.time.delayedCall(500, () => this.resetRound());
            }
        } else {
            // DANEBEN -> Sofort verloren (oder man verliert Fortschritt)
            this.loseGame();
        }
    }

    winGame() {
        this.statusText.setText('ACCESS GRANTED');
        this.statusText.setColor('#00ff00');
        this.container.first.setStrokeStyle(4, 0x00ff00);
        
        this.time.delayedCall(1000, () => {
            if (this.onResult) this.onResult(true);
            this.scene.stop();
            this.scene.resume('GameScene');
        });
    }

    loseGame() {
        this.statusText.setText('LOCK JAMMED');
        this.statusText.setColor('#ff0000');
        this.container.first.setStrokeStyle(4, 0xff0000);
        
        // Wackeln
        this.tweens.add({
            targets: this.container,
            x: this.container.x + 10,
            duration: 50,
            yoyo: true,
            repeat: 5
        });

        this.time.delayedCall(1000, () => {
            if (this.onResult) this.onResult(false);
            this.scene.stop();
            this.scene.resume('GameScene');
        });
    }
}