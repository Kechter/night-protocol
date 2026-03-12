import { DEPTH } from "../utils/Constants.js";
import { Config } from "../utils/Config.js";
import { getDifficulty } from "../utils/DifficultyConfig.js";
import { PCMonitorFrame } from "../ui/PCMonitorFrame.js";

/**
 * PasswordCrackScene – Mastermind-Style Passwort-Knacker
 *
 * Monitor: 620×480, Content: 565×385, center at (0, 10).
 * cTop ≈ -182   cBot ≈ +192   cLeft ≈ -282   cRight ≈ +282
 * Left column (attempt log): x ≈ -100
 * Right column (input + numpad): x ≈ +155
 */
export class PasswordCrackScene extends Phaser.Scene {
  constructor() {
    super({ key: "PasswordCrackScene" });
  }

  init(data) {
    this.onResult = data.onResult;
    this.secretCode = [];
    this.currentInput = [];
    this.attempts = [];
    const diff = getDifficulty();
    this.maxAttempts = diff.passwordAttempts;
    this.codeLength = 4;
    this.isComplete = false;

    // Easy-mode lock-in: tracks which positions are locked as correct
    const diffKey = window.__NP_DIFFICULTY__ || "normal";
    this.isEasyMode = diffKey === "easy";
    this.lockedDigits = new Array(this.codeLength).fill(null);
  }

  create() {
    // ── Skip mode ─────────────────────────────────────────────
    if (Config.skipMinigames) {
      this.time.delayedCall(100, () => {
        if (this.onResult) this.onResult(true);
        this.scene.stop();
        this.scene.resume("GameScene");
      });
      return;
    }

    // ── Monitor frame (larger for better readability) ─────────
    this.monitor = new PCMonitorFrame(this, "PASSWORD CRACKER v3.0", {
      width: 740,
      height: 560,
    });
    this.monitor.create();

    // ── Use actual content area from monitor ─────────────────
    const content = this.monitor.getContentArea();
    const TOP = content.y - content.height / 2;
    const BOT = content.y + content.height / 2;

    // Column split: left 45% = attempt log, right 55% = controls
    const DIVX = -content.width / 2 + content.width * 0.45;
    const LOG_X = (-content.width / 2 + DIVX) / 2;
    const PAD_LEFT = DIVX + 12;
    const PAD_RIGHT = content.width / 2 - 8;
    const PAD_X = (PAD_LEFT + PAD_RIGHT) / 2;

    // Button metrics
    const BTN = 38;
    const BTN_GAP = 4;
    const STEP = BTN + BTN_GAP;
    const SECTION_GAP = 10;

    // ── LEFT column: "ATTEMPT LOG" header ────────────────────
    this.monitor.add(
      this.add
        .text(LOG_X, TOP + 10, "ATTEMPT LOG", {
          fontFamily: "monospace",
          fontSize: "16px",
          color: "#888888",
        })
        .setOrigin(0.5, 0),
    );

    // Column legend - properly colored
    const legendGreen = this.add
      .text(LOG_X - 70, TOP + 32, "\u25cf richtig", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#00ff00",
      })
      .setOrigin(0, 0);
    const legendYellow = this.add
      .text(LOG_X + 10, TOP + 32, "\u25cf falsche Stelle", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#ffdd00",
      })
      .setOrigin(0, 0);
    this.monitor.add(legendGreen);
    this.monitor.add(legendYellow);

    // Vertical divider
    const dvg = this.add.graphics();
    dvg.lineStyle(1, 0x003300, 1);
    dvg.lineBetween(DIVX, TOP, DIVX, BOT);
    this.monitor.add(dvg);

    // ═══════════════════════════════════════════════════════════
    // RIGHT column: cursor-based vertical stack layout
    // Each element is placed at cursorY (top edge), then
    // cursorY advances by the element's full height + gap.
    // This makes overlap IMPOSSIBLE regardless of font size.
    // ═══════════════════════════════════════════════════════════
    let cursorY = TOP + 8;

    // ─── 1. Rules block ──────────────────────────────────────
    const rulesLines = [
      "REGELN:",
      "Jede Ziffer kommt nur 1x im Code vor.",
      "",
      "\u25a0 Gr\u00fcn  = richtige Stelle",
      "\u25a0 Gelb  = falsche Stelle",
      "\u25a0 Grau  = nicht im Code",
    ];
    if (this.isEasyMode) {
      rulesLines.push("\u2605 Richtige werden fixiert!");
    }
    const rulesText = this.add
      .text(PAD_X, cursorY, rulesLines.join("\n"), {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#668866",
        lineSpacing: 2,
      })
      .setOrigin(0.5, 0);
    this.monitor.add(rulesText);
    cursorY += rulesText.height + SECTION_GAP;

    // ─── 2. Separator line ───────────────────────────────────
    const sepG = this.add.graphics();
    sepG.lineStyle(1, 0x003300, 0.5);
    sepG.lineBetween(PAD_LEFT, cursorY, PAD_RIGHT, cursorY);
    this.monitor.add(sepG);
    cursorY += SECTION_GAP;

    // ─── 3. Status text ──────────────────────────────────────
    this.statusText = this.add
      .text(PAD_X, cursorY, `${this.maxAttempts} VERSUCHE \u00dcBRIG`, {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#ffff00",
      })
      .setOrigin(0.5, 0);
    this.monitor.add(this.statusText);
    cursorY += this.statusText.height + SECTION_GAP;

    // ─── 4. Input display (4 digit slots) ────────────────────
    const INPUT_H = BTN;
    const INPUT_W = STEP * 4 - BTN_GAP;
    const inputCenterY = cursorY + INPUT_H / 2;
    const inputBg = this.add
      .rectangle(PAD_X, inputCenterY, INPUT_W, INPUT_H, 0x002200)
      .setStrokeStyle(2, 0x00ff00);
    this.monitor.add(inputBg);

    this.inputTexts = [];
    for (let i = 0; i < this.codeLength; i++) {
      const x = PAD_X - (STEP * 1.5 - BTN_GAP / 2) + i * STEP;
      const t = this.add
        .text(x, inputCenterY, "_", {
          fontFamily: "monospace",
          fontSize: "20px",
          color: "#00ff00",
        })
        .setOrigin(0.5);
      this.inputTexts.push(t);
      this.monitor.add(t);
    }
    cursorY += INPUT_H + SECTION_GAP;

    // ─── 5. Numpad (3×3 + bottom row) ────────────────────────
    const NP_LEFT = PAD_X - STEP;

    for (let i = 1; i <= 9; i++) {
      const col = (i - 1) % 3;
      const row = Math.floor((i - 1) / 3);
      const bx = NP_LEFT + col * STEP;
      const by = cursorY + BTN / 2 + row * STEP;
      this.makeBtn(bx, by, BTN, i.toString(), () => this.addDigit(i));
    }

    // 0 centred below 8
    this.makeBtn(NP_LEFT + STEP, cursorY + BTN / 2 + 3 * STEP, BTN, "0", () =>
      this.addDigit(0),
    );

    // CLR below 9
    this.makeColorBtn(
      NP_LEFT + 2 * STEP,
      cursorY + BTN / 2 + 3 * STEP,
      BTN,
      BTN,
      "CLR",
      0x330000,
      0x880000,
      "#ff4444",
      () => this.clearInput(),
    );

    // OK — tall button to the right of the 3×3 grid
    this.makeColorBtn(
      NP_LEFT + 3 * STEP + 4,
      cursorY + BTN / 2 + STEP,
      BTN - 4,
      BTN * 2 + BTN_GAP,
      "OK",
      0x003300,
      0x008800,
      "#00ff00",
      () => this.submitAttempt(),
    );

    // ── Attempt container (left column) ──────────────────────
    this.attemptsContainer = this.add.container(LOG_X, TOP + 56);
    this.monitor.add(this.attemptsContainer);

    // ── Generate secret code ──────────────────────────────────
    this.generateSecretCode();
  }

  // ──────────────────────────────────────────────────────────────
  // Button helpers
  // ──────────────────────────────────────────────────────────────

  makeBtn(x, y, w, label, cb) {
    const btn = this.add
      .rectangle(x, y, w, w, 0x004400)
      .setStrokeStyle(1, 0x00aa00)
      .setInteractive({ useHandCursor: true });
    btn.on("pointerover", () => btn.setFillStyle(0x006600));
    btn.on("pointerout", () => btn.setFillStyle(0x004400));
    btn.on("pointerdown", cb);
    this.monitor.add(btn);
    this.monitor.add(
      this.add
        .text(x, y, label, {
          fontFamily: "monospace",
          fontSize: "18px",
          color: "#00ff00",
        })
        .setOrigin(0.5),
    );
  }

  makeColorBtn(x, y, w, h, label, fillNorm, fillHover, textColor, cb) {
    const btn = this.add
      .rectangle(x, y, w, h, fillNorm)
      .setStrokeStyle(1, fillHover)
      .setInteractive({ useHandCursor: true });
    btn.on("pointerover", () => btn.setFillStyle(fillHover));
    btn.on("pointerout", () => btn.setFillStyle(fillNorm));
    btn.on("pointerdown", cb);
    this.monitor.add(btn);
    this.monitor.add(
      this.add
        .text(x, y, label, {
          fontFamily: "monospace",
          fontSize: "15px",
          color: textColor,
        })
        .setOrigin(0.5),
    );
  }

  // ──────────────────────────────────────────────────────────────
  // Code generation
  // ──────────────────────────────────────────────────────────────

  generateSecretCode() {
    this.secretCode = [];
    const pool = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (let i = 0; i < this.codeLength; i++) {
      const idx = Phaser.Math.Between(0, pool.length - 1);
      this.secretCode.push(pool[idx]);
      pool.splice(idx, 1);
    }
    console.log("Secret:", this.secretCode.join(""));
  }

  // ──────────────────────────────────────────────────────────────
  // Attempt log
  // ──────────────────────────────────────────────────────────────

  updateAttemptsDisplay() {
    this.attemptsContainer.removeAll(true);

    this.attempts.forEach((attempt, index) => {
      const y = index * 30;

      // Row number
      this.attemptsContainer.add(
        this.add
          .text(-100, y, `${index + 1}.`, {
            fontFamily: "monospace",
            fontSize: "15px",
            color: "#555555",
          })
          .setOrigin(0, 0.5),
      );

      // Wordle-style per-position feedback: colored backgrounds behind digits
      attempt.code.forEach((digit, di) => {
        const posX = -70 + di * 30;
        const hint = attempt.positionHints[di];

        // Background color per hint
        let bgColor;
        if (hint === "green") {
          bgColor = 0x006600;
        } else if (hint === "yellow") {
          bgColor = 0x665500;
        } else {
          bgColor = 0x1a1a1a;
        }

        const bg = this.add
          .rectangle(posX, y, 26, 26, bgColor)
          .setStrokeStyle(
            1,
            hint === "green"
              ? 0x00ff00
              : hint === "yellow"
                ? 0xffdd00
                : 0x333333,
          );
        this.attemptsContainer.add(bg);

        // Digit text
        const textColor =
          hint === "green"
            ? "#00ff00"
            : hint === "yellow"
              ? "#ffdd00"
              : "#666666";
        this.attemptsContainer.add(
          this.add
            .text(posX, y, digit.toString(), {
              fontFamily: "monospace",
              fontSize: "18px",
              color: textColor,
              fontStyle: hint === "green" ? "bold" : "normal",
            })
            .setOrigin(0.5, 0.5),
        );
      });
    });
  }

  // ──────────────────────────────────────────────────────────────
  // Input / game logic
  // ──────────────────────────────────────────────────────────────

  updateInputDisplay() {
    this.inputTexts.forEach((t, i) => {
      if (this.lockedDigits[i] !== null) {
        // Locked digit: show in green bold
        t.setText(this.lockedDigits[i].toString());
        t.setColor("#00ff00");
        t.setFontStyle("bold");
      } else if (
        this.currentInput[i] !== null &&
        this.currentInput[i] !== undefined
      ) {
        t.setText(this.currentInput[i].toString());
        t.setColor("#00ff00");
        t.setFontStyle("normal");
      } else {
        t.setText("_");
        t.setColor("#00ff00");
        t.setFontStyle("normal");
      }
    });
  }

  addDigit(digit) {
    if (this.isComplete) return;
    // Find first unlocked empty slot
    let slot = -1;
    for (let i = 0; i < this.codeLength; i++) {
      if (
        this.lockedDigits[i] === null &&
        (this.currentInput[i] === null || this.currentInput[i] === undefined)
      ) {
        slot = i;
        break;
      }
    }
    if (slot === -1) return; // All slots filled
    this.currentInput[slot] = digit;
    this.updateInputDisplay();
  }

  clearInput() {
    if (this.isComplete) return;
    // Only clear unlocked positions
    this.currentInput = [];
    for (let i = 0; i < this.codeLength; i++) {
      this.currentInput.push(this.lockedDigits[i]);
    }
    this.updateInputDisplay();
  }

  submitAttempt() {
    if (this.isComplete) return;
    // Check all slots are filled (not null/undefined)
    const allFilled =
      this.currentInput.length === this.codeLength &&
      this.currentInput.every((d) => d !== null && d !== undefined);
    if (!allFilled) return;

    const result = this.calculateHints(this.currentInput);
    const posHints = this.calculateHintsPerPosition(this.currentInput);
    this.attempts.push({
      code: [...this.currentInput],
      correctPosition: result.correctPosition,
      correctDigit: result.correctDigit,
      positionHints: posHints,
    });

    // Easy-mode: lock in correct-position digits
    if (this.isEasyMode) {
      for (let i = 0; i < this.codeLength; i++) {
        if (posHints[i] === "green" && this.lockedDigits[i] === null) {
          this.lockedDigits[i] = this.currentInput[i];
        }
      }
    }

    this.updateAttemptsDisplay();

    const remaining = this.maxAttempts - this.attempts.length;
    this.statusText.setText(`${remaining} VERSUCHE \u00dcBRIG`);

    if (result.correctPosition === this.codeLength) {
      this.endGame(true);
      return;
    }
    if (this.attempts.length >= this.maxAttempts) {
      this.endGame(false);
      return;
    }

    // Pre-fill locked digits for next attempt
    this.currentInput = [];
    for (let i = 0; i < this.codeLength; i++) {
      this.currentInput.push(this.lockedDigits[i]);
    }
    this.updateInputDisplay();
  }

  calculateHints(input) {
    let correctPosition = 0;
    let correctDigit = 0;
    const sc = [...this.secretCode];
    const ic = [...input];

    // Pass 1: exact matches
    for (let i = 0; i < this.codeLength; i++) {
      if (ic[i] === sc[i]) {
        correctPosition++;
        sc[i] = -1;
        ic[i] = -2;
      }
    }
    // Pass 2: right digit, wrong position
    for (let i = 0; i < this.codeLength; i++) {
      if (ic[i] === -2) continue;
      const fi = sc.indexOf(ic[i]);
      if (fi !== -1) {
        correctDigit++;
        sc[fi] = -1;
      }
    }
    return { correctPosition, correctDigit };
  }

  /**
   * Per-position hints: returns array of 'green'|'yellow'|'none' for each digit.
   */
  calculateHintsPerPosition(input) {
    const hints = new Array(this.codeLength).fill("none");
    const sc = [...this.secretCode];
    const ic = [...input];

    // Pass 1: exact matches → green
    for (let i = 0; i < this.codeLength; i++) {
      if (ic[i] === sc[i]) {
        hints[i] = "green";
        sc[i] = -1;
        ic[i] = -2;
      }
    }
    // Pass 2: right digit, wrong position → yellow
    for (let i = 0; i < this.codeLength; i++) {
      if (ic[i] === -2) continue;
      const fi = sc.indexOf(ic[i]);
      if (fi !== -1) {
        hints[i] = "yellow";
        sc[fi] = -1;
      }
    }
    return hints;
  }

  endGame(success) {
    this.isComplete = true;
    if (success) {
      this.monitor.showSuccess("ACCESS GRANTED");
      this.statusText.setText("GEKNACKT!").setColor("#00ff00");
    } else {
      this.statusText
        .setText(`CODE WAR: ${this.secretCode.join("")}`)
        .setColor("#ff0000");
      this.monitor.showError("MAXIMUM ATTEMPTS");
    }
    this.time.delayedCall(1500, () => {
      if (this.onResult) this.onResult(success);
      this.scene.stop();
      this.scene.resume("GameScene");
    });
  }
}
