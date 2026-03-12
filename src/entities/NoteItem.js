import { DEPTH } from "../utils/Constants.js";

export class NoteItem extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, noteTitle, noteText) {
    // Use a generated graphics texture for the note icon
    const texKey = "note_icon";
    if (!scene.textures.exists(texKey)) {
      const gfx = scene.add.graphics();
      // Small document icon (16x20)
      gfx.fillStyle(0xffffcc, 1);
      gfx.fillRect(0, 0, 16, 20);
      // Fold corner
      gfx.fillStyle(0xcccc99, 1);
      gfx.fillTriangle(12, 0, 16, 4, 12, 4);
      // Lines
      gfx.lineStyle(1, 0x666666, 0.6);
      gfx.lineBetween(2, 6, 12, 6);
      gfx.lineBetween(2, 10, 10, 10);
      gfx.lineBetween(2, 14, 11, 14);
      gfx.generateTexture(texKey, 16, 20);
      gfx.destroy();
    }

    super(scene, x, y, texKey);

    this.scene = scene;
    this.noteTitle = noteTitle || "Notiz";
    this.noteText = noteText || "";

    scene.add.existing(this);
    scene.physics.add.existing(this, true);

    this.setDepth(DEPTH.PROMPT);
    this.body.setCircle(8, 0, 2);

    // Glow / pulse animation
    this.scene.tweens.add({
      targets: this,
      alpha: { from: 0.7, to: 1 },
      scaleX: { from: 1, to: 1.2 },
      scaleY: { from: 1, to: 1.2 },
      duration: 800,
      yoyo: true,
      repeat: -1,
    });
  }

  collect(player) {
    if (player.inventory) {
      const noteData = {
        title: this.noteTitle,
        text: this.noteText,
      };
      player.inventory.addNote(noteData);

      // Notification
      const uiScene = this.scene.scene.get("UIScene");
      if (uiScene && uiScene.showNotification) {
        uiScene.showNotification("NEUE NOTIZ ERHALTEN", 0x00ffff);
      }

      // Collect animation
      this.scene.tweens.add({
        targets: this,
        y: this.y - 30,
        alpha: 0,
        duration: 300,
        onComplete: () => {
          this.destroy();
        },
      });
    }
  }
}
