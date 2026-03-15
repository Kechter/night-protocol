import { DEPTH } from "../utils/Constants.js";
import { Config } from "../utils/Config.js";
import { getDifficulty } from "../utils/DifficultyConfig.js";
import { PCMonitorFrame } from "../ui/PCMonitorFrame.js";
import { getSoundManager } from "../utils/SoundManager.js";

/**
 * MemoryCorruptScene - Hex Memory Editor Minigame
 * Der Spieler muss Hex-Werte auf die Zielwerte anpassen
 */
export class MemoryCorruptScene extends Phaser.Scene {
  constructor() {
    super({ key: "MemoryCorruptScene" });
  }

  init(data) {
    this.onResult = data.onResult;

    // Spielzustand
    this.memorySlots = [];
    this.selectedSlot = 0;
    this.isComplete = false;

    // Timer
    const diff = getDifficulty();
    this.timeLimit = Math.floor(45000 * diff.minigameTimeMultiplier);
    this.timeRemaining = this.timeLimit;
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

    // Monitor Frame erstellen
    this.monitor = new PCMonitorFrame(this, "SPEICHER-EDITOR - 0x7FFE0000");
    this.monitor.create();

    const content = this.monitor.getContentArea();
    this.soundManager = getSoundManager(this);

    // Memory Slots generieren
    this.generateMemorySlots();

    // Memory Table anzeigen
    this.createMemoryTable(content);

    // Controls erstellen
    this.createControls(content);

    // Timer
    this.createTimer(content);

    // Keyboard Input
    this.setupKeyboardInput();

    // Status
    this.statusText = this.add
      .text(0, content.y + content.height / 2 - 65, "ZIELWERTE ANPASSEN", {
        fontFamily: "VT323",
        fontSize: "24px",
        color: "#ffff00",
        padding: { x: 10, y: 5 }
      })
      .setOrigin(0.5);
    this.monitor.add(this.statusText);

    // Ersten Slot highlighten
    this.updateSelection();

    // Abort Button
    const abortBtn = this.add
      .text(0, content.y + content.height / 2 - 20, "[ ABBRECHEN ]", {
        fontFamily: "VT323",
        fontSize: "20px",
        color: "#ff0000",
        backgroundColor: "#220000",
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
      this.endGame(false);
    });
    this.monitor.add(abortBtn);
  }

  generateMemorySlots() {
    // 4 Memory Slots mit zufälligen Werten
    const numSlots = 4;
    const baseAddress = 0x7ffe0010;

    for (let i = 0; i < numSlots; i++) {
      const target = Phaser.Math.Between(0, 255);
      // Startwerrt ist entweder schon korrekt (25% Chance) oder zufällig
      const startCorrect = Math.random() < 0.25;
      const current = startCorrect ? target : Phaser.Math.Between(0, 255);

      this.memorySlots.push({
        address: baseAddress + i * 4,
        current: current,
        target: target,
        isCorrect: current === target,
      });
    }
  }

  createMemoryTable(content) {
    const startY = content.y - content.height / 2 + 50;
    const rowHeight = 40;

    // Header
    const headerY = startY - 20;
    const headers = ["ADDR", "VALUE", "TARGET", "STATUS"];
    const headerX = [-150, -40, 60, 150];

    headers.forEach((header, index) => {
      const text = this.add
        .text(headerX[index], headerY, header, {
          fontFamily: "VT323",
          fontSize: "18px",
          color: "#666666",
          padding: { x: 2, y: 2 }
        })
        .setOrigin(0.5);
      this.monitor.add(text);
    });

    // Trennlinie
    const divider = this.add.rectangle(
      0,
      headerY + 15,
      content.width - 40,
      2,
      0x333333,
    );
    this.monitor.add(divider);

    // Slots Container
    this.slotsContainer = this.add.container(0, startY + 20);
    this.monitor.add(this.slotsContainer);

    this.slotElements = [];

    this.memorySlots.forEach((slot, index) => {
      const y = index * rowHeight;
      const elements = {};

      // Selection Highlight Box
      elements.selectBox = this.add
        .rectangle(0, y, content.width - 60, rowHeight - 5, 0x003300, 0)
        .setStrokeStyle(2, 0x00ff00, 0);
      this.slotsContainer.add(elements.selectBox);

      // Address
      elements.addressText = this.add
        .text(-150, y, this.formatHex(slot.address, 8), {
          fontFamily: "VT323",
          fontSize: "18px",
          color: "#888888",
          padding: { x: 2, y: 2 }
        })
        .setOrigin(0.5);
      this.slotsContainer.add(elements.addressText);

      // Current Value (editable)
      elements.valueText = this.add
        .text(-40, y, `[${this.formatHex(slot.current, 2)}]`, {
          fontFamily: "VT323",
          fontSize: "22px",
          color: "#00ff00",
          backgroundColor: "#002200",
          padding: { x: 8, y: 4 },
        })
        .setOrigin(0.5);
      this.slotsContainer.add(elements.valueText);

      // Target Value
      elements.targetText = this.add
        .text(60, y, this.formatHex(slot.target, 2), {
          fontFamily: "VT323",
          fontSize: "20px",
          color: "#ff6600",
          padding: { x: 2, y: 2 }
        })
        .setOrigin(0.5);
      this.slotsContainer.add(elements.targetText);

      // Status
      elements.statusText = this.add
        .text(150, y, slot.isCorrect ? "✓" : "✗", {
          fontFamily: "VT323",
          fontSize: "22px",
          color: slot.isCorrect ? "#00ff00" : "#ff0000",
          padding: { x: 2, y: 2 }
        })
        .setOrigin(0.5);
      this.slotsContainer.add(elements.statusText);

      this.slotElements.push(elements);
    });
  }

  updateSlotDisplay(index) {
    const slot = this.memorySlots[index];
    const elements = this.slotElements[index];

    slot.isCorrect = slot.current === slot.target;

    elements.valueText.setText(`[${this.formatHex(slot.current, 2)}]`);
    elements.statusText.setText(slot.isCorrect ? "✓" : "✗");
    elements.statusText.setColor(slot.isCorrect ? "#00ff00" : "#ff0000");

    // Prüfen ob alle korrekt
    if (this.memorySlots.every((s) => s.isCorrect)) {
      this.endGame(true);
    }
  }

  updateSelection() {
    this.slotElements.forEach((elements, index) => {
      if (index === this.selectedSlot) {
        elements.selectBox.setFillStyle(0x003300, 0.5);
        elements.selectBox.setStrokeStyle(2, 0x00ff00, 1);
        elements.valueText.setColor("#ffffff");
      } else {
        elements.selectBox.setFillStyle(0x003300, 0);
        elements.selectBox.setStrokeStyle(2, 0x00ff00, 0);
        elements.valueText.setColor("#00ff00");
      }
    });
  }

  createControls(content) {
    const controlY = content.y + content.height / 2 - 130;

    // Background Panel
    const panelBg = this.add
      .rectangle(0, controlY, content.width - 40, 55, 0x002200)
      .setStrokeStyle(1, 0x00aa00);
    this.monitor.add(panelBg);

    // Buttons
    const buttons = [
      { text: "▲ UP", x: -180, action: () => this.moveSelection(-1) },
      { text: "▼ DOWN", x: -100, action: () => this.moveSelection(1) },
      { text: "[ - ]", x: 0, action: () => this.adjustValue(-1) },
      { text: "[ + ]", x: 80, action: () => this.adjustValue(1) },
      { text: "[-16]", x: 160, action: () => this.adjustValue(-16) },
      { text: "[+16]", x: 220, action: () => this.adjustValue(16) },
    ];

    buttons.forEach((btn) => {
      const button = this.add
        .text(btn.x, controlY, btn.text, {
          fontFamily: "VT323",
          fontSize: "18px",
          color: "#00ff00",
          backgroundColor: "#004400",
          padding: { x: 10, y: 8 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      button.on("pointerover", () => {
        button.setBackgroundColor("#006600");
        this.soundManager.playHover();
      });
      button.on("pointerout", () => button.setBackgroundColor("#004400"));
      button.on("pointerdown", () => {
        this.soundManager.playClick();
        btn.action();
      });

      this.monitor.add(button);
    });

    // Keyboard Hint
    const hint = this.add
      .text(0, controlY + 40, "[↑/↓] Auswählen  [←/→] Ändern  [Q/E] ±16", {
        fontFamily: "VT323",
        fontSize: "18px",
        color: "#666666",
        padding: { x: 5, y: 5 }
      })
      .setOrigin(0.5);
    this.monitor.add(hint);
  }

  setupKeyboardInput() {
    this.input.keyboard.on("keydown-UP", () => this.moveSelection(-1));
    this.input.keyboard.on("keydown-DOWN", () => this.moveSelection(1));
    this.input.keyboard.on("keydown-LEFT", () => this.adjustValue(-1));
    this.input.keyboard.on("keydown-RIGHT", () => this.adjustValue(1));
    this.input.keyboard.on("keydown-Q", () => this.adjustValue(-16));
    this.input.keyboard.on("keydown-E", () => this.adjustValue(16));
  }

  moveSelection(delta) {
    if (this.isComplete) return;

    this.selectedSlot = Phaser.Math.Clamp(
      this.selectedSlot + delta,
      0,
      this.memorySlots.length - 1,
    );
    this.updateSelection();
    if (this.soundManager) this.soundManager.playTerminalKey();
  }

  adjustValue(delta) {
    if (this.isComplete) return;

    const slot = this.memorySlots[this.selectedSlot];
    slot.current = (slot.current + delta + 256) % 256; // Wrap around 0-255
    this.updateSlotDisplay(this.selectedSlot);
    if (this.soundManager) this.soundManager.playTerminalKey();
  }

  formatHex(value, digits) {
    return value.toString(16).toUpperCase().padStart(digits, "0");
  }

  createTimer(content) {
    this.timerText = this.add
      .text(
        content.width / 2 - 20,
        content.y - content.height / 2 + 25,
        this.formatTime(this.timeRemaining),
        { 
          fontFamily: "VT323", 
          fontSize: "24px", 
          color: "#00ff00",
          padding: { x: 5, y: 5 }
        },
      )
      .setOrigin(1, 0.5);
    this.monitor.add(this.timerText);

    // Timer Event
    this.timerEvent = this.time.addEvent({
      delay: 100,
      callback: this.updateTimer,
      callbackScope: this,
      loop: true,
    });
  }

  updateTimer() {
    if (this.isComplete) return;

    this.timeRemaining -= 100;
    this.timerText.setText(this.formatTime(this.timeRemaining));

    if (this.timeRemaining <= 10000) {
      this.timerText.setColor("#ff0000");
    }

    if (this.timeRemaining <= 0) {
      this.timerEvent.remove();
      this.endGame(false);
    }
  }

  formatTime(ms) {
    const seconds = Math.ceil(ms / 1000);
    return `${seconds}s`;
  }

  endGame(success) {
    this.isComplete = true;
    if (this.timerEvent) this.timerEvent.remove();

    if (success) {
      this.monitor.showSuccess("MEMORY PATCHED");
      this.statusText.setText("ALL VALUES MATCHED");
      this.statusText.setColor("#00ff00");
      this.soundManager.playSuccess();
    } else {
      this.monitor.showError("TIMEOUT");
      this.statusText.setText("MEMORY CORRUPT");
      this.statusText.setColor("#ff0000");
      this.soundManager.playError();
    }

    this.time.delayedCall(1500, () => {
      if (this.onResult) this.onResult(success);
      this.scene.stop();
      this.scene.resume("GameScene");
    });
  }
}
