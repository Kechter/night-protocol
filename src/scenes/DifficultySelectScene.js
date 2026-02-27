import {
  DIFFICULTY_SETTINGS,
  setDifficulty,
} from "../utils/DifficultyConfig.js";

/**
 * DifficultySelectScene
 * Terminal-Stil Schwierigkeitsauswahl.
 * Setzt Config.difficulty und startet IntroScene.
 */
export class DifficultySelectScene extends Phaser.Scene {
  constructor() {
    super({ key: "DifficultySelectScene" });
  }

  create() {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;

    // Background
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000);

    // Scanlines overlay
    const scanlines = this.add.graphics();
    scanlines.fillStyle(0x000000, 0.12);
    for (let y = 0; y < H; y += 4) {
      scanlines.fillRect(0, y, W, 2);
    }

    // Header
    this.add
      .text(W / 2, 60, "> NIGHT PROTOCOL v1.0", {
        fontFamily: "monospace",
        fontSize: "20px",
        color: "#555555",
      })
      .setOrigin(0.5);

    this.add
      .text(W / 2, 108, "SELECT DIFFICULTY", {
        fontFamily: "monospace",
        fontSize: "52px",
        color: "#00ff00",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(W / 2, 138, "──────────────────────────────────", {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#003300",
      })
      .setOrigin(0.5);

    // Difficulty cards
    const difficulties = ["easy", "normal", "hard", "hardcore"];
    this.cards = [];

    difficulties.forEach((key, i) => {
      const cfg = DIFFICULTY_SETTINGS[key];
      const y = 200 + i * 90;
      this.createCard(W / 2, y, key, cfg, i);
    });

    // Footer
    this.add
      .text(W / 2, H - 40, "[KLICKEN] Auswählen", {
        fontFamily: "monospace",
        fontSize: "18px",
        color: "#444444",
      })
      .setOrigin(0.5);

    // Preview panel (right side) — hidden until hover
    this.previewPanel = this.createPreviewPanel(W - 10, H / 2);
    this.previewPanel.setVisible(false);
  }

  createCard(x, y, key, cfg, index) {
    const W = this.cameras.main.width;
    const cardW = 440;
    const cardH = 75;

    const container = this.add.container(x, y);

    // Card background
    const bg = this.add
      .rectangle(0, 0, cardW, cardH, 0x060606)
      .setStrokeStyle(2, cfg.color, 0.5);
    container.add(bg);

    // Left accent bar
    const accent = this.add
      .rectangle(-cardW / 2 + 4, 0, 8, cardH - 8, cfg.color, 0.9)
      .setOrigin(0.5);
    container.add(accent);

    // Label
    const label = this.add
      .text(-cardW / 2 + 24, -16, `[ ${cfg.label} ]`, {
        fontFamily: "monospace",
        fontSize: "26px",
        color: cfg.colorHex,
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);
    container.add(label);

    // Subtitle
    const sub = this.add
      .text(-cardW / 2 + 24, 14, cfg.subtitle, {
        fontFamily: "monospace",
        fontSize: "17px",
        color: "#888888",
      })
      .setOrigin(0, 0.5);
    container.add(sub);

    // Stats preview (right side of card)
    const statsText = `Zeit ×${cfg.minigameTimeMultiplier.toFixed(1)}   Bots ${cfg.botChaseSpeed}px/s   Sicht ${cfg.visionRange}px`;
    const stats = this.add
      .text(cardW / 2 - 20, 0, statsText, {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#555555",
      })
      .setOrigin(1, 0.5);
    container.add(stats);

    // Hit area
    const hit = this.add
      .rectangle(0, 0, cardW, cardH, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    container.add(hit);

    hit.on("pointerover", () => {
      bg.setStrokeStyle(2, cfg.color, 1);
      bg.setFillStyle(0x0a0a0a);
      label.setColor("#ffffff");
      stats.setColor(cfg.colorHex);
    });
    hit.on("pointerout", () => {
      bg.setStrokeStyle(2, cfg.color, 0.5);
      bg.setFillStyle(0x060606);
      label.setColor(cfg.colorHex);
      stats.setColor("#444444");
    });
    hit.on("pointerdown", () => {
      this.selectDifficulty(key, cfg);
    });

    this.cards.push(container);
  }

  createPreviewPanel(x, y) {
    // Unused for now — could show detailed breakdown
    return this.add.container(x, y);
  }

  selectDifficulty(key, cfg) {
    setDifficulty(key);

    // Flash effect
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;
    const flash = this.add
      .rectangle(W / 2, H / 2, W, H, cfg.color, 0)
      .setDepth(100);

    this.tweens.add({
      targets: flash,
      alpha: 0.3,
      duration: 150,
      yoyo: true,
      onComplete: () => {
        this.cameras.main.fadeOut(400, 0, 0, 0);
        this.cameras.main.once("camerafadeoutcomplete", () => {
          this.scene.start("IntroScene");
        });
      },
    });
  }
}
