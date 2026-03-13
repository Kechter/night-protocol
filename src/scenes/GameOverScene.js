import { getDifficulty } from "../utils/DifficultyConfig.js";

/**
 * GameOverScene - Zeigt "Überwacht" Overlay mit Neustart & Checkpoint (falls verfügbar).
 */
export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameOverScene" });
  }

  init() {
    this.isTransitioning = false;
  }

  create() {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;
    const diff = getDifficulty();

    this.add.rectangle(W / 2, H / 2, W, H, 0x000000);

    // Scanlines
    const sg = this.add.graphics();
    sg.fillStyle(0x000000, 0.15);
    for (let y = 0; y < H; y += 4) sg.fillRect(0, y, W, 2);

    // Header line
    this.add
      .text(W / 2, 160, "> SYSTEM ALERT", {
        fontFamily: "monospace",
        fontSize: "18px",
        color: "#333333",
      })
      .setOrigin(0.5);

    this.add
      .text(W / 2, 220, "IDENTITÄT KOMPROMITTIERT", {
        fontFamily: "monospace",
        fontSize: "42px",
        color: "#ff0000",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(W / 2, 275, "ÜBERWACHT — MISSION GESCHEITERT", {
        fontFamily: "monospace",
        fontSize: "18px",
        color: "#882222",
      })
      .setOrigin(0.5);

    // Divider
    this.add
      .text(W / 2, 330, "────────────────────────────────", {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#330000",
      })
      .setOrigin(0.5);

    this.add
      .text(W / 2, 370, `Schwierigkeit: ${diff.label}`, {
        fontFamily: "monospace",
        fontSize: "16px",
        color: diff.colorHex,
      })
      .setOrigin(0.5);

    // Buttons
    const btnY = H - 140;

    // Nochmal Spielen
    const retryBtn = this.add
      .text(W / 2, btnY, "[ NOCHMAL VERSUCHEN ]", {
        fontFamily: "monospace",
        fontSize: "22px",
        color: "#ff0000",
        backgroundColor: "#220000",
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    retryBtn.on("pointerover", () => retryBtn.setColor("#ffffff"));
    retryBtn.on("pointerout", () => retryBtn.setColor("#ff0000"));
    retryBtn.on("pointerdown", () => {
      if (this.isTransitioning) return;
      this.isTransitioning = true;
      retryBtn.disableInteractive();
      menuBtn.disableInteractive();

      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.cameras.main.once("camerafadeoutcomplete", () => {
        this.scene.stop("GameOverScene");
        this.scene.stop("UIScene");
        this.scene.stop("GameScene");
        this.scene.start("GameScene");
        this.scene.launch("UIScene");
      });
    });

    // Schwierigkeit wechseln
    const menuBtn = this.add
      .text(W / 2, btnY + 65, "[ SCHWIERIGKEIT WECHSELN ]", {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#555555",
        backgroundColor: "#0a0a0a",
        padding: { x: 20, y: 8 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    menuBtn.on("pointerover", () => menuBtn.setColor("#aaaaaa"));
    menuBtn.on("pointerout", () => menuBtn.setColor("#555555"));
    menuBtn.on("pointerdown", () => {
      if (this.isTransitioning) return;
      this.isTransitioning = true;
      retryBtn.disableInteractive();
      menuBtn.disableInteractive();

      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.cameras.main.once("camerafadeoutcomplete", () => {
        this.scene.stop("GameOverScene");
        this.scene.stop("UIScene");
        this.scene.stop("GameScene");
        this.scene.start("DifficultySelectScene");
      });
    });

    // ESC = retry
    this.input.keyboard.once("keydown-ESC", () => retryBtn.emit("pointerdown"));
    this.input.keyboard.once("keydown-ENTER", () =>
      retryBtn.emit("pointerdown"),
    );
  }
}
