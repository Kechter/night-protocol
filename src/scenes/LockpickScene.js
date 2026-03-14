import { DEPTH } from "../utils/Constants.js";
import { Config } from "../utils/Config.js";
import { PCMonitorFrame } from "../ui/PCMonitorFrame.js";
import { getSoundManager } from "../utils/SoundManager.js";
import { getDifficulty } from "../utils/DifficultyConfig.js";

/**
 * LockpickScene - Schloss knacken / Schlüssel drehen Minigame
 * Der Spieler muss den Schlüssel in die richtige Position drehen während
 * ein Indikator die "Sweet Spot" Zone anzeigt
 */
export class LockpickScene extends Phaser.Scene {
  constructor() {
    super({ key: "LockpickScene" });
  }

  init(data) {
    this.onResult = data.onResult;

    // Spielzustand
    this.isComplete = false;
    this.pinsToUnlock = 3; // Anzahl der Pins die geknackt werden müssen
    this.currentPin = 0;
    this.lockHealth = 100; // Schaden am Dietrich

    // Rotation
    this.keyAngle = 0;
    this.targetAngle = 0;
    const diff = getDifficulty();
    this.tolerance = diff.lockpickTolerance; // Grad Toleranz für Sweet Spot (Easy=25°, HC=6°)
    this.isHolding = false;
    this.holdTime = 0;
    this.requiredHoldTime = 800;
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

    // Container für das Minigame
    this.container = this.add.container(centerX, centerY);
    this.container.setScale(1.25);
    this.soundManager = getSoundManager(this); // Initialize sound manager here

    // Schloss Hintergrund (Kreis)
    const lockBg = this.add
      .circle(0, 0, 120, 0x333333)
      .setStrokeStyle(4, 0x555555);
    this.container.add(lockBg);

    // Innerer Kreis (Schlüsselloch)
    const innerCircle = this.add
      .circle(0, 0, 40, 0x1a1a1a)
      .setStrokeStyle(2, 0x444444);
    this.container.add(innerCircle);

    // Sweet Spot Anzeige (der Bereich wo der Schlüssel sein muss)
    this.createSweetSpot();

    // Schlüssel / Dietrich
    this.createKey();

    // Pin Anzeige
    this.createPinDisplay();

    // Dietrich Gesundheit
    this.createHealthBar();

    // Anleitung
    const instructions = this.add
      .text(0, -185, "DREHE DEN SCHLÜSSEL IN DEN MARKIERTEN BEREICH", {
        fontFamily: "VT323",
        fontSize: "24px",
        color: "#888888",
        padding: { x: 5, y: 5 }
      })
      .setOrigin(0.5);
    this.container.add(instructions);

    const hint = this.add
      .text(0, 195, "[A/D  oder  ← →] Drehen   [SPACE] Halten", {
        fontFamily: "VT323",
        fontSize: "24px",
        color: "#ffff00",
        padding: { x: 5, y: 5 }
      })
      .setOrigin(0.5);
    this.container.add(hint);

    // Status Text
    this.statusText = this.add
      .text(0, 160, "PIN 1/3", {
        fontFamily: "VT323",
        fontSize: "28px",
        color: "#ffffff",
        padding: { x: 5, y: 5 }
      })
      .setOrigin(0.5);
    this.container.add(this.statusText);

    // Abort Button
    const abortBtn = this.add
      .text(0, 195, "[ ABBRECHEN ]", {
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
      this.endGame(false);
    });
    this.container.add(abortBtn);

    // Input Setup - Arrow keys + WASD
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.spaceKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE,
    );

    // Ersten Pin Target setzen
    this.generateNewTarget();
  }

  createSweetSpot() {
    this.sweetSpotGraphics = this.add.graphics();
    this.container.add(this.sweetSpotGraphics);
  }

  drawSweetSpot() {
    this.sweetSpotGraphics.clear();

    // Sweet Spot Arc zeichnen
    const startAngle = Phaser.Math.DegToRad(
      this.targetAngle - this.tolerance - 90,
    );
    const endAngle = Phaser.Math.DegToRad(
      this.targetAngle + this.tolerance - 90,
    );

    // Äußerer Bogen (grün wenn im Bereich)
    const inRange = this.isInSweetSpot();
    const color = inRange ? 0x00ff00 : 0xff6600;

    this.sweetSpotGraphics.lineStyle(8, color, 0.6);
    this.sweetSpotGraphics.beginPath();
    this.sweetSpotGraphics.arc(0, 0, 100, startAngle, endAngle, false);
    this.sweetSpotGraphics.strokePath();

    // Innere Markierung
    this.sweetSpotGraphics.lineStyle(3, color, 1);
    this.sweetSpotGraphics.beginPath();
    this.sweetSpotGraphics.arc(0, 0, 85, startAngle, endAngle, false);
    this.sweetSpotGraphics.strokePath();
  }

  createKey() {
    // Schlüssel Container (wird rotiert)
    this.keyContainer = this.add.container(0, 0);
    this.container.add(this.keyContainer);

    // Schlüssel Grafik
    const keyGraphics = this.add.graphics();

    // Griff
    keyGraphics.fillStyle(0xcccccc, 1);
    keyGraphics.fillRoundedRect(-8, -80, 16, 40, 4);

    // Schaft
    keyGraphics.fillStyle(0xaaaaaa, 1);
    keyGraphics.fillRect(-4, -45, 8, 45);

    // Bart (Zähne)
    keyGraphics.fillRect(-4, -10, 12, 6);
    keyGraphics.fillRect(-4, -20, 10, 4);

    this.keyContainer.add(keyGraphics);

    // Highlight wenn im Sweet Spot
    this.keyGlow = this.add.circle(0, -50, 12, 0x00ff00, 0);
    this.keyContainer.add(this.keyGlow);
  }

  createPinDisplay() {
    this.pinIcons = [];
    const startX = -40;

    for (let i = 0; i < this.pinsToUnlock; i++) {
      const x = startX + i * 40;

      // Pin Icon (Kreis)
      const pin = this.add
        .circle(x, -140, 12, 0x444444)
        .setStrokeStyle(2, 0x666666);

      this.pinIcons.push(pin);
      this.container.add(pin);
    }
  }

  updatePinDisplay() {
    this.pinIcons.forEach((pin, index) => {
      if (index < this.currentPin) {
        // Geknackt
        pin.setFillStyle(0x00ff00);
        pin.setStrokeStyle(2, 0x00aa00);
      }
    });
  }

  createHealthBar() {
    // Hintergrund
    this.healthBarBg = this.add
      .rectangle(-100, 130, 200, 12, 0x333333)
      .setStrokeStyle(1, 0x555555)
      .setOrigin(0, 0.5);
    this.container.add(this.healthBarBg);

    // Gesundheit
    this.healthBar = this.add
      .rectangle(-100, 130, 200, 12, 0x00aa00)
      .setOrigin(0, 0.5);
    this.container.add(this.healthBar);

    // Label
    const label = this.add.text(-100, 115, "DIETRICH", {
      fontFamily: "VT323",
      fontSize: "14px",
      color: "#666666",
      padding: { x: 2, y: 2 }
    });
    this.container.add(label);
  }

  updateHealthBar() {
    this.healthBar.width = (this.lockHealth / 100) * 200;

    if (this.lockHealth > 60) {
      this.healthBar.setFillStyle(0x00aa00);
    } else if (this.lockHealth > 30) {
      this.healthBar.setFillStyle(0xffaa00);
    } else {
      this.healthBar.setFillStyle(0xff0000);
    }
  }

  generateNewTarget() {
    // Zufälliger Winkel im vollen Kreis (0-360°)
    this.targetAngle = Phaser.Math.Between(0, 359);
    this.drawSweetSpot();
  }

  isInSweetSpot() {
    // Handle wrapping: shortest angular distance
    let diff = ((((this.keyAngle - this.targetAngle) % 360) + 540) % 360) - 180;
    return Math.abs(diff) <= this.tolerance;
  }

  update(time, delta) {
    if (this.isComplete) return;
    if (!this.cursors) return; // Guard against admin mode early exit

    // Schlüssel drehen – Arrow keys ODER WASD (A/D)
    const rotationSpeed = 120; // 120 degrees per second
    if (this.cursors.left.isDown || this.keyA.isDown) {
      this.keyAngle -= rotationSpeed * (delta / 1000);
    }
    if (this.cursors.right.isDown || this.keyD.isDown) {
      this.keyAngle += rotationSpeed * (delta / 1000);
    }

    // Winkel frei laufen lassen (volle 360° Drehung)
    // Kein Clamp - Wrap-Around erlaubt

    // Schlüssel rotieren
    this.keyContainer.setRotation(Phaser.Math.DegToRad(this.keyAngle));

    // Sweet Spot aktualisieren
    this.drawSweetSpot();

    // Space halten Logik
    if (this.spaceKey.isDown) {
      if (this.isInSweetSpot()) {
        // Im Sweet Spot - Pin knacken
        this.isHolding = true;
        this.holdTime += delta;

        // Glow Effekt
        this.keyGlow.setAlpha(0.5 + Math.sin(time / 100) * 0.3);

        // Vibrieren
        this.keyContainer.x = Math.random() * 2 - 1;

        if (this.holdTime >= this.requiredHoldTime) {
          this.unlockPin();
        }
      } else {
        // Nicht im Sweet Spot - Schaden am Dietrich
        this.lockHealth -= delta * 0.05;
        this.updateHealthBar();
        this.soundManager.playHit(); // Play hit sound when not in sweet spot and holding

        // Shake Effekt
        this.container.x =
          this.cameras.main.width / 2 + (Math.random() * 6 - 3);

        // Reset hold time
        this.holdTime = 0;

        if (this.lockHealth <= 0) {
          this.endGame(false);
        }
      }
    } else {
      this.isHolding = false;
      this.holdTime = 0;
      this.keyGlow.setAlpha(0);
      this.keyContainer.x = 0;
      this.container.x = this.cameras.main.width / 2;
    }
  }

  unlockPin() {
    this.currentPin++;
    this.holdTime = 0;

    // Visuelles Feedback
    this.updatePinDisplay();

    // Sound/Flash Effekt
    this.cameras.main.flash(100, 0, 255, 0);
    this.soundManager.playSuccess(); // Play success sound for unlocking a pin

    if (this.currentPin >= this.pinsToUnlock) {
      // Alle Pins geknackt!
      this.endGame(true);
    } else {
      // Nächster Pin
      this.statusText.setText(
        `PIN ${this.currentPin + 1}/${this.pinsToUnlock}`,
      );
      this.generateNewTarget();

      // Toleranz verringern für jeden Pin
      this.tolerance = Math.max(8, this.tolerance - 2);
    }
  }

  endGame(success) {
    this.isComplete = true;

    if (success) {
      this.statusText.setText("SCHLOSS GEKNACKT!");
      this.statusText.setColor("#00ff00");
      this.soundManager.playSuccess(); // Play success sound for game completion

      // Erfolgs-Animation
      this.tweens.add({
        targets: this.keyContainer,
        rotation: Phaser.Math.DegToRad(90),
        duration: 300,
        ease: "Power2",
      });
    } else {
      this.statusText.setText("DIETRICH GEBROCHEN!");
      this.statusText.setColor("#ff0000");
      this.soundManager.playError(); // Play error sound for game failure

      // Bruch-Animation
      this.tweens.add({
        targets: this.keyContainer,
        alpha: 0,
        y: 50,
        duration: 300,
      });
    }

    this.time.delayedCall(1200, () => {
      if (this.onResult) this.onResult(success);
      this.scene.stop();
      this.scene.resume("GameScene");
    });
  }
}
