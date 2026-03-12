import { DEPTH } from "../utils/Constants.js";
import { getDifficulty } from "../utils/DifficultyConfig.js";

export class Computer extends Phaser.GameObjects.Container {
  constructor(scene, x, y, properties, width, height) {
    super(scene, x, y);
    this.scene = scene;
    this.width = width || 32;
    this.height = height || 32;

    this.minigame = properties.minigame || null;
    this.id = properties.id || "unknown_pc";
    this.isHacked = false;
    this.hackCooldown = 0; // ms remaining until next hack attempt

    // Event Properties
    this.unlocksDoor = properties.unlocksDoor || null;
    this.hint = properties.hint || null;
    this.spawnsKey = properties.spawnsKey || null;
    this.disablesAlarm = properties.disablesAlarm || false;
    this.triggersAlarm = properties.triggersAlarm || false; // NEU: Simon Says Falle
    this.disablesBots = properties.disablesBots || false;
    this.winGame = properties.winGame || false;

    // Physics Body (nur für Positionsbestimmung / Debug, keine Kollision nötig)
    this.scene.physics.add.existing(this);
    this.body.setSize(this.width, this.height);
    this.body.setImmovable(true);

    // 1. Highlight-Prompt (Taste "E")
    // Standardmäßig unsichtbar, erscheint wenn Spieler nah dran ist
    this.promptContainer = this.scene.add.container(0, -this.height);

    const keyBg = this.scene.add
      .rectangle(0, 0, 20, 20, 0x000000)
      .setStrokeStyle(1, 0xffffff);
    const keyText = this.scene.add
      .text(0, 0, "E", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    this.promptContainer.add([keyBg, keyText]);
    this.promptContainer.setDepth(DEPTH.PROMPT);
    this.promptContainer.setVisible(false);
    // ENTFERNT: this.add(this.promptContainer);
    // Ein Container (Computer) überschreibt die Depth seiner Kinder.
    // Wenn das Prompt frei in der Scene leben soll, darf es nicht Kind des Computers sein.

    this.scene.add.existing(this);

    // Input Key für Interaktion
    this.keyE = this.scene.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.E,
    );
  }

  update(delta) {
    if (this.isHacked) return;

    // Cooldown runterticken
    if (this.hackCooldown > 0) {
      this.hackCooldown -= delta || 16;
      const secs = Math.ceil(this.hackCooldown / 1000);
      // Show blocked prompt text
      if (this.promptContainer.visible) {
        const keyText =
          this.promptContainer.list && this.promptContainer.list[1];
        if (keyText) keyText.setText(`${secs}`);
      }
      const player = this.scene.player;
      if (!player) return;
      const dist = Phaser.Math.Distance.Between(
        this.x,
        this.y,
        player.x,
        player.y,
      );
      this.promptContainer.setVisible(dist < 50);
      if (this.hackCooldown <= 0) {
        this.hackCooldown = 0;
        const keyText =
          this.promptContainer.list && this.promptContainer.list[1];
        if (keyText) keyText.setText("E");
      }
      return;
    }

    // Distanz-Check zum Spieler
    const player = this.scene.player;
    if (!player) return;

    const dist = Phaser.Math.Distance.Between(
      this.x,
      this.y,
      player.x,
      player.y,
    );
    const activationRange = 50;

    if (dist < activationRange) {
      this.promptContainer.setVisible(true);
      // Absolute Koordinaten setzen, da es jetzt kein Kind mehr ist
      this.promptContainer.x = this.x;
      this.promptContainer.y =
        this.y - this.height + Math.sin(this.scene.time.now / 150) * 2;

      if (Phaser.Input.Keyboard.JustDown(this.keyE)) {
        if (this.minigame) {
          this.startHack();
        } else if (this.winGame) {
          // Direkter Win-Trigger (kein Minigame nötig)
          this.scene.events.emit("winGame");
        } else {
          const uiScene = this.scene.scene.get("UIScene");
          if (uiScene && uiScene.showNotification) {
            uiScene.showNotification("NO SYSTEM", 0xff0000);
          }
        }
      }
    } else {
      this.promptContainer.setVisible(false);
    }
  }

  startHack() {
    // Spiel pausieren
    this.scene.scene.pause("GameScene");

    // Mapping Minigame Name -> Scene Name
    let sceneKey = "";
    switch (this.minigame) {
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
      // Neue Hacker-Style Minigames
      case "codeFill":
        sceneKey = "CodeFillScene";
        break;
      case "password":
        sceneKey = "PasswordCrackScene";
        break;
      case "memory":
        sceneKey = "MemoryCorruptScene";
        break;
      default:
        console.warn("Unbekanntes Minigame:", this.minigame);
        this.scene.scene.resume("GameScene");
        return;
    }

    this.scene.scene.launch(sceneKey, {
      onResult: (success) => {
        if (success) {
          this.onHackSuccess();
        } else {
          this.onHackFail();
        }
      },
    });
  }

  onHackSuccess() {
    this.isHacked = true;
    this.promptContainer.setVisible(false);

    // Notification über UIScene
    const uiScene = this.scene.scene.get("UIScene");
    if (uiScene && uiScene.showNotification) {
      uiScene.showNotification("ACCESS GRANTED", 0x00ff00);
    }

    console.log(`Computer ${this.id} gehackt!`);

    // Event: Tür öffnen
    if (this.unlocksDoor) {
      this.scene.events.emit("unlockDoor", this.unlocksDoor);
      console.log(`Door unlocked: ${this.unlocksDoor}`);
    }

    // Event: Hint als Notiz ins Inventar
    if (this.hint) {
      const noteData = {
        title: `Log: ${this.id}`,
        text: this.hint,
      };
      if (this.scene.player && this.scene.player.inventory) {
        this.scene.player.inventory.addNote(noteData);
      }
      if (uiScene && uiScene.showNotification) {
        uiScene.showNotification("NEUE NOTIZ ERHALTEN", 0x00ffff);
      }
    }

    // Event: Key spawnen
    if (this.spawnsKey) {
      this.scene.events.emit("spawnKey", this.spawnsKey);
      console.log(`Key spawned: ${this.spawnsKey}`);
    }

    // Event: Alarm deaktivieren
    if (this.disablesAlarm) {
      this.scene.events.emit("disableAlarm");
      console.log("Alarm disabled!");
    }

    // Event: Alarm AUSLÖSEN (Falle)
    if (this.triggersAlarm) {
      this.scene.events.emit("triggerAlarm");
      console.log("Alarm triggered!");
    }

    // Event: Security Bots deaktivieren
    if (this.disablesBots) {
      this.scene.events.emit("disableBots");
    }

    // Event: Win Game
    if (this.winGame) {
      this.scene.events.emit("winGame");
    }
  }

  onHackFail() {
    const uiScene = this.scene.scene.get("UIScene");
    if (uiScene && uiScene.showNotification) {
      uiScene.showNotification("ACCESS DENIED", 0xff0000);
    }
    // Start cooldown based on difficulty
    this.hackCooldown = getDifficulty().hackCooldownMs;
  }

  destroy(fromScene) {
    if (this.promptContainer) {
      this.promptContainer.destroy();
      this.promptContainer = null;
    }
    super.destroy(fromScene);
  }
}
