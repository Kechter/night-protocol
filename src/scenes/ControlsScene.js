/**
 * ControlsScene
 * Zeigt Steuerungsübersicht vor dem Schwierigkeits-Screen.
 * Linksklick oder ENTER → weiter zur DifficultySelectScene.
 */
export class ControlsScene extends Phaser.Scene {
  constructor() {
    super({ key: "ControlsScene" });
  }

  create() {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;

    // Background
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000);

    // Scanlines
    const scanlines = this.add.graphics();
    scanlines.fillStyle(0x000000, 0.12);
    for (let y = 0; y < H; y += 4) {
      scanlines.fillRect(0, y, W, 2);
    }

    // Header
    this.add
      .text(W / 2, 55, "> NIGHT PROTOCOL v1.0", {
        fontFamily: "VT323",
        fontSize: "24px",
        color: "#555555",
        padding: { x: 10, y: 5 }
      })
      .setOrigin(0.5);

    this.add
      .text(W / 2, 108, "STEUERUNG", {
        fontFamily: "VT323",
        fontSize: "64px",
        color: "#00ff00",
        padding: { x: 20, y: 10 }
      })
      .setOrigin(0.5);

    this.add
      .text(W / 2, 140, "──────────────────────────────────", {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#003300",
      })
      .setOrigin(0.5);

    // ── Control groups ──────────────────────────────────────
    const COL_L = W * 0.38; // Give the keys a bit more space to the left
    const COL_R = W * 0.43; // Move descriptions right so text isn't cut off or crammed
    const LINE = 32; // tighter line height

    const sections = [
      {
        title: "BEWEGUNG",
        color: "#00ccff",
        rows: [
          { key: "W / A / S / D", desc: "Laufen" },
          { key: "↑ ↓ ← →", desc: "Alternative (Pfeiltasten)" },
        ],
      },
      {
        title: "INTERAKTION",
        color: "#00ccff",
        rows: [
          { key: "E", desc: "Tür öffnen / Terminal hacken" },
          { key: "I", desc: "Inventar öffnen" },
        ],
      },
      {
        title: "MINIGAMES",
        color: "#00ccff",
        rows: [
          { key: "A / D  oder  ← →", desc: "Schloss drehen (Lockpick)" },
          { key: "LEERTASTE", desc: "Pin halten (Lockpick)" },
          { key: "Maus", desc: "Alle anderen Minigames" },
          { key: "ESC", desc: "Minigame abbrechen" },
        ],
      },
      {
        title: "SONSTIGES",
        color: "#00ccff",
        rows: [
          { key: "F11", desc: "Vollbild umschalten" },
          { key: "ESC", desc: "Pause / Zurück" },
        ],
      },
    ];

    let cursorY = 200;

    sections.forEach((section) => {
      // Section title
      this.add
        .text(W / 2, cursorY, section.title, {
          fontFamily: "VT323",
          fontSize: "28px",
          color: section.color,
          padding: { x: 10, y: 5 }
        })
        .setOrigin(0.5);

      // Divider
      this.add
        .text(
          W / 2,
          cursorY + 22,
          "─────────────────────────────────────────",
          {
            fontFamily: "monospace",
            fontSize: "11px",
            color: "#003300",
          },
        )
        .setOrigin(0.5);

      // Rows
      section.rows.forEach((row, i) => {
        const rowY = cursorY + 45 + i * LINE;

        // Key badge
        const badge = this.add
          .text(COL_L, rowY, `[ ${row.key} ]`, {
            fontFamily: "VT323",
            fontSize: "22px",
            color: "#ffff00",
            padding: { x: 10, y: 5 }
          })
          .setOrigin(1, 0.5);

        // Arrow
        this.add
          .text(COL_L + 16, rowY, "→", {
            fontFamily: "monospace",
            fontSize: "16px",
            color: "#336633",
          })
          .setOrigin(1, 0.5); // Right aligned arrow with badge

        // Description
        this.add
          .text(COL_R, rowY, row.desc, {
            fontFamily: "VT323",
            fontSize: "22px",
            color: "#cccccc",
            padding: { x: 10, y: 5 }
          })
          .setOrigin(0, 0.5);
      });
      
      cursorY += 60 + section.rows.length * LINE;
    });

    // ── Continue hint (blinking) ─────────────────────────────
    const hint = this.add
      .text(
        W / 2,
        H - 55,
        "[LINKSKLICK / ENTER]   Weiter zur Schwierigkeitsauswahl",
        {
          fontFamily: "VT323",
          fontSize: "24px",
          color: "#00ff00",
          padding: { x: 15, y: 10 }
        },
      )
      .setOrigin(0.5);

    this.tweens.add({
      targets: hint,
      alpha: { from: 1, to: 0.2 },
      duration: 700,
      yoyo: true,
      repeat: -1,
    });

    // ── Input ────────────────────────────────────────────────
    this.input.on("pointerdown", () => this.proceed());
    this.input.keyboard.on("keydown-ENTER", () => this.proceed());
    this.input.keyboard.on("keydown-SPACE", () => this.proceed());
  }

  proceed() {
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.start("DifficultySelectScene");
    });
  }
}
