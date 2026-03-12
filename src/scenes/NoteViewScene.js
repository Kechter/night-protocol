export class NoteViewScene extends Phaser.Scene {
  constructor() {
    super({ key: "NoteViewScene" });
  }

  init(data) {
    this.noteTitle = data.title || "Notiz";
    this.noteText = data.text || "";
  }

  create() {
    const { width, height } = this.scale;

    // Fullscreen dark overlay
    this.add
      .rectangle(width / 2, height / 2, width, height, 0x000000, 0.92)
      .setOrigin(0.5);

    // Terminal frame
    const frameW = Math.min(700, width - 80);
    const frameH = Math.min(500, height - 80);
    const frameX = width / 2;
    const frameY = height / 2;

    // Outer border (hacker green)
    this.add
      .rectangle(frameX, frameY, frameW + 4, frameH + 4, 0x00ff00, 1)
      .setOrigin(0.5);

    // Inner background
    this.add
      .rectangle(frameX, frameY, frameW, frameH, 0x0a0a0a, 1)
      .setOrigin(0.5);

    // Scanline effect (subtle)
    for (let i = 0; i < frameH; i += 4) {
      this.add
        .rectangle(frameX, frameY - frameH / 2 + i, frameW, 1, 0x00ff00, 0.03)
        .setOrigin(0.5, 0);
    }

    // Header bar
    const headerY = frameY - frameH / 2 + 20;
    this.add
      .rectangle(frameX, headerY, frameW - 20, 30, 0x001a00, 1)
      .setOrigin(0.5);

    // Title
    this.add
      .text(frameX - frameW / 2 + 25, headerY, `> ${this.noteTitle}`, {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#00ff00",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);

    // Close button [X]
    const closeBtn = this.add
      .text(frameX + frameW / 2 - 25, headerY, "[X]", {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#ff4444",
        fontStyle: "bold",
      })
      .setOrigin(1, 0.5)
      .setInteractive({ useHandCursor: true });

    closeBtn.on("pointerover", () => closeBtn.setColor("#ff8888"));
    closeBtn.on("pointerout", () => closeBtn.setColor("#ff4444"));
    closeBtn.on("pointerdown", () => this.closeNote());

    // Note content
    const contentY = headerY + 35;
    const contentH = frameH - 80;

    this.add.text(frameX - frameW / 2 + 25, contentY, this.noteText, {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#00cc00",
      wordWrap: { width: frameW - 60 },
      lineSpacing: 6,
    });

    // Blink cursor at bottom
    const cursorText = this.add.text(
      frameX - frameW / 2 + 25,
      frameY + frameH / 2 - 30,
      "█",
      {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#00ff00",
      },
    );

    this.tweens.add({
      targets: cursorText,
      alpha: 0,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    // ESC key to close
    this.input.keyboard.on("keydown-ESC", () => this.closeNote());

    // Fade in
    this.cameras.main.fadeIn(200, 0, 0, 0);
  }

  closeNote() {
    this.scene.resume("GameScene");
    this.scene.stop();
  }
}
