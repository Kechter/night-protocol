import { Config } from "../utils/Config.js";
import { DEPTH, KEY_CONFIG } from "../utils/Constants.js";

export class Door extends Phaser.GameObjects.Rectangle {
  constructor(scene, x, y, properties, width, height) {
    super(scene, x, y, width, height, 0x000000, 0);

    this.scene = scene;

    const rawID = properties.reqKeyID || properties.keyID || properties.id;
    this.reqKeyID = rawID ? String(rawID).trim() : null;

    // Custom Property aus Tiled: "minigame"
    // Werte: "simon", "wires", "timing", "pattern", "slide", "signal"
    this.requiredMinigame = properties.minigame || null;

    if (this.reqKeyID) {
      this.isLocked = true;
    } else {
      this.isLocked =
        properties.locked !== undefined ? properties.locked : false;
    }

    scene.add.existing(this);
    scene.physics.add.existing(this, true);

    this.scene.time.delayedCall(50, () => this.disableWallCollisionUnderDoor());

    // Schloss Icon Logik
    if (this.isLocked && this.reqKeyID) {
      this.addLockIcon();
    } else if (this.requiredMinigame) {
      let tint = 0xffffff;
      switch (this.requiredMinigame) {
        case "simon":
          tint = 0x00ffff;
          break;
        case "wires":
          tint = 0xff0000;
          break;
        case "timing":
          tint = 0x3498db;
          break;
        case "pattern":
          tint = 0x9b59b6;
          break;
        // Neue Farben:
        case "slide":
          tint = 0x2ecc71;
          break; // Grün (Data)
        case "signal":
          tint = 0xe67e22;
          break; // Orange (Radio/Signal)
        case "lockpick":
          tint = 0xcd7f32;
          break; // Bronze (Schloss)
      }
      this.addLockIcon(tint);
    }
  }

  addLockIcon(tintColor) {
    let color = tintColor;
    if (!color) {
      const config = KEY_CONFIG[this.reqKeyID] || KEY_CONFIG["default"];
      color = config.color;
    }

    this.lockIcon = this.scene.add.sprite(this.x, this.y, "item_key_gold");
    this.lockIcon.setDepth(DEPTH.PROMPT);
    this.lockIcon.setScale(0.8);
    this.lockIcon.setTint(color);

    this.scene.tweens.add({
      targets: this.lockIcon,
      y: this.y - 2,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  disableWallCollisionUnderDoor() {
    const layer = this.scene.wallsLayer;
    if (!layer) return;
    const topLeftX = this.x - this.width / 2;
    const topLeftY = this.y - this.height / 2;
    const tiles = layer.getTilesWithinWorldXY(
      topLeftX,
      topLeftY,
      this.width,
      this.height,
    );
    tiles.forEach((tile) => {
      if (tile.index !== -1) tile.setCollision(false, false, false, false);
    });
  }

  tryOpen(player) {
    if (this.isOpen) return;

    // Admin Mode: Skip key requirements, auto-open locked doors
    if (Config.adminMode) {
      if (this.requiredMinigame) {
        this.startMinigame(player);
        return;
      }
      this.open();
      return;
    }

    if (this.isLocked) {
      if (!player.inventory || !player.inventory.hasKey(this.reqKeyID)) {
        if (this.scene.soundManager) Object.values(this.scene.soundManager).length && this.scene.soundManager.playError();
        this.shakeIcon();
        this.showLockedMessage("LOCKED");
        return;
      }
    }

    if (this.requiredMinigame) {
      this.startMinigame(player);
      return;
    }

    this.open();
  }

  startMinigame(player) {
    this.scene.scene.pause("GameScene");

    let sceneKey = "";

    // Mapping erweitern
    switch (this.requiredMinigame) {
      case "simon":
        sceneKey = "SimonSaysScene";
        break;
      case "wires":
        sceneKey = "WireTaskScene";
        break;
      case "timing":
        sceneKey = "TimingHackScene";
        break;
      case "pattern":
        sceneKey = "PatternUnlockScene";
        break;
      case "slide":
        sceneKey = "SlidePuzzleScene";
        break;
      case "signal":
        sceneKey = "SignalTuningScene";
        break;
      case "lockpick":
        sceneKey = "LockpickScene";
        break; // NEU: Schloss knacken
      default:
        console.warn("Unbekanntes Minigame:", this.requiredMinigame);
        this.scene.scene.resume("GameScene");
        return;
    }

    this.scene.scene.launch(sceneKey, {
      onResult: (success) => {
        if (success) {
          if (this.scene.soundManager) this.scene.soundManager.playSuccess();
          this.open();
        } else {
          if (this.scene.soundManager) this.scene.soundManager.playError();
          this.showLockedMessage("FAIL");
          this.shakeIcon();
        }
      },
    });
  }

  shakeIcon() {
    if (this.lockIcon) {
      this.scene.tweens.add({
        targets: this.lockIcon,
        x: this.x + 5,
        duration: 50,
        yoyo: true,
        repeat: 5,
      });
    }
  }

  open() {
    this.isOpen = true;
    if (this.lockIcon) this.lockIcon.destroy();
    if (this.scene.soundManager) this.scene.soundManager.playDoorOpen();

    // 1. Disable Physics Body immediately
    if (this.body) {
      this.body.checkCollision.none = true;
      this.body.enable = false;
      this.scene.physics.world.remove(this.body);
    }

    // 2. Remove Tiles and Tile Collision
    // Use a slightly smaller area to avoid deleting adjacent walls if the door is tight
    const layer = this.scene.wallsLayer;
    const tiles = layer.getTilesWithinWorldXY(
      this.x - this.width / 2 + 2,
      this.y - this.height / 2 + 2,
      this.width - 4,
      this.height - 4,
    );

    tiles.forEach((tile) => {
      if (tile && tile.index !== -1) {
        layer.removeTileAt(tile.x, tile.y);
        // Also explicitly disable collision on the empty tile spot just in case
        tile.setCollision(false, false, false, false);
      }
    });

    // 3. Destroy GameObject
    this.destroy();
  }

  showLockedMessage(text) {
    if (this.msgText) return;
    this.msgText = this.scene.add
      .text(this.x, this.y - 40, text, {
        fontSize: "10px",
        fill: "#ff0000",
        backgroundColor: "#000",
        padding: { x: 2, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.PROMPT);
    this.scene.time.delayedCall(1000, () => {
      if (this.msgText) this.msgText.destroy();
      this.msgText = null;
    });
  }
}
