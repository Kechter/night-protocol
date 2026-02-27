import { getDifficulty } from "../utils/DifficultyConfig.js";

/**
 * WinScene - Wird aufgerufen wenn der Mainframe gehackt wurde.
 */
export class WinScene extends Phaser.Scene {
  constructor() {
    super({ key: "WinScene" });
  }

  init(data) {
    this.stats = data || {};
  }

  create() {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;
    const diff = getDifficulty();

    // Background
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000);

    // Scanlines
    const scanlines = this.add.graphics();
    scanlines.fillStyle(0x000000, 0.15);
    for (let y = 0; y < H; y += 4) {
      scanlines.fillRect(0, y, W, 2);
    }

    // Lines to print
    const lines = [
      { text: "> ZUGANG SERVERRAUM OG2: GEWÄHRT", color: "#555555" },
      { text: "> KLAUSURDATENBANK: GEFUNDEN", color: "#00ff00" },
      { text: "> KOPIERVORGANG ABGESCHLOSSEN", color: "#00ff00" },
      { text: "", color: "#ffffff" },
      { text: "┌─────────────────────────────────┐", color: "#004400" },
      { text: "│                                 │", color: "#004400" },
      { text: "│      MISSION: ERFOLGREICH       │", color: "#00ff00" },
      { text: "│                                 │", color: "#004400" },
      { text: "└─────────────────────────────────┘", color: "#004400" },
      { text: "", color: "#ffffff" },
      { text: `> Schwierigkeit: ${diff.label}`, color: diff.colorHex },
      { text: "", color: "#ffffff" },
      { text: "> Keine Spuren hinterlassen.", color: "#555555" },
      { text: "> Du verschwindest unbemerkt.", color: "#555555" },
    ];

    const startY = 180;
    const lineH = 36;

    lines.forEach((line, i) => {
      this.time.delayedCall(i * 180, () => {
        this.add
          .text(W / 2, startY + i * lineH, line.text, {
            fontFamily: "monospace",
            fontSize: "22px",
            color: line.color,
          })
          .setOrigin(0.5)
          .setAlpha(0);

        // Fade in each line
        this.tweens.add({
          targets: this.children.getAll().at(-1),
          alpha: 1,
          duration: 300,
        });
      });
    });

    // Replay button
    const totalDelay = lines.length * 180 + 800;
    this.time.delayedCall(totalDelay, () => {
      const btn = this.add
        .text(W / 2, H - 80, "[ NOCHMAL SPIELEN ]", {
          fontFamily: "monospace",
          fontSize: "22px",
          color: "#00ff00",
          backgroundColor: "#001100",
          padding: { x: 20, y: 10 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .setAlpha(0);

      this.tweens.add({ targets: btn, alpha: 1, duration: 400 });

      btn.on("pointerover", () => btn.setColor("#ffffff"));
      btn.on("pointerout", () => btn.setColor("#00ff00"));
      btn.on("pointerdown", () => {
        this.cameras.main.fadeOut(400, 0, 0, 0);
        this.cameras.main.once("camerafadeoutcomplete", () => {
          this.scene.stop("WinScene");
          this.scene.stop("UIScene");
          this.scene.start("DifficultySelectScene");
        });
      });

      // ESC also restarts
      this.input.keyboard.once("keydown-ESC", () => btn.emit("pointerdown"));
      this.input.keyboard.once("keydown-ENTER", () => btn.emit("pointerdown"));
    });
  }
}
