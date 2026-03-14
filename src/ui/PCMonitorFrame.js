import { DEPTH } from "../utils/Constants.js";

/**
 * PCMonitorFrame - Wiederverwendbarer CRT-Style Monitor-Rahmen für alle PC-Minigames
 * Erzeugt einen retro Hacker-Look mit Scanlines und Glow-Effekt
 */
export class PCMonitorFrame {
  constructor(scene, title = "SYSTEM ACCESS", options = {}) {
    this.scene = scene;
    this.title = title;
    this.container = null;

    // Monitor Dimensionen (configurable per-scene)
    this.monitorWidth = options.width || 620;
    this.monitorHeight = options.height || 480;
    this.screenPadding = 20;
    this.bezelWidth = 15;
  }

  create() {
    const centerX = this.scene.cameras.main.width / 2;
    const centerY = this.scene.cameras.main.height / 2;

    // Haupt-Container
    this.container = this.scene.add.container(centerX, centerY);
    this.container.setDepth(DEPTH.UI);

    // 1. Vollbild-Abdunkelung (immer full size)
    const backdrop = this.scene.add.rectangle(
      0,
      0,
      this.scene.cameras.main.width * 2,
      this.scene.cameras.main.height * 2,
      0x000000,
      0.85,
    );
    this.container.add(backdrop);
    // Keep backdrop unscaled by making sure it covers even more area
    backdrop.setScale(1.5);

    // 2. Monitor Körper (äußerer Rahmen - dunkelgrau)
    const monitorBody = this.scene.add
      .rectangle(
        0,
        0,
        this.monitorWidth + 40,
        this.monitorHeight + 60,
        0x1a1a1a,
      )
      .setStrokeStyle(3, 0x333333);
    this.container.add(monitorBody);

    // 3. Monitor Bezel (innerer Rahmen - schwarz)
    const bezel = this.scene.add
      .rectangle(
        0,
        -10,
        this.monitorWidth + 10,
        this.monitorHeight + 10,
        0x0a0a0a,
      )
      .setStrokeStyle(2, 0x222222);
    this.container.add(bezel);

    // 4. Bildschirm Hintergrund (dunkelgrün für CRT-Look)
    this.screenBg = this.scene.add
      .rectangle(
        0,
        -10,
        this.monitorWidth - this.bezelWidth,
        this.monitorHeight - this.bezelWidth,
        0x001100,
      )
      .setStrokeStyle(2, 0x00ff00);
    this.container.add(this.screenBg);

    // 5. Scanlines Overlay (subtiler Effekt)
    this.createScanlines();

    // 6. Title Bar
    const titleBarBg = this.scene.add
      .rectangle(
        0,
        -this.monitorHeight / 2 + 25,
        this.monitorWidth - this.bezelWidth - 10,
        30,
        0x002200,
      )
      .setStrokeStyle(1, 0x00aa00);
    this.container.add(titleBarBg);

    const titleText = this.scene.add
      .text(0, -this.monitorHeight / 2 + 25, `> ${this.title}`, {
        fontFamily: "VT323",
        fontSize: "24px",
        color: "#00ff00",
        padding: { x: 5, y: 5 },
      })
      .setOrigin(0.5);
    this.container.add(titleText);

    // 7. Blinkender Cursor in Title Bar
    const cursor = this.scene.add
      .text(
        titleText.x + titleText.width / 2 + 10,
        -this.monitorHeight / 2 + 25,
        "_",
        {
          fontFamily: "monospace",
          fontSize: "16px",
          color: "#00ff00",
        },
      )
      .setOrigin(0.5);
    this.container.add(cursor);

    this.scene.tweens.add({
      targets: cursor,
      alpha: 0,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    // 8. Monitor Standfuß
    const standTop = this.scene.add
      .rectangle(0, this.monitorHeight / 2 + 15, 80, 20, 0x1a1a1a)
      .setStrokeStyle(1, 0x333333);
    this.container.add(standTop);

    const standBase = this.scene.add
      .rectangle(0, this.monitorHeight / 2 + 30, 120, 10, 0x1a1a1a)
      .setStrokeStyle(1, 0x333333);
    this.container.add(standBase);

    // 9. Power LED
    const powerLed = this.scene.add.circle(
      this.monitorWidth / 2 - 20,
      this.monitorHeight / 2 + 5,
      4,
      0x00ff00,
    );
    this.container.add(powerLed);

    // LED Glow Animation
    this.scene.tweens.add({
      targets: powerLed,
      alpha: 0.5,
      duration: 1000,
      yoyo: true,
      repeat: -1,
    });

    // 10. Screen Glow Effekt (subtil)
    this.addGlowEffect();

    // SCALING UP EVERYTHING
    this.container.setScale(1.3);

    return this.container;
  }

  createScanlines() {
    const graphics = this.scene.add.graphics();
    graphics.lineStyle(1, 0x000000, 0.1);

    const screenTop = -10 - (this.monitorHeight - this.bezelWidth) / 2;
    const screenBottom = -10 + (this.monitorHeight - this.bezelWidth) / 2;
    const screenLeft = -(this.monitorWidth - this.bezelWidth) / 2;
    const screenRight = (this.monitorWidth - this.bezelWidth) / 2;

    // Horizontale Scanlines alle 2 Pixel
    for (let y = screenTop; y < screenBottom; y += 3) {
      graphics.moveTo(screenLeft, y);
      graphics.lineTo(screenRight, y);
    }
    graphics.strokePath();

    this.container.add(graphics);
  }

  addGlowEffect() {
    // Äußerer Glow um den Bildschirm (sehr subtil)
    const glowGraphics = this.scene.add.graphics();

    // Mehrere Rechtecke mit abnehmender Opacity für Glow
    const glowColors = [
      { offset: 8, alpha: 0.03 },
      { offset: 6, alpha: 0.05 },
      { offset: 4, alpha: 0.08 },
      { offset: 2, alpha: 0.1 },
    ];

    glowColors.forEach((glow) => {
      glowGraphics.lineStyle(2, 0x00ff00, glow.alpha);
      glowGraphics.strokeRect(
        -(this.monitorWidth - this.bezelWidth) / 2 - glow.offset,
        -10 - (this.monitorHeight - this.bezelWidth) / 2 - glow.offset,
        this.monitorWidth - this.bezelWidth + glow.offset * 2,
        this.monitorHeight - this.bezelWidth + glow.offset * 2,
      );
    });

    this.container.add(glowGraphics);
  }

  /**
   * Gibt den Content-Bereich zurück wo Minigames ihre UI platzieren können
   * @returns {Object} { x, y, width, height } - Lokale Koordinaten relativ zum Container
   */
  getContentArea() {
    return {
      x: 0,
      y: 10, // Leicht nach unten wegen Title Bar
      width: this.monitorWidth - this.bezelWidth - 40,
      height: this.monitorHeight - this.bezelWidth - 80,
    };
  }

  /**
   * Fügt ein Element zum Monitor-Container hinzu
   */
  add(gameObject) {
    this.container.add(gameObject);
  }

  /**
   * Setzt die Rahmenfarbe (z.B. rot bei Fehler, grün bei Erfolg)
   */
  setFrameColor(color) {
    this.screenBg.setStrokeStyle(2, color);
  }

  /**
   * Zeigt eine Erfolgsmeldung mit grünem Rahmen
   */
  showSuccess(message = "ACCESS GRANTED") {
    this.setFrameColor(0x00ff00);

    const successText = this.scene.add
      .text(0, 0, message, {
        fontFamily: "VT323",
        fontSize: "48px",
        color: "#00ff00",
        stroke: "#003300",
        strokeThickness: 6,
        padding: { x: 10, y: 10 },
      })
      .setOrigin(0.5);

    this.container.add(successText);

    this.scene.tweens.add({
      targets: successText,
      scale: 1.2,
      duration: 200,
      yoyo: true,
    });
  }

  /**
   * Zeigt eine Fehlermeldung mit rotem Rahmen
   */
  showError(message = "ACCESS DENIED") {
    this.setFrameColor(0xff0000);

    const errorText = this.scene.add
      .text(0, 0, message, {
        fontFamily: "VT323",
        fontSize: "48px",
        color: "#ff0000",
        stroke: "#330000",
        strokeThickness: 6,
        padding: { x: 10, y: 10 },
      })
      .setOrigin(0.5);

    this.container.add(errorText);

    // Shake Effekt
    this.scene.tweens.add({
      targets: this.container,
      x: this.container.x + 10,
      duration: 50,
      yoyo: true,
      repeat: 5,
    });
  }

  destroy() {
    if (this.container) {
      this.container.destroy();
    }
  }
}
