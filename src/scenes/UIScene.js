import { KEY_CONFIG } from "../utils/Constants.js";

export class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: "UIScene" });
  }

  create() {
    // Diese Szene hat KEINEN Zoom (Default 1) -> UI ist scharf und passt auf den Schirm
    this.notesData = [];
    this.createInventoryUI();

    // Listener: Wenn GameScene sagt "Update Inventar", machen wir das
    const gameScene = this.scene.get("GameScene");
    gameScene.events.on("updateInventory", this.updateInventory, this);

    this.createFullscreenButton();
  }

  createInventoryUI() {
    this.uiGroup = this.add.group();
    this.slotCount = 5;
    this.noteSlotCount = 3;
    this.slotSize = 40;
    this.gap = 8;

    // Positionierung (800x600 Screen)
    const totalKeyWidth =
      this.slotCount * this.slotSize + (this.slotCount - 1) * this.gap;
    this.startX = (800 - totalKeyWidth) / 2;
    this.startY = 540; // Unten Mitte

    // Note slots position (rechts neben den Key-Slots)
    this.noteStartX = this.startX + totalKeyWidth + this.gap * 3;

    this.drawSlots([], []);
  }

  updateInventory(collectedKeys, notes) {
    this.notesData = notes || [];
    this.drawSlots(collectedKeys, this.notesData);
  }

  drawSlots(keysArray, notesArray) {
    this.uiGroup.clear(true, true);

    // --- Key Slots ---
    for (let i = 0; i < this.slotCount; i++) {
      const x = this.startX + i * (this.slotSize + this.gap);
      const y = this.startY;

      // Slot Box
      const slotBg = this.add
        .rectangle(x, y, this.slotSize, this.slotSize, 0x222222, 0.8)
        .setOrigin(0, 0)
        .setStrokeStyle(2, 0x555555);
      this.uiGroup.add(slotBg);

      // Item
      if (i < keysArray.length) {
        const keyID = keysArray[i];
        const config = KEY_CONFIG[keyID] || KEY_CONFIG["default"];

        const icon = this.add
          .image(x + this.slotSize / 2, y + this.slotSize / 2, "item_key_gold")
          .setScale(0.8)
          .setTint(config.color);
        this.uiGroup.add(icon);
      }
    }

    // --- Note Slots ---
    const notes = notesArray || [];
    for (let i = 0; i < this.noteSlotCount; i++) {
      const x = this.noteStartX + i * (this.slotSize + this.gap);
      const y = this.startY;

      // Slot Box (slightly different color for notes)
      const slotBg = this.add
        .rectangle(x, y, this.slotSize, this.slotSize, 0x1a1a2e, 0.8)
        .setOrigin(0, 0)
        .setStrokeStyle(2, 0x00cccc);
      this.uiGroup.add(slotBg);

      if (i < notes.length) {
        // Draw a small document icon using graphics
        const centerX = x + this.slotSize / 2;
        const centerY = y + this.slotSize / 2;

        // Document shape
        const doc = this.add.graphics();
        doc.fillStyle(0x00ffcc, 1);
        doc.fillRect(centerX - 8, centerY - 10, 16, 20);
        // Fold corner
        doc.fillStyle(0x009999, 1);
        doc.fillTriangle(
          centerX + 4,
          centerY - 10,
          centerX + 8,
          centerY - 6,
          centerX + 4,
          centerY - 6,
        );
        // Lines
        doc.lineStyle(1, 0x003333, 0.8);
        doc.lineBetween(centerX - 5, centerY - 4, centerX + 3, centerY - 4);
        doc.lineBetween(centerX - 5, centerY, centerX + 2, centerY);
        doc.lineBetween(centerX - 5, centerY + 4, centerX + 4, centerY + 4);
        this.uiGroup.add(doc);

        // Make clickable (invisible hitbox)
        const hitArea = this.add
          .rectangle(x, y, this.slotSize, this.slotSize, 0x000000, 0)
          .setOrigin(0, 0)
          .setInteractive({ useHandCursor: true });

        const noteIndex = i;
        hitArea.on("pointerdown", () => {
          this.openNote(noteIndex);
        });
        hitArea.on("pointerover", () => {
          slotBg.setStrokeStyle(2, 0x00ffff);
        });
        hitArea.on("pointerout", () => {
          slotBg.setStrokeStyle(2, 0x00cccc);
        });
        this.uiGroup.add(hitArea);
      }
    }
  }

  openNote(index) {
    if (!this.notesData || index >= this.notesData.length) return;
    const note = this.notesData[index];

    const gameScene = this.scene.get("GameScene");
    if (gameScene) {
      this.scene.pause("GameScene");
    }

    this.scene.launch("NoteViewScene", {
      title: note.title,
      text: note.text,
    });
  }

  // --- Notification System ---
  showNotification(text, color) {
    const hexColor = "#" + (color || 0x00ff00).toString(16).padStart(6, "0");

    const notifContainer = this.add.container(400, -40);

    // Background
    const bg = this.add
      .rectangle(0, 0, 350, 36, 0x000000, 0.85)
      .setStrokeStyle(2, color || 0x00ff00);
    notifContainer.add(bg);

    // Text
    const notifText = this.add
      .text(0, 0, text, {
        fontFamily: "monospace",
        fontSize: "16px",
        color: hexColor,
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    notifContainer.add(notifText);

    // Slide in from top
    this.tweens.add({
      targets: notifContainer,
      y: 35,
      duration: 300,
      ease: "Back.easeOut",
    });

    // Slide out after 2.5s
    this.time.delayedCall(2500, () => {
      this.tweens.add({
        targets: notifContainer,
        y: -40,
        alpha: 0,
        duration: 300,
        ease: "Power2",
        onComplete: () => notifContainer.destroy(),
      });
    });
  }

  createFullscreenButton() {
    // Simple Text Button top-right
    const btn = this.add
      .text(this.scale.width - 20, 20, "[ Fullscreen ]", {
        fontSize: "24px",
        fill: "#ffffff",
        backgroundColor: "#000000",
      })
      .setOrigin(1, 0)
      .setPadding(10)
      .setInteractive({ useHandCursor: true })
      .setScrollFactor(0); // Static UI

    btn.on("pointerdown", () => {
      if (this.scale.isFullscreen) {
        this.scale.stopFullscreen();
      } else {
        this.scale.startFullscreen();
      }
    });
  }
}
