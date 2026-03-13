import {
  DIFFICULTY_SETTINGS,
  setDifficulty,
} from "../utils/DifficultyConfig.js";
import { Config } from "../utils/Config.js";
import { getSoundManager } from "../utils/SoundManager.js";
import { lootLocker } from "../utils/LootLockerBackend.js";

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

    this.soundManager = getSoundManager(this);

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
      const y = 190 + i * 110; // Increased spacing between cards
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

    // Settings Panel (Bottom)
    this.settingsContainer = this.createSettingsPanel(W / 2, H - 100);

    // Preview panel (right side) — hidden until hover
    this.previewPanel = this.createPreviewPanel(W - 10, H / 2);
    this.previewPanel.setVisible(false);

    // Leaderboard Button
    this.createLeaderboardButton(W - 150, H - 40);
  }

  createLeaderboardButton(x, y) {
    const btn = this.add.text(x, y, "[ GLOBAL LEADERBOARD ]", {
      fontFamily: "monospace",
      fontSize: "18px",
      color: "#00ffff",
      backgroundColor: "#002222",
      padding: { x: 15, y: 8 }
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });

    btn.on("pointerover", () => btn.setColor("#ffffff"));
    btn.on("pointerout", () => btn.setColor("#00ffff"));
    btn.on("pointerdown", () => {
      if (this.soundManager) this.soundManager.playClick();
      this.scene.start("LeaderboardScene");
    });
  }

  createCard(x, y, key, cfg, index) {
    const W = this.cameras.main.width;
    const cardW = 440;
    const cardH = 95; // Increased card height

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
      .text(-cardW / 2 + 24, -20, `[ ${cfg.label} ]`, {
        // Adjusted Y offset
        fontFamily: "monospace",
        fontSize: "26px",
        color: cfg.colorHex,
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);
    container.add(label);

    // Subtitle
    const sub = this.add
      .text(-cardW / 2 + 24, 10, cfg.subtitle, {
        // Adjusted Y offset
        fontFamily: "monospace",
        fontSize: "17px",
        color: "#888888",
      })
      .setOrigin(0, 0.5);
    container.add(sub);

    // Stats preview (right side of card) - moved down and formatted
    const statsText = `Zeit: x${cfg.minigameTimeMultiplier.toFixed(1)} | Bots: ${cfg.botChaseSpeed}px/s | Sicht: ${cfg.visionRange}px`;
    const stats = this.add
      .text(-cardW / 2 + 24, 34, statsText, {
        // Adjusted Y offset to fit inside new cardH
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#555555",
      })
      .setOrigin(0, 0.5);
    container.add(stats);

    // Hit area
    const hit = this.add
      .rectangle(0, 0, cardW, cardH, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    container.add(hit);

    hit.on("pointerover", () => {
      if (this.soundManager) this.soundManager.playHover();
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
      if (this.soundManager) this.soundManager.playClick();
      this.selectDifficulty(key, cfg);
    });

    this.cards.push(container);
  }

  createSettingsPanel(x, y) {
    const container = this.add.container(x, y);

    this.add
      .text(0, -30, "-- GAME SETTINGS --", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#555555",
      })
      .setOrigin(0.5);

    // Toggle 1: Admin Mode
    const adminToggle = this.createToggle(
      -260,
      0,
      "Admin Mode",
      Config.adminMode,
      (val) => {
        Config.adminMode = val;
      },
    );
    container.add(adminToggle);

    // Toggle 2: Skip Minigames
    const skipToggle = this.createToggle(
      -80,
      0,
      "Skip Minigames",
      Config.skipMinigames,
      (val) => {
        Config.skipMinigames = val;
      },
    );
    container.add(skipToggle);

    // Toggle 3: Speedrun Mode
    this.speedrunToggle = this.createToggle(
      120,
      0,
      "Speedrun Mode (Locks Cheats)",
      Config.speedrunMode,
      (val) => {
        Config.speedrunMode = val;
        if (val) {
          Config.adminMode = false;
          Config.skipMinigames = false;
          this.refreshToggles();
        }
      }
    );
    container.add(this.speedrunToggle);

    // Fullscreen Hint - NOW ADDED TO CONTAINER
    const hint = this.add
      .text(0, 45, "[F11] Vollbild empfohlen für das beste Erlebnis", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#555555",
      })
      .setOrigin(0.5);
    container.add(hint);

    return container;
  }

  refreshToggles() {
    this.settingsContainer.list.forEach(item => {
      if (item.updateState) item.updateState();
    });
  }

  createToggle(x, y, labelText, initialValue, onChange) {
    const container = this.add.container(x, y);
    let isOn = initialValue;

    const box = this.add.rectangle(-40, 0, 20, 20, isOn ? 0x00ff00 : 0x222222)
      .setStrokeStyle(2, 0x555555)
      .setInteractive({ useHandCursor: true });

    const check = this.add.text(-40, 0, isOn ? "X" : "", {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#000000",
      fontStyle: "bold"
    }).setOrigin(0.5);

    const label = this.add.text(-20, 0, labelText, {
      fontFamily: "monospace",
      fontSize: "14px",
      color: isOn ? "#00ff00" : "#aaaaaa"
    }).setOrigin(0, 0.5);

    container.updateState = () => {
      if (labelText.includes("Admin")) isOn = Config.adminMode;
      if (labelText.includes("Skip")) isOn = Config.skipMinigames;
      if (labelText.includes("Speedrun")) isOn = Config.speedrunMode;
      
      box.setFillStyle(isOn ? 0x00ff00 : 0x222222);
      check.setText(isOn ? "X" : "");
      label.setColor(isOn ? "#00ff00" : "#aaaaaa");
    };

    box.on("pointerover", () => {
      const isLocked = (labelText.includes("Admin") || labelText.includes("Skip")) && Config.speedrunMode;
      if (!isLocked) box.setStrokeStyle(2, 0xffffff);
    });
    box.on("pointerout", () => box.setStrokeStyle(2, 0x555555));
    box.on("pointerdown", () => {
      const isLocked = (labelText.includes("Admin") || labelText.includes("Skip")) && Config.speedrunMode;
      if (isLocked) {
        this.cameras.main.shake(100, 0.005);
        return;
      }
      isOn = !isOn;
      box.setFillStyle(isOn ? 0x00ff00 : 0x222222);
      check.setText(isOn ? "X" : "");
      onChange(isOn);
      this.refreshToggles();
    });

    container.add([box, check, label]);
    return container;
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
