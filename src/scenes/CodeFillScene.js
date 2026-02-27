import { DEPTH } from "../utils/Constants.js";
import { Config } from "../utils/Config.js";
import { getDifficulty } from "../utils/DifficultyConfig.js";
import { PCMonitorFrame } from "../ui/PCMonitorFrame.js";

/**
 * CodeFillScene - Code Completion Minigame
 * Der Spieler muss fehlende Code-Teile korrekt ergänzen
 */
export class CodeFillScene extends Phaser.Scene {
  constructor() {
    super({ key: "CodeFillScene" });
  }

  init(data) {
    this.onResult = data.onResult;

    // Spielzustand
    this.currentGapIndex = 0;
    this.answers = [];
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
    this.monitor = new PCMonitorFrame(this, "SYSTEM OVERRIDE v2.1");
    this.monitor.create();

    const content = this.monitor.getContentArea();

    // Code Challenge generieren
    this.challenge = this.generateChallenge();

    // Code Block anzeigen
    this.createCodeDisplay(content);

    // Options Buttons
    this.createOptionsPanel(content);

    // Timer anzeigen
    this.createTimer(content);

    // Status Text
    this.statusText = this.add
      .text(
        0,
        content.y + content.height / 2 - 20,
        `GAP 1/${this.challenge.gaps.length}`,
        { fontFamily: "monospace", fontSize: "14px", color: "#ffff00" },
      )
      .setOrigin(0.5);
    this.monitor.add(this.statusText);

    // Highlight erste Lücke
    this.highlightCurrentGap();
  }

  generateChallenge() {
    // Verschiedene Code-Challenges
    const challenges = [
      {
        code: [
          "function unlockDoor(code) {",
          "    const secret = [GAP_0];",
          "    if (code === secret) {",
          "        return [GAP_1];",
          "    }",
          "    return false;",
          "}",
        ],
        gaps: [
          { line: 1, options: ['"OPEN"', '"CLOSE"', "42", "null"], correct: 0 },
          { line: 3, options: ["true", "false", '"yes"', "0"], correct: 0 },
        ],
      },
      {
        code: [
          "const bypass = () => {",
          "    let access = [GAP_0];",
          "    for (let i = 0; i < 3; i++) {",
          "        access [GAP_1] 1;",
          "    }",
          "    return access === 3;",
          "};",
        ],
        gaps: [
          { line: 1, options: ["0", "1", "3", "null"], correct: 0 },
          { line: 3, options: ["+=", "-=", "*=", "/="], correct: 0 },
        ],
      },
      {
        code: [
          "async function hack(target) {",
          "    const result = [GAP_0] fetch(target);",
          "    if (result.status [GAP_1] 200) {",
          '        console.log("SUCCESS");',
          "    }",
          "}",
        ],
        gaps: [
          {
            line: 1,
            options: ["await", "return", "new", "delete"],
            correct: 0,
          },
          { line: 2, options: ["===", "!==", ">", "<"], correct: 0 },
        ],
      },
      {
        code: [
          "class SecurityBypass {",
          "    constructor() {",
          "        this.level = [GAP_0];",
          "    }",
          "    crack() {",
          "        return this.level [GAP_1] 5;",
          "    }",
          "}",
        ],
        gaps: [
          { line: 2, options: ["0", "null", '"max"', "[]"], correct: 0 },
          { line: 5, options: [">=", "<=", "==", "!="], correct: 0 },
        ],
      },
    ];

    return Phaser.Math.RND.pick(challenges);
  }

  createCodeDisplay(content) {
    const startY = content.y - content.height / 2 + 40;
    const lineHeight = 28;

    this.codeTexts = [];
    this.gapButtons = [];

    this.challenge.code.forEach((line, index) => {
      const y = startY + index * lineHeight;

      // Zeilennummer
      const lineNum = this.add
        .text(-content.width / 2 + 10, y, `${index + 1}`, {
          fontFamily: "monospace",
          fontSize: "14px",
          color: "#555555",
        })
        .setOrigin(0, 0.5);
      this.monitor.add(lineNum);

      // Prüfen ob Zeile eine Lücke hat
      if (line.includes("[GAP_")) {
        // Zeile mit Lücke aufteilen
        const gapMatch = line.match(/\[GAP_(\d+)\]/);
        const gapIndex = parseInt(gapMatch[1]);
        const parts = line.split(gapMatch[0]);

        // Vor der Lücke
        const beforeText = this.add
          .text(-content.width / 2 + 40, y, parts[0], {
            fontFamily: "monospace",
            fontSize: "14px",
            color: "#00ff00",
          })
          .setOrigin(0, 0.5);
        this.monitor.add(beforeText);

        // Lücke (klickbar)
        const gapX = beforeText.x + beforeText.width;
        const gapButton = this.add
          .text(gapX, y, "________", {
            fontFamily: "monospace",
            fontSize: "14px",
            color: "#ffff00",
            backgroundColor: "#333300",
            padding: { x: 4, y: 2 },
          })
          .setOrigin(0, 0.5)
          .setInteractive({ useHandCursor: true });

        gapButton.gapIndex = gapIndex;
        gapButton.originalColor = "#ffff00";
        this.gapButtons.push(gapButton);
        this.monitor.add(gapButton);

        // Nach der Lücke
        const afterText = this.add
          .text(gapButton.x + gapButton.width + 4, y, parts[1] || "", {
            fontFamily: "monospace",
            fontSize: "14px",
            color: "#00ff00",
          })
          .setOrigin(0, 0.5);
        this.monitor.add(afterText);
      } else {
        // Normale Code-Zeile
        const codeText = this.add
          .text(-content.width / 2 + 40, y, line, {
            fontFamily: "monospace",
            fontSize: "14px",
            color: "#00ff00",
          })
          .setOrigin(0, 0.5);
        this.monitor.add(codeText);
      }
    });

    // Initialisiere answers Array
    this.answers = new Array(this.challenge.gaps.length).fill(null);
  }

  createOptionsPanel(content) {
    const panelY = content.y + content.height / 2 - 80;

    // Panel Hintergrund
    const panelBg = this.add
      .rectangle(0, panelY, content.width - 20, 60, 0x002200)
      .setStrokeStyle(1, 0x00aa00);
    this.monitor.add(panelBg);

    // Label
    const label = this.add
      .text(-content.width / 2 + 20, panelY - 20, "SELECT VALUE:", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#888888",
      })
      .setOrigin(0, 0.5);
    this.monitor.add(label);

    // Options Container (wird bei Gap-Wechsel aktualisiert)
    this.optionsContainer = this.add.container(0, panelY + 10);
    this.monitor.add(this.optionsContainer);

    this.updateOptionsPanel();
  }

  updateOptionsPanel() {
    // Clear existing options
    this.optionsContainer.removeAll(true);

    if (this.currentGapIndex >= this.challenge.gaps.length) return;

    const gap = this.challenge.gaps[this.currentGapIndex];
    const buttonWidth = 100;
    const spacing = 15;
    const totalWidth =
      gap.options.length * buttonWidth + (gap.options.length - 1) * spacing;
    const startX = -totalWidth / 2 + buttonWidth / 2;

    gap.options.forEach((option, index) => {
      const x = startX + index * (buttonWidth + spacing);

      const btn = this.add
        .text(x, 0, option, {
          fontFamily: "monospace",
          fontSize: "14px",
          color: "#00ff00",
          backgroundColor: "#004400",
          padding: { x: 8, y: 6 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      btn.on("pointerover", () => {
        btn.setBackgroundColor("#006600");
      });

      btn.on("pointerout", () => {
        btn.setBackgroundColor("#004400");
      });

      btn.on("pointerdown", () => {
        this.selectOption(index, option);
      });

      this.optionsContainer.add(btn);
    });
  }

  selectOption(optionIndex, optionText) {
    if (this.isComplete) return;

    const gap = this.challenge.gaps[this.currentGapIndex];
    const isCorrect = optionIndex === gap.correct;

    // Answer speichern
    this.answers[this.currentGapIndex] = {
      selected: optionIndex,
      correct: isCorrect,
      text: optionText,
    };

    // Gap Button aktualisieren
    const gapButton = this.gapButtons.find(
      (b) => b.gapIndex === this.currentGapIndex,
    );
    if (gapButton) {
      gapButton.setText(optionText);
      gapButton.setColor(isCorrect ? "#00ff00" : "#ff6600");
      gapButton.setBackgroundColor(isCorrect ? "#003300" : "#332200");
    }

    // Nächste Lücke oder Ende
    this.currentGapIndex++;

    if (this.currentGapIndex >= this.challenge.gaps.length) {
      this.checkResult();
    } else {
      this.statusText.setText(
        `GAP ${this.currentGapIndex + 1}/${this.challenge.gaps.length}`,
      );
      this.highlightCurrentGap();
      this.updateOptionsPanel();
    }
  }

  highlightCurrentGap() {
    this.gapButtons.forEach((btn, index) => {
      if (btn.gapIndex === this.currentGapIndex) {
        btn.setColor("#ffffff");
        // Blink Animation
        this.tweens.add({
          targets: btn,
          alpha: 0.5,
          duration: 300,
          yoyo: true,
          repeat: -1,
        });
      } else {
        this.tweens.killTweensOf(btn);
        btn.setAlpha(1);
      }
    });
  }

  createTimer(content) {
    this.timerText = this.add
      .text(
        content.width / 2 - 20,
        content.y - content.height / 2 + 20,
        this.formatTime(this.timeRemaining),
        { fontFamily: "monospace", fontSize: "16px", color: "#00ff00" },
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

  checkResult() {
    this.isComplete = true;
    if (this.timerEvent) this.timerEvent.remove();

    // Alle Antworten prüfen
    const allCorrect = this.answers.every((a) => a && a.correct);
    this.endGame(allCorrect);
  }

  endGame(success) {
    this.isComplete = true;

    if (success) {
      this.monitor.showSuccess("CODE COMPILED");
      this.statusText.setText("SYSTEM BYPASSED");
      this.statusText.setColor("#00ff00");
    } else {
      this.monitor.showError("SYNTAX ERROR");
      this.statusText.setText("COMPILATION FAILED");
      this.statusText.setColor("#ff0000");
    }

    this.time.delayedCall(1500, () => {
      if (this.onResult) this.onResult(success);
      this.scene.stop();
      this.scene.resume("GameScene");
    });
  }
}
