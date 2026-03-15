import { DEPTH } from "../utils/Constants.js";
import { Config } from "../utils/Config.js";
import { getDifficulty } from "../utils/DifficultyConfig.js";
import { getSoundManager } from "../utils/SoundManager.js";

export class SignalTuningScene extends Phaser.Scene {
  constructor() {
    super({ key: "SignalTuningScene" });
  }

  init(data) {
    this.onResult = data.onResult;

    this.targetFreq = Phaser.Math.Between(2, 8);
    this.targetAmp = Phaser.Math.Between(30, 80);

    this.currentFreq = 1;
    this.currentAmp = 10;

    const diff = getDifficulty();
    this.tolerance = diff.signalTolerance; // Easy=1.0, HC=0.2
    this.ampTolerance = diff.signalAmpTolerance; // Easy=15, HC=2

    this.matchTime = 0;
    this.requiredMatchTime = 1000;

    this.isWon = false;
  }

  create() {
    // Admin mode: Auto-complete
    if (Config.skipMinigames) {
      this.time.delayedCall(100, () => {
        if (this.onResult) this.onResult(true);
        this.scene.stop();
        this.scene.resume("GameScene");
      });
      return;
    }

    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    this.add.rectangle(
      centerX,
      centerY,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0.9,
    );
    this.container = this.add.container(centerX, centerY);
    this.container.setScale(1.25);

    const bg = this.add
      .rectangle(0, -50, 600, 300, 0x001100)
      .setStrokeStyle(4, 0x00aa00);
    this.container.add(bg);
    this.soundManager = getSoundManager(this);

    const gridGraphics = this.add.graphics();
    gridGraphics.lineStyle(1, 0x003300);
    for (let i = -280; i <= 280; i += 40) {
      gridGraphics.moveTo(i, -190);
      gridGraphics.lineTo(i, 90);
    }
    for (let i = -190; i <= 90; i += 40) {
      gridGraphics.moveTo(-290, i);
      gridGraphics.lineTo(290, i);
    }
    gridGraphics.strokePath();
    this.container.add(gridGraphics);

    this.container.add(
      this.add
        .text(0, -240, "SIGNAL-KALIBRIERUNG", {
          fontFamily: "VT323",
          fontSize: "32px",
          color: "#00ff00",
          padding: { x: 10, y: 5 }
        })
        .setOrigin(0.5),
    );

    this.waveGraphics = this.add.graphics();
    this.container.add(this.waveGraphics);

    this.createControls();

    this.progressBar = this.add
      .rectangle(-200, 230, 0, 20, 0x00ff00)
      .setOrigin(0, 0.5);
    this.progressBarBg = this.add
      .rectangle(0, 230, 400, 20)
      .setStrokeStyle(2, 0xffffff);
    this.container.add(this.progressBarBg);
    this.container.add(this.progressBar);

    this.matchText = this.add
      .text(0, 260, "SIGNAL-ABGLEICH...", {
        fontFamily: "VT323",
        fontSize: "24px",
        padding: { x: 10, y: 5 }
      })
      .setOrigin(0.5);
    this.container.add(this.matchText);

    // Abort Button
    const abortBtn = this.add
      .text(0, 305, "[ ABBRECHEN ]", {
        fontFamily: "VT323",
        fontSize: "20px",
        color: "#ff0000",
        padding: { x: 12, y: 6 }
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    
    abortBtn.on("pointerover", () => {
      abortBtn.setColor("#ffffff");
      this.soundManager.playHover();
    });
    abortBtn.on("pointerout", () => abortBtn.setColor("#ff0000"));
    abortBtn.on("pointerdown", () => {
      this.soundManager.playClick();
      this.isWon = true;
      if (this.onResult) this.onResult(false);
      this.scene.stop();
      this.scene.resume("GameScene");
    });
    this.container.add(abortBtn);
  }

  createControls() {
    const yPos = 160;

    this.createButton(
      -200,
      yPos,
      "< FREQ",
      (delta) => (this.currentFreq = Math.max(1, this.currentFreq - 6 * (delta / 1000))),
    );
    this.createButton(
      -100,
      yPos,
      "FREQ >",
      (delta) => (this.currentFreq = Math.min(10, this.currentFreq + 6 * (delta / 1000))),
    );

    this.createButton(
      100,
      yPos,
      "< AMP",
      (delta) => (this.currentAmp = Math.max(10, this.currentAmp - 120 * (delta / 1000))),
    );
    this.createButton(
      200,
      yPos,
      "AMP >",
      (delta) => (this.currentAmp = Math.min(100, this.currentAmp + 120 * (delta / 1000))),
    );
  }

  createButton(x, y, text, callback) {
    const btn = this.add
      .text(x, y, text, {
        fontFamily: "VT323",
        fontSize: "22px",
        backgroundColor: "#333",
        padding: { x: 12, y: 8 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    btn.on("pointerover", () => {
      this.soundManager.playHover();
    });
    btn.on("pointerdown", () => {
      btn.isDown = true;
      // Removed click sound per user request (too much in tuning game)
    });
    btn.on("pointerup", () => {
      btn.isDown = false;
    });
    btn.on("pointerout", () => {
      btn.isDown = false;
    });

    btn.updateCallback = callback;
    this.container.add(btn);

    if (!this.buttons) this.buttons = [];
    this.buttons.push(btn);
  }

  update(time, delta) {
    // Schützt vor Fehlern, falls Phaser "update()" aufruft, bevor "create()" komplett fertig ist (z.B. Lade-Verzögerungen)
    if (!this.matchText || !this.progressBar || !this.waveGraphics) return;

    // Stoppt Logik, wenn gewonnen
    if (this.isWon) return;

    if (this.buttons) {
      this.buttons.forEach((btn) => {
        if (btn.isDown) {
            btn.updateCallback(delta);
            // Removed terminal key ticking per user request
        }
      });
    }

    this.drawWaves(time);
    this.checkMatch(delta);
  }

  drawWaves(time) {
    if (!this.waveGraphics) return;
    this.waveGraphics.clear();
    const width = 580;
    const left = -290;
    const centerY = -50;

    // Ziel Welle
    this.waveGraphics.lineStyle(4, 0xff0000, 0.5);
    this.waveGraphics.beginPath();
    for (let x = 0; x <= width; x += 5) {
      const nx = (x / width) * Math.PI * 2;
      const y = Math.sin(nx * this.targetFreq + time / 500) * this.targetAmp;
      if (x === 0) this.waveGraphics.moveTo(left + x, centerY + y);
      else this.waveGraphics.lineTo(left + x, centerY + y);
    }
    this.waveGraphics.strokePath();

    // Spieler Welle
    this.waveGraphics.lineStyle(4, 0x00ff00, 1);
    this.waveGraphics.beginPath();
    for (let x = 0; x <= width; x += 5) {
      const nx = (x / width) * Math.PI * 2;
      const y = Math.sin(nx * this.currentFreq + time / 500) * this.currentAmp;
      if (x === 0) this.waveGraphics.moveTo(left + x, centerY + y);
      else this.waveGraphics.lineTo(left + x, centerY + y);
    }
    this.waveGraphics.strokePath();
  }

  checkMatch(delta) {
    const freqDiff = Math.abs(this.currentFreq - this.targetFreq);
    const ampDiff = Math.abs(this.currentAmp - this.targetAmp);

    if (freqDiff < this.tolerance && ampDiff < this.ampTolerance) {
      this.matchTime += delta;
      const diff = freqDiff + ampDiff; // Assuming 'diff' is a sum of differences for a combined metric
      if (diff < 15) { // This condition seems to be an additional check for "SIGNAL KORREKT"
        this.matchText.setText("SIGNAL KORREKT");
        this.matchText.setColor("#00ff00");
      } else {
        this.matchText.setText("SIGNAL ABGLEICH..."); // Original "LOCKING SIGNAL..." translated
        this.matchText.setColor("#00ff00");
      }
    } else {
      this.matchTime = Math.max(0, this.matchTime - delta * 0.5);
      this.matchText.setText("KEIN SIGNAL"); // Original "NO SIGNAL" translated
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

    this.matchText.setText("SIGNAL KORREKT - ZUGRIFF ERLAUBT");
    this.container.first.setStrokeStyle(4, 0x00ff00);
    if (this.soundManager) {
        this.soundManager.playSignalLock();
        this.soundManager.playSuccess();
    }

    // Jetzt läuft die Zeit weiter und dieser Call feuert:
    this.time.delayedCall(1000, () => {
      if (this.onResult) this.onResult(true);
      this.scene.stop();
      this.scene.resume("GameScene");
    });
  }
}
