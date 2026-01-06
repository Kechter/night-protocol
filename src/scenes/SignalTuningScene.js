import { DEPTH } from '../utils/Constants.js';

export class SignalTuningScene extends Phaser.Scene {
    constructor() {
        super({ key: 'SignalTuningScene' });
    }

    init(data) {
        this.onResult = data.onResult;
        
        this.targetFreq = Phaser.Math.Between(2, 8); 
        this.targetAmp = Phaser.Math.Between(30, 80); 
        
        this.currentFreq = 1;
        this.currentAmp = 10;
        
        this.tolerance = 0.5; 
        this.ampTolerance = 5; 
        
        this.matchTime = 0;
        this.requiredMatchTime = 1000; 
        
        // NEU: Status-Flag um Mehrfach-Auslösung zu verhindern
        this.isWon = false;
    }

    create() {
        this.add.rectangle(400, 300, 800, 600, 0x000000, 0.9);
        this.container = this.add.container(400, 300);

        const bg = this.add.rectangle(0, -50, 600, 300, 0x001100).setStrokeStyle(4, 0x00aa00);
        this.container.add(bg);
        
        const gridGraphics = this.add.graphics();
        gridGraphics.lineStyle(1, 0x003300);
        for(let i=-280; i<=280; i+=40) { 
            gridGraphics.moveTo(i, -190);
            gridGraphics.lineTo(i, 90);
        }
        for(let i=-190; i<=90; i+=40) { 
            gridGraphics.moveTo(-290, i);
            gridGraphics.lineTo(290, i);
        }
        gridGraphics.strokePath();
        this.container.add(gridGraphics);

        this.container.add(this.add.text(0, -230, 'SIGNAL CALIBRATION', {
            fontFamily: 'monospace', fontSize: '24px', color: '#00ff00'
        }).setOrigin(0.5));

        this.waveGraphics = this.add.graphics();
        this.container.add(this.waveGraphics);

        this.createControls();
        
        this.progressBar = this.add.rectangle(0, 230, 0, 20, 0x00ff00);
        this.progressBarBg = this.add.rectangle(0, 230, 400, 20).setStrokeStyle(2, 0xffffff);
        this.container.add(this.progressBarBg);
        this.container.add(this.progressBar);
        
        this.matchText = this.add.text(0, 260, 'MATCH SIGNAL...', { 
            fontFamily: 'monospace', fontSize: '16px' 
        }).setOrigin(0.5);
        this.container.add(this.matchText);
    }

    createControls() {
        const yPos = 160;
        
        this.createButton(-200, yPos, '< FREQ', () => this.currentFreq = Math.max(1, this.currentFreq - 0.1));
        this.createButton(-100, yPos, 'FREQ >', () => this.currentFreq = Math.min(10, this.currentFreq + 0.1));
        
        this.createButton(100, yPos, '< AMP', () => this.currentAmp = Math.max(10, this.currentAmp - 2));
        this.createButton(200, yPos, 'AMP >', () => this.currentAmp = Math.min(100, this.currentAmp + 2));
    }

    createButton(x, y, text, callback) {
        const btn = this.add.text(x, y, text, {
            fontFamily: 'monospace', fontSize: '18px', backgroundColor: '#333', padding: { x: 10, y: 5 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        
        btn.on('pointerdown', callback);
        btn.on('pointerdown', () => { btn.isDown = true; });
        btn.on('pointerup', () => { btn.isDown = false; });
        btn.on('pointerout', () => { btn.isDown = false; });
        
        btn.updateCallback = callback;
        this.container.add(btn);
        
        if (!this.buttons) this.buttons = [];
        this.buttons.push(btn);
    }

    update(time, delta) {
        // Stoppt Logik, wenn gewonnen
        if (this.isWon) return;

        if (this.buttons) {
            this.buttons.forEach(btn => {
                if (btn.isDown) btn.updateCallback();
            });
        }

        this.drawWaves(time);
        this.checkMatch(delta);
    }

    drawWaves(time) {
        this.waveGraphics.clear();
        const width = 580;
        const left = -290;
        const centerY = -50;
        
        // Ziel Welle
        this.waveGraphics.lineStyle(4, 0xff0000, 0.5);
        this.waveGraphics.beginPath();
        for (let x = 0; x <= width; x+=5) {
            const nx = x / width * Math.PI * 2; 
            const y = Math.sin(nx * this.targetFreq + (time / 500)) * this.targetAmp;
            if (x===0) this.waveGraphics.moveTo(left + x, centerY + y);
            else this.waveGraphics.lineTo(left + x, centerY + y);
        }
        this.waveGraphics.strokePath();

        // Spieler Welle
        this.waveGraphics.lineStyle(4, 0x00ff00, 1);
        this.waveGraphics.beginPath();
        for (let x = 0; x <= width; x+=5) {
            const nx = x / width * Math.PI * 2;
            const y = Math.sin(nx * this.currentFreq + (time / 500)) * this.currentAmp;
            if (x===0) this.waveGraphics.moveTo(left + x, centerY + y);
            else this.waveGraphics.lineTo(left + x, centerY + y);
        }
        this.waveGraphics.strokePath();
    }

    checkMatch(delta) {
        const freqDiff = Math.abs(this.currentFreq - this.targetFreq);
        const ampDiff = Math.abs(this.currentAmp - this.targetAmp);

        if (freqDiff < this.tolerance && ampDiff < this.ampTolerance) {
            this.matchTime += delta;
            this.matchText.setText("LOCKING SIGNAL...");
            this.matchText.setColor("#00ff00");
        } else {
            this.matchTime = Math.max(0, this.matchTime - delta * 2);
            this.matchText.setText("NO SIGNAL");
            this.matchText.setColor("#ff0000");
        }

        const progress = Math.min(1, this.matchTime / this.requiredMatchTime);
        this.progressBar.width = 400 * progress;

        if (progress >= 1) {
            this.winGame();
        }
    }

    winGame() {
        if (this.isWon) return;
        this.isWon = true; // Sperrt weitere Updates

        // FIX: Kein this.scene.pause() mehr!
        
        this.matchText.setText("SIGNAL LOCKED - ACCESS GRANTED");
        this.container.first.setStrokeStyle(4, 0x00ff00);
        
        // Jetzt läuft die Zeit weiter und dieser Call feuert:
        this.time.delayedCall(1000, () => {
            if (this.onResult) this.onResult(true);
            this.scene.stop();
            this.scene.resume('GameScene');
        });
    }
}