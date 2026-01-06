import { DEPTH } from '../utils/Constants.js';

export class PatternUnlockScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PatternUnlockScene' });
    }

    init(data) {
        this.onResult = data.onResult;
        
        this.gridSize = 3;
        this.dots = [];
        this.targetPath = []; // IDs der Punkte in richtiger Reihenfolge
        this.userPath = [];
        
        this.isInputMode = false;
        this.graphics = null;
        
        // Layout
        this.spacing = 80;
        this.startX = -this.spacing;
        this.startY = -this.spacing + 20;
    }

    create() {
        // Hintergrund
        this.add.rectangle(400, 300, 800, 600, 0x000000, 0.9);
        this.container = this.add.container(400, 300);

        // Panel
        const bg = this.add.rectangle(0, 0, 400, 450, 0x222222).setStrokeStyle(3, 0x9b59b6);
        this.container.add(bg);

        // Titel
        const title = this.add.text(0, -180, 'PATTERN DECRYPT', {
            fontFamily: 'monospace', fontSize: '24px', color: '#9b59b6', fontStyle: 'bold'
        }).setOrigin(0.5);
        this.container.add(title);

        // Status
        this.statusText = this.add.text(0, 180, 'OBSERVE SIGNAL', {
            fontFamily: 'monospace', fontSize: '16px', color: '#ffffff'
        }).setOrigin(0.5);
        this.container.add(this.statusText);

        // Grafik-Objekt für Linien
        this.graphics = this.add.graphics();
        this.container.add(this.graphics);

        // Punkte erstellen (3x3 Grid)
        let idCounter = 0;
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const x = this.startX + (col * this.spacing);
                const y = this.startY + (row * this.spacing);
                
                const dot = this.add.circle(x, y, 10, 0x555555)
                    .setInteractive({ useHandCursor: true });
                
                dot.id = idCounter++;
                dot.gridX = col;
                dot.gridY = row;
                
                // Input Events für diesen Punkt
                dot.on('pointerover', () => this.handleDotHover(dot));
                dot.on('pointerdown', () => this.handleDotClick(dot));

                this.dots.push(dot);
                this.container.add(dot);
            }
        }
        
        // Input Listener für das Ende des Ziehens (überall)
        this.input.on('pointerup', () => this.stopDrawing());

        // Spiel starten: Erst Muster generieren, dann zeigen
        this.generatePattern(5); // 5 Punkte lang
        this.time.delayedCall(1000, () => this.showPattern());
    }

    generatePattern(length) {
        // Simple Random Walk ohne doppelte Punkte
        let current = Phaser.Math.Between(0, 8);
        this.targetPath = [current];
        
        while (this.targetPath.length < length) {
            // Nachbarn finden (Horizontal, Vertikal, Diagonal)
            // Um es einfach zu halten: Einfach zufälligen NICHT benutzten Punkt wählen
            // (Echte Pattern Locks erlauben nur Nachbarn, aber das ist komplexer zu coden)
            let candidates = [0,1,2,3,4,5,6,7,8].filter(id => !this.targetPath.includes(id));
            
            if (candidates.length === 0) break;
            
            let next = Phaser.Math.RND.pick(candidates);
            this.targetPath.push(next);
        }
    }

    showPattern() {
        this.isInputMode = false;
        
        // Visualisiere den Pfad
        this.graphics.clear();
        this.graphics.lineStyle(4, 0x9b59b6, 1);
        this.graphics.beginPath();
        
        const startDot = this.dots[this.targetPath[0]];
        this.graphics.moveTo(startDot.x, startDot.y);
        
        this.targetPath.forEach(id => {
            const d = this.dots[id];
            this.graphics.lineTo(d.x, d.y);
            // Punkte aufleuchten lassen
            this.tweens.add({
                targets: d, scale: 1.5, duration: 200, yoyo: true
            });
        });
        
        this.graphics.strokePath();

        // Nach kurzer Zeit ausblenden und Input erlauben
        this.time.delayedCall(2000, () => {
            this.graphics.clear();
            this.statusText.setText('DRAW PATTERN');
            this.statusText.setColor('#ffff00');
            this.isInputMode = true;
        });
    }

    handleDotClick(dot) {
        if (!this.isInputMode) return;
        
        this.userPath = [dot.id];
        this.isDrawing = true;
        this.redrawUserPath();
    }

    handleDotHover(dot) {
        if (!this.isInputMode || !this.isDrawing) return;
        
        // Punkt nur hinzufügen, wenn noch nicht im Pfad
        if (!this.userPath.includes(dot.id)) {
            this.userPath.push(dot.id);
            this.redrawUserPath();
        }
    }

    redrawUserPath() {
        this.graphics.clear();
        this.graphics.lineStyle(4, 0xffff00, 1);
        
        if (this.userPath.length === 0) return;

        const start = this.dots[this.userPath[0]];
        this.graphics.beginPath();
        this.graphics.moveTo(start.x, start.y);
        
        this.userPath.forEach(id => {
            const d = this.dots[id];
            this.graphics.lineTo(d.x, d.y);
        });
        
        // Aktuelle Mausposition als Linie (optional, hier weggelassen für cleaneren Look)
        this.graphics.strokePath();
    }

    stopDrawing() {
        if (!this.isInputMode || !this.isDrawing) return;
        this.isDrawing = false;
        
        this.checkResult();
    }

    checkResult() {
        this.isInputMode = false;
        
        // Vergleich Arrays
        const win = JSON.stringify(this.userPath) === JSON.stringify(this.targetPath);
        
        if (win) {
            this.statusText.setText('PATTERN VERIFIED');
            this.statusText.setColor('#00ff00');
            this.container.first.setStrokeStyle(4, 0x00ff00);
            this.time.delayedCall(1000, () => {
                if (this.onResult) this.onResult(true);
                this.scene.stop();
                this.scene.resume('GameScene');
            });
        } else {
            this.statusText.setText('INVALID PATTERN');
            this.statusText.setColor('#ff0000');
            this.container.first.setStrokeStyle(4, 0xff0000);
            this.graphics.lineStyle(4, 0xff0000, 1);
            this.graphics.strokePath(); // Rot nachzeichnen
            
            this.time.delayedCall(1000, () => {
                if (this.onResult) this.onResult(false);
                this.scene.stop();
                this.scene.resume('GameScene');
            });
        }
    }
}