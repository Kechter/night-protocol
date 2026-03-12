import { DEPTH } from "../utils/Constants.js";
import { Config } from "../utils/Config.js";
import { getDifficulty } from "../utils/DifficultyConfig.js";

export class TimingHackScene extends Phaser.Scene {
  constructor() {
    super({ key: "TimingHackScene" });
  }

  init(data) {
    this.onResult = data.onResult;

    const diff = getDifficulty();
    this.lives = diff.timingHackLives; // Easy=5, Normal=3, Hard=2, Hardcore=1

    this.hitsNeeded = 3;
    this.currentHits = 0;

    this.barWidth = 400;
    this.barHeight = 40;

    // Start-Konfiguration
    this.cursorSpeed = 300;
    this.cursorDir = 1;
    this.targetWidth = 100;

    this.isLocked = false;
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
      0.85,
    );

    this.container = this.add.container(centerX, centerY);

    // Panel Background
    const bg = this.add
      .rectangle(0, 0, 500, 300, 0x1a252f)
      .setStrokeStyle(4, 0x3498db);
    this.container.add(bg);

    // Titel
    const title = this.add
      .text(0, -120, "TIMING OVERRIDE", {
        fontFamily: "monospace",
        fontSize: "24px",
        color: "#3498db",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.container.add(title);

    // Status
    this.statusText = this.add
      .text(0, 100, `LOCKS REMAINING: ${this.hitsNeeded}`, {
        fontFamily: "monospace",
        fontSize: "18px",
        color: "#ffffff",
      })
      .setOrigin(0.5);
    this.container.add(this.statusText);

    // Lives display
    this.livesText = this.add
      .text(0, -95, this.getLivesString(), {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#ff4444",
      })
      .setOrigin(0.5);
    this.container.add(this.livesText);

    // Die "Bar" (Hintergrundbalken)
    this.track = this.add
      .rectangle(0, 0, this.barWidth, this.barHeight, 0x000000)
      .setStrokeStyle(2, 0x555555);
    this.container.add(this.track);

    // Die "Zone" (Der Zielbereich)
    this.targetZone = this.add.rectangle(
      0,
      0,
      this.targetWidth,
      this.barHeight - 4,
      0x2ecc71,
    );
    this.container.add(this.targetZone);

    // Der "Cursor" (Der bewegliche Strich)
    this.cursor = this.add.rectangle(
      -this.barWidth / 2,
      0,
      10,
      this.barHeight + 10,
      0xffffff,
    );
    this.container.add(this.cursor);

    // Cursor-Position initialisieren (relative X Koordinate im Container)
    this.cursorX = -this.barWidth / 2;

    // Input
    this.input.on("pointerdown", () => this.checkHit());
    this.input.keyboard.on("keydown-SPACE", () => this.checkHit());

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
    if (!this.cursor) return; // Guard against admin mode early exit

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
    const hitWidth = this.targetWidth / 2 + this.cursor.width / 2;

    if (dist < hitWidth) {
      // TREFFER
      this.currentHits++;
      this.targetZone.fillColor = 0xffffff;

      if (this.currentHits >= this.hitsNeeded) {
        this.winGame();
      } else {
        this.statusText.setText(
          `LOCKS REMAINING: ${this.hitsNeeded - this.currentHits}`,
        );
        this.cursorSpeed += 100;
        this.targetWidth *= 0.8;
        this.time.delayedCall(500, () => this.resetRound());
      }
    } else {
      // DANEBEN — Leben abziehen
      this.lives--;
      this.targetZone.fillColor = 0xff0000;
      if (this.livesText) this.livesText.setText(this.getLivesString());

      if (this.lives <= 0) {
        this.loseGame();
      } else {
        // Shake and continue
        this.tweens.add({
          targets: this.container,
          x: this.container.x + 8,
          duration: 40,
          yoyo: true,
          repeat: 3,
          onComplete: () => this.resetRound(),
        });
      }
    }
  }

  getLivesString() {
    return (
      "♥".repeat(Math.max(0, this.lives)) +
      "♡".repeat(Math.max(0, getDifficulty().timingHackLives - this.lives))
    );
  }

  winGame() {
    this.statusText.setText("ACCESS GRANTED");
    this.statusText.setColor("#00ff00");
    this.container.first.setStrokeStyle(4, 0x00ff00);

    this.time.delayedCall(1000, () => {
      if (this.onResult) this.onResult(true);
      this.scene.stop();
      this.scene.resume("GameScene");
    });
  }

  loseGame() {
    this.statusText.setText("LOCK JAMMED");
    this.statusText.setColor("#ff0000");
    this.container.first.setStrokeStyle(4, 0xff0000);

    this.tweens.add({
      targets: this.container,
      x: this.container.x + 10,
      duration: 50,
      yoyo: true,
      repeat: 5,
    });

    this.time.delayedCall(1000, () => {
      if (this.onResult) this.onResult(false);
      this.scene.stop();
      this.scene.resume("GameScene");
    });
  }
}
