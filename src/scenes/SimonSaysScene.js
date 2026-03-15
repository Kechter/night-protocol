import { DEPTH } from "../utils/Constants.js";
import { Config } from "../utils/Config.js";
import { getDifficulty } from "../utils/DifficultyConfig.js";
import { getSoundManager } from "../utils/SoundManager.js";

export class SimonSaysScene extends Phaser.Scene {
  constructor() {
    super({ key: "SimonSaysScene" });
  }

  init(data) {
    this.onResult = data.onResult;

    this.sequence = [];
    this.playerSequence = [];
    this.round = 0;

    // Runden aus Difficulty
    const diff = getDifficulty();
    this.maxRounds = diff.simonRounds; // Easy=3, Normal=5, Hard=6, Hardcore=8
    this.inputActive = false;

    // UPDATE: 3x3 Grid (9 Farben)
    // Wir definieren hier Positionen und Farben
    const size = 80; // Button Größe
    const gap = 10; // Abstand
    const offset = size + gap;

    // Farbpalette für 9 Buttons
    const palette = [
      0xff0000, // Rot
      0x00ff00, // Grün
      0x0000ff, // Blau
      0xffff00, // Gelb
      0xff00ff, // Lila
      0x00ffff, // Cyan
      0xff8800, // Orange
      0xffffff, // Weiß
      0x8800ff, // Violett
    ];

    this.colors = [];
    let idCounter = 0;

    // Grid generieren: Zeilen y: -1, 0, 1 | Spalten x: -1, 0, 1
    for (let row = -1; row <= 1; row++) {
      for (let col = -1; col <= 1; col++) {
        const colorHex = palette[idCounter];
        this.colors.push({
          id: idCounter,
          hex: colorHex,
          // Helles Aufleuchten simulieren (einfach sehr hell, fast weiß)
          bright: 0xffffff,
          x: col * offset,
          y: row * offset + 20, // +20 damit es unter dem Header sitzt
        });
        idCounter++;
      }
    }
  }

  create() {
    // Admin mode: Auto-complete
    if (Config.skipMinigames) {
      this.time.delayedCall(100, () => {
        if (this.onResult) this.onResult(true);
        this.scene.stop();
        this.scene.resume("GameScene");
      });
      return;
    }

    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    // 1. Halb-transparenter Hintergrund (Fullscreen)
    this.add.rectangle(
      centerX,
      centerY,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0.85,
    );

    // 2. Container für das Minigame
    this.container = this.add.container(centerX, centerY);
    this.container.setScale(1.25);

    // Hintergrund des Terminals (Vergrößert für 3x3)
    const bg = this.add
      .rectangle(0, 0, 340, 420, 0x222222)
      .setStrokeStyle(4, 0x00ff00);
    this.container.add(bg);
    this.soundManager = getSoundManager(this);

    // Header Text
    const title = this.add
      .text(0, -185, "SICHERHEITSSTUFE 5", {
        fontFamily: "VT323",
        fontSize: "32px",
        color: "#00ff00",
        padding: { x: 10, y: 5 }
      })
      .setOrigin(0.5);
    this.container.add(title);

    // Status Text
    this.statusText = this.add
      .text(0, 160, "INITIALISIERUNG...", {
        fontFamily: "VT323",
        fontSize: "24px",
        color: "#ffffff",
        padding: { x: 10, y: 5 }
      })
      .setOrigin(0.5);
    this.container.add(this.statusText);

    // Abort Button
    const abortBtn = this.add
      .text(0, 190, "[ ABBRECHEN ]", {
        fontFamily: "VT323",
        fontSize: "20px",
        color: "#ff0000",
        padding: { x: 12, y: 6 }
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    
    abortBtn.on("pointerover", () => {
      abortBtn.setColor("#ffffff");
      this.soundManager.playHover();
    });
    abortBtn.on("pointerout", () => abortBtn.setColor("#ff0000"));
    abortBtn.on("pointerdown", () => {
      this.soundManager.playClick();
      this.gameOver(false);
    });
    this.container.add(abortBtn);

    // Buttons erstellen
    this.buttons = [];
    this.colors.forEach((c) => {
      const btn = this.add
        .rectangle(c.x, c.y, 80, 80, c.hex)
        .setInteractive({ useHandCursor: true })
        .setStrokeStyle(3, 0xffffff, 0.2) // Schwacher weißer Rahmen
        .setAlpha(0.3); // Inaktiv sehr dunkel

      btn.colorData = c;

      // Klick Event
      btn.on("pointerover", () => this.soundManager.playHover());
      btn.on("pointerdown", () => {
        if (this.inputActive) {
          this.handleInput(c.id);
          this.flashButton(btn);
          if (this.soundManager) this.soundManager.playSimonTone((c.id % 4) + 1);
        }
      });

      this.container.add(btn);
      this.buttons.push(btn);
    });

    // Startverzögerung
    this.time.delayedCall(1000, () => this.startNextRound());
  }

  startNextRound() {
    this.round++;
    this.statusText.setText(`SEQUENZ ${this.round}/${this.maxRounds}`);
    this.statusText.setColor("#ffffff");
    this.inputActive = false;

    // Zufällige ID aus 0-8 wählen
    const nextId = Phaser.Math.Between(0, 8);
    this.sequence.push(nextId);
    this.playerSequence = [];

    this.time.delayedCall(500, () => {
      this.playSequence(0);
    });
  }

  playSequence(index) {
    if (index >= this.sequence.length) {
      this.inputActive = true;
      this.statusText.setText("SEQUENZ WIEDERHOLEN");
      return;
    }

    const btnId = this.sequence[index];
    const btn = this.buttons.find((b) => b.colorData.id === btnId);

    this.flashButton(btn, () => {
      // Sound beim Zeigen abspielen
      if (this.soundManager) this.soundManager.playSimonTone((btnId % 4) + 1);
      
      // Geschwindigkeit leicht erhöhen bei höheren Leveln
      const delay = Math.max(150, 400 - this.round * 40);
      this.time.delayedCall(delay, () => {
        this.playSequence(index + 1);
      });
    });
  }

  flashButton(btn, callback) {
    // Helle Farbe & volles Alpha setzen
    this.tweens.add({
      targets: btn,
      alpha: 1,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 150,
      yoyo: true,
      onComplete: () => {
        if (callback) callback();
      }
    });
  }

  handleInput(id) {
    this.playerSequence.push(id);
    const currentIndex = this.playerSequence.length - 1;

    // Falsche Eingabe?
    if (this.playerSequence[currentIndex] !== this.sequence[currentIndex]) {
      this.gameOver(false);
      return;
    }

    // Sequenz fertig?
    if (this.playerSequence.length === this.sequence.length) {
      if (this.round >= this.maxRounds) {
        this.gameOver(true);
      } else {
        this.inputActive = false;
        this.statusText.setText("KORREKT!");
        this.statusText.setColor("#00ff00");
        this.time.delayedCall(800, () => this.startNextRound());
      }
    }
  }

  gameOver(success) {
    this.inputActive = false;
    if (success) {
      this.statusText.setText("ZUGANG GEWÄHRT");
      this.statusText.setColor("#00ff00");
      this.container.first.setStrokeStyle(4, 0x00ff00);
      this.soundManager.playSuccess();
    } else {
      this.statusText.setText("ZUGANG VERWEIGERT");
      this.statusText.setColor("#ff0000");
      this.container.first.setStrokeStyle(4, 0xff0000);
      this.soundManager.playError();

      this.tweens.add({
        targets: this.container,
        x: this.container.x + 10,
        duration: 50,
        yoyo: true,
        repeat: 5,
      });
    }

    this.time.delayedCall(1500, () => {
      if (this.onResult) this.onResult(success);
      this.scene.stop();
      this.scene.resume("GameScene");
    });
  }
}
