import { DEPTH } from "../utils/Constants.js";
import { Config } from "../utils/Config.js";
import { getDifficulty } from "../utils/DifficultyConfig.js";
import { getSoundManager } from "../utils/SoundManager.js";

export class PatternUnlockScene extends Phaser.Scene {
  constructor() {
    super({ key: "PatternUnlockScene" });
  }

  init(data) {
    this.onResult = data.onResult;
    this.diff = getDifficulty();

    this.gridSize = this.diff.patternGridSize || 3;
    this.dots = [];
    this.targetPath = []; 
    this.userPath = [];

    this.isInputMode = false;
    this.graphics = null;

    // Responsive Layout based on gridSize
    this.spacing = this.gridSize > 3 ? 60 : 80;
    const totalW = (this.gridSize - 1) * this.spacing;
    this.startX = -totalW / 2;
    this.startY = -totalW / 2 + 20;
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

    // Hintergrund
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

    // Panel
    const bg = this.add
      .rectangle(0, 0, 400, 450, 0x222222)
      .setStrokeStyle(3, 0x9b59b6);
    this.container.add(bg);
    this.soundManager = getSoundManager(this);

    // Titel
    const title = this.add
      .text(0, -185, "MUSTER ENTSCHLÜSSELN", {
        fontFamily: "VT323",
        fontSize: "32px",
        color: "#9b59b6",
        padding: { x: 10, y: 5 }
      })
      .setOrigin(0.5);
    this.container.add(title);

    // Status
    this.statusText = this.add
      .text(0, 175, "MUSTER BEOBACHTEN", {
        fontFamily: "VT323",
        fontSize: "24px",
        color: "#ffffff",
        padding: { x: 10, y: 5 }
      })
      .setOrigin(0.5);
    this.container.add(this.statusText);

    // Abort Button
    const abortBtn = this.add
      .text(0, 205, "[ ABBRECHEN ]", {
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
      if (this.onResult) this.onResult(false);
      this.scene.stop();
      this.scene.resume("GameScene");
    });
    this.container.add(abortBtn);

    // Grafik-Objekt für Linien
    this.graphics = this.add.graphics();
    this.container.add(this.graphics);

    // Punkte erstellen (3x3 Grid)
    let idCounter = 0;
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const x = this.startX + col * this.spacing;
        const y = this.startY + row * this.spacing;

        const dot = this.add
          .circle(x, y, 10, 0x555555)
          .setInteractive({ useHandCursor: true });

        dot.id = idCounter++;
        dot.gridX = col;
        dot.gridY = row;

        // Input Events für diesen Punkt
        dot.on("pointerover", () => this.handleDotHover(dot));
        dot.on("pointerdown", () => this.handleDotClick(dot));

        this.dots.push(dot);
        this.container.add(dot);
      }
    }

    // Input Listener für das Ende des Ziehens (überall)
    this.input.on("pointerup", () => this.stopDrawing());

    // Spiel starten: Erst Muster generieren, dann zeigen
    this.generatePattern(this.diff.patternLength || 5); 
    this.time.delayedCall(1000, () => this.showPattern());
  }

  generatePattern(length) {
    // Current point as [col, row]
    let col = Phaser.Math.Between(0, this.gridSize - 1);
    let row = Phaser.Math.Between(0, this.gridSize - 1);
    
    let currentId = row * this.gridSize + col;
    this.targetPath = [currentId];

    while (this.targetPath.length < length) {
      // Possible neighbors (Horizontal, Vertikal, Diagonal)
      let candidates = [];
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          
          let nr = row + dr;
          let nc = col + dc;
          
          if (nr >= 0 && nr < this.gridSize && nc >= 0 && nc < this.gridSize) {
            let id = nr * this.gridSize + nc;
            if (!this.targetPath.includes(id)) {
              candidates.push({ id, r: nr, c: nc });
            }
          }
        }
      }

      if (candidates.length === 0) break;

      let next = Phaser.Math.RND.pick(candidates);
      this.targetPath.push(next.id);
      row = next.r;
      col = next.c;
    }
  }

  showPattern() {
    this.isInputMode = false;
    this.graphics.clear();
    this.graphics.lineStyle(4, 0x9b59b6, 0.5);

    // Sequential Highlight
    let delay = 0;
    const sequenceDelay = this.targetPath.length > 8 ? 300 : 500;
    this.targetPath.forEach((id, index) => {
      this.time.delayedCall(delay, () => {
        const d = this.dots[id];
        
        // Pulse dot
        this.tweens.add({
          targets: d,
          scale: 1.8,
          duration: 200,
          yoyo: true,
          ease: "Quad.easeOut"
        });

        // Draw line from previous if exists
        if (index > 0) {
          const prev = this.dots[this.targetPath[index - 1]];
          this.graphics.lineBetween(prev.x, prev.y, d.x, d.y);
        }
      });
      delay += sequenceDelay; 
    });

    // After sequence finishes, allow input
    this.time.delayedCall(delay + 500, () => {
      this.graphics.clear();
      this.statusText.setText("MUSTER NACHZEICHNEN");
      this.statusText.setColor("#ffff00");
      this.isInputMode = true;
    });
  }

  handleDotClick(dot) {
    if (!this.isInputMode) return;

    this.userPath = [dot.id];
    this.isDrawing = true;
    this.soundManager.playHit();
    this.redrawUserPath();
  }

  handleDotHover(dot) {
    if (!this.isInputMode || !this.isDrawing) return;

    if (!this.userPath.includes(dot.id)) {
      // SMART INCLUDE: Pass overlapping dots automatically
      const lastId = this.userPath[this.userPath.length - 1];
      const lastDot = this.dots[lastId];
      
      // If we move across a center dot (e.g. 0 to 2), include 1
      this.checkIntermediateDots(lastDot, dot);

      this.userPath.push(dot.id);
      this.soundManager.playHit();
      this.redrawUserPath();
    }
  }

  checkIntermediateDots(from, to) {
    // Check if there is a dot exactly between 'from' and 'to'
    const midX = (from.gridX + to.gridX) / 2;
    const midY = (from.gridY + to.gridY) / 2;

    if (Number.isInteger(midX) && Number.isInteger(midY)) {
      const midId = midY * this.gridSize + midX;
      if (!this.userPath.includes(midId)) {
        this.userPath.push(midId);
      }
    }
  }

  redrawUserPath() {
    this.graphics.clear();
    this.graphics.lineStyle(4, 0xffff00, 1);

    if (this.userPath.length === 0) return;

    const start = this.dots[this.userPath[0]];
    this.graphics.beginPath();
    this.graphics.moveTo(start.x, start.y);

    this.userPath.forEach((id) => {
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
    const win =
      JSON.stringify(this.userPath) === JSON.stringify(this.targetPath);

    if (win) {
      this.statusText.setText("MUSTER VERIFIZIERT");
      this.statusText.setColor("#00ff00");
      this.container.first.setStrokeStyle(4, 0x00ff00);
      this.soundManager.playSuccess();
      this.time.delayedCall(1000, () => {
        if (this.onResult) this.onResult(true);
        this.scene.stop();
        this.scene.resume("GameScene");
      });
    } else {
      this.statusText.setText("FALSCHES MUSTER");
      this.statusText.setColor("#ff0000");
      this.container.first.setStrokeStyle(4, 0xff0000);
      this.soundManager.playError();
      this.graphics.lineStyle(4, 0xff0000, 1);
      this.graphics.strokePath(); // Rot nachzeichnen

      this.time.delayedCall(1000, () => {
        if (this.onResult) this.onResult(false);
        this.scene.stop();
        this.scene.resume("GameScene");
      });
    }
  }
}
