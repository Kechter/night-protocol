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

    // ── Monitor frame ─────────────────────────────────────────
    this.monitor = new PCMonitorFrame(this, "PASSWORD CRACKER v3.0");
    this.monitor.create();

    // ── Layout constants ──────────────────────────────────────
    const CW = 565; // content width
    const CH = 385; // content height
    const CY = 10; // content center y
    const TOP = CY - CH / 2 + 8; // ≈ -174
    const BOT = CY + CH / 2 - 8; // ≈ +185

    // Column split at x=40
    const DIVX = 40;
    const LOG_X = -CW / 2 + 110; // left column centre ≈ -172
    const PAD_X = DIVX + (CW / 2 - DIVX) / 2; // right column centre ≈ +155

    // Button metrics
    const BTN = 34;
    const GAP = 4;
    const STEP = BTN + GAP; // 38

    // Right column Y positions (left room for bigger label + status)
    const LEGEND_Y = TOP + 8; // header legend
    const STATUS_Y = TOP + 30; // "X VERSUCHE ÜBRIG"
    const INPUT_Y = TOP + 72; // input box centre
    const NP_TOP = INPUT_Y + 36; // numpad row-0 centre

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

    // Column legend  ●green = richtig,  ●yellow = falsche Stelle
    this.monitor.add(
      this.add
        .text(LOG_X, TOP + 32, "● richtig   ● falsche Stelle", {
          fontFamily: "monospace",
          fontSize: "12px",
          color: "#336633",
        })
        .setOrigin(0.5, 0),
    );

    // Vertical divider
    const dvg = this.add.graphics();
    dvg.lineStyle(1, 0x003300, 1);
    dvg.lineBetween(DIVX, TOP, DIVX, BOT);
    this.monitor.add(dvg);

    // ── RIGHT column header ───────────────────────────────────
    this.monitor.add(
      this.add
        .text(
          PAD_X,
          LEGEND_Y,
          "Stelle \u25cf = richtig   Ziffer \u25cf = falsch",
          {
            fontFamily: "monospace",
            fontSize: "13px",
            color: "#666666",
          },
        )
        .setOrigin(0.5, 0),
    );

    // Attempt counter
    this.statusText = this.add
      .text(PAD_X, STATUS_Y, `${this.maxAttempts} VERSUCHE \u00dcBRIG`, {
        fontFamily: "monospace",
        fontSize: "18px",
        color: "#ffff00",
      })
      .setOrigin(0.5, 0);
    this.monitor.add(this.statusText);

    // ── Input display ─────────────────────────────────────────
    const inputBg = this.add
      .rectangle(PAD_X, INPUT_Y, BTN * 4 + GAP * 3, BTN + 4, 0x002200)
      .setStrokeStyle(2, 0x00ff00);
    this.monitor.add(inputBg);

    this.inputTexts = [];
    for (let i = 0; i < this.codeLength; i++) {
      const x = PAD_X - (BTN * 1.5 + GAP * 1.5) + i * STEP;
      const t = this.add
        .text(x, INPUT_Y, "_", {
          fontFamily: "monospace",
          fontSize: "22px",
          color: "#00ff00",
        })
        .setOrigin(0.5);
      this.inputTexts.push(t);
      this.monitor.add(t);
    }

    // ── 3×3 Numpad ────────────────────────────────────────────
    const NP_LEFT = PAD_X - STEP; // left column centre of 3-wide grid

    // Digits 1–9
    for (let i = 1; i <= 9; i++) {
      const col = (i - 1) % 3;
      const row = Math.floor((i - 1) / 3);
      this.makeBtn(
        NP_LEFT + col * STEP,
        NP_TOP + row * STEP,
        BTN,
        i.toString(),
        () => this.addDigit(i),
      );
    }

    // 0 centred below 8
    this.makeBtn(NP_LEFT + STEP, NP_TOP + 3 * STEP, BTN, "0", () =>
      this.addDigit(0),
    );

    // CLR below 9
    this.makeColorBtn(
      NP_LEFT + 2 * STEP,
      NP_TOP + 3 * STEP,
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
      NP_TOP + STEP,
      BTN - 4,
      BTN * 2 + GAP,
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

      // Code digits  (plain numbers, evenly spaced)
      attempt.code.forEach((digit, di) => {
        this.attemptsContainer.add(
          this.add
            .text(-70 + di * 28, y, digit.toString(), {
              fontFamily: "monospace",
              fontSize: "18px",
              color: "#00ff00",
            })
            .setOrigin(0.5, 0.5),
        );
      });

      // Vertical separator
      this.attemptsContainer.add(
        this.add
          .text(58, y, "|", {
            fontFamily: "monospace",
            fontSize: "15px",
            color: "#1a4d1a",
          })
          .setOrigin(0.5, 0.5),
      );

      // 4 pip dots
      for (let pip = 0; pip < this.codeLength; pip++) {
        let color;
        if (pip < attempt.correctPosition) {
          color = "#00ff00";
        } else if (pip < attempt.correctPosition + attempt.correctDigit) {
          color = "#ffdd00";
        } else {
          color = "#1c3d1c";
        }
        this.attemptsContainer.add(
          this.add
            .text(72 + pip * 20, y, "\u25cf", {
              fontFamily: "monospace",
              fontSize: "18px",
              color,
            })
            .setOrigin(0.5, 0.5),
        );
      }
    });
  }

  // ──────────────────────────────────────────────────────────────
  // Input / game logic
  // ──────────────────────────────────────────────────────────────

  updateInputDisplay() {
    this.inputTexts.forEach((t, i) =>
      t.setText(
        i < this.currentInput.length ? this.currentInput[i].toString() : "_",
      ),
    );
  }

  addDigit(digit) {
    if (this.isComplete || this.currentInput.length >= this.codeLength) return;
    this.currentInput.push(digit);
    this.updateInputDisplay();
  }

  clearInput() {
    if (this.isComplete) return;
    this.currentInput = [];
    this.updateInputDisplay();
  }

  submitAttempt() {
    if (this.isComplete || this.currentInput.length !== this.codeLength) return;

    const result = this.calculateHints(this.currentInput);
    this.attempts.push({
      code: [...this.currentInput],
      correctPosition: result.correctPosition,
      correctDigit: result.correctDigit,
    });

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

    this.currentInput = [];
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
