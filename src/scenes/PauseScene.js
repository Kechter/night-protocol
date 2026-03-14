import { getSoundManager } from "../utils/SoundManager.js";
import { Config } from "../utils/Config.js";

/**
 * PauseScene
 * Menü für Sound-Einstellungen und Steuerungshilfe.
 */
export class PauseScene extends Phaser.Scene {
  constructor() {
    super({ key: "PauseScene" });
  }

  create() {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;
    this.soundManager = getSoundManager(this);

    // Dark overlay
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.7);

    this.container = this.add.container(W / 2, H / 2);

    // Frame
    const frame = this.add.rectangle(0, 0, 500, 520, 0x111111)
      .setStrokeStyle(2, 0x00ff00);
    this.container.add(frame);

    // Title
    const title = this.add.text(0, -220, "TERMINAL PAUSIERT", {
      fontFamily: "VT323",
      fontSize: "48px",
      color: "#00ff00",
      padding: { x: 10, y: 5 }
    }).setOrigin(0.5);
    this.container.add(title);

    // --- Buttons ---
    const resumeBtn = this.createButton(0, -130, "WEITER", () => this.resume());
    this.container.add(resumeBtn);

    this.soundsBtn = this.createButton(0, -70, this.getSoundText(), () => {
      this.game.sound.mute = !this.game.sound.mute;
      this.soundsBtn.setText(this.getSoundText());
    });
    this.container.add(this.soundsBtn);

    const quitBtn = this.createButton(0, -10, "HAUPTMENÜ", () => {
        window.location.reload();
    });
    this.container.add(quitBtn);

    // --- Controls Overview ---
    const controlsHeader = this.add.text(0, 70, "-- STEUERUNG --", {
        fontFamily: "VT323",
        fontSize: "24px",
        color: "#555555",
        padding: { x: 5, y: 2 }
    }).setOrigin(0.5);
    this.container.add(controlsHeader);

    const controlsLines = [
        "W/A/S/D / Pfeile : Bewegen",
        "E : Interagieren / Hacken",
        "I : Inventar öffnen",
        "ESC : Pause / Menü"
    ];

    const controlsText = this.add.text(0, 160, controlsLines.join("\n"), {
        fontFamily: "VT323",
        fontSize: "24px",
        color: "#cccccc",
        align: "center",
        lineSpacing: 10,
        padding: { x: 10, y: 10 }
    }).setOrigin(0.5);
    this.container.add(controlsText);

    // Close on ESC
    const escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    escKey.on('down', () => {
        this.resume();
    });
  }

  getSoundText() {
    return this.game.sound.mute ? "SOUND: AUS [ X ]" : "SOUND: AN [ V ]";
  }

  createButton(x, y, text, callback) {
    const btn = this.add.text(x, y, text, {
      fontFamily: "VT323",
      fontSize: "32px",
      color: "#00ff00",
      backgroundColor: "#002200",
      padding: { x: 20, y: 10 }
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });

    btn.on("pointerover", () => {
      btn.setColor("#ffffff");
      btn.setBackgroundColor("#004400");
      if (this.soundManager) this.soundManager.playHover();
    });
    btn.on("pointerout", () => {
      btn.setColor("#00ff00");
      btn.setBackgroundColor("#002200");
    });
    btn.on("pointerdown", () => {
      if (this.soundManager) this.soundManager.playClick();
      callback();
    });

    return btn;
  }

  resume() {
    this.scene.stop();
    this.scene.resume("GameScene");
    this.scene.resume("UIScene");

    const minigames = [
      "LockpickScene",
      "PasswordCrackScene",
      "MemoryCorruptScene",
      "SimonSaysScene",
      "WireTaskScene",
      "TimingHackScene",
      "PatternUnlockScene",
      "SlidePuzzleScene",
      "SignalTuningScene",
      "CodeFillScene",
      "NoteViewScene",
    ];

    minigames.forEach((key) => {
      if (this.scene.get(key) && this.scene.isPaused(key)) {
        this.scene.resume(key);
      }
    });
  }
}
