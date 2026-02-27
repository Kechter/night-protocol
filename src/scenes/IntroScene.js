/**
 * IntroScene
 * Terminal-Stil Intro mit Typewriter-Effekt.
 * Klick WÄHREND Typewriter → zeigt Text sofort (skip animation).
 * Klick NACH vollständigem Text → startet das Spiel.
 */
export class IntroScene extends Phaser.Scene {
  constructor() {
    super({ key: "IntroScene" });
  }

  create() {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;

    this.add.rectangle(W / 2, H / 2, W, H, 0x000000);

    // Scanlines
    const scanlines = this.add.graphics();
    scanlines.fillStyle(0x000000, 0.15);
    for (let y = 0; y < H; y += 4) {
      scanlines.fillRect(0, y, W, 2);
    }

    // Story lines – Student bricht in die Uni ein
    this.lines = [
      { text: "> SYSTEM ZUGRIFF LÄUFT...", color: "#555555", delay: 0 },
      {
        text: "> VERBINDUNG ZU OHM-INTRANET HERGESTELLT",
        color: "#555555",
        delay: 700,
      },
      { text: "", color: "#00ff00", delay: 1100 },
      {
        text: "> NUTZER:  [REDACTED]   MATRIKEL: 12345678",
        color: "#00ff00",
        delay: 1500,
      },
      {
        text: "> STATUS:  Prüfung morgen 08:00 Uhr — Vorbereitung: UNZUREICHEND",
        color: "#ff4444",
        delay: 2200,
      },
      { text: "", color: "#00ff00", delay: 2800 },
      { text: "> LAGEEINSCHÄTZUNG:", color: "#00ccff", delay: 3100 },
      {
        text: "  Alle Klausuren werden im Serverraum OG2 archiviert.",
        color: "#ffffff",
        delay: 3700,
      },
      {
        text: "  Sicherheitcode für Serverraum: unbekannt.",
        color: "#ffffff",
        delay: 4400,
      },
      {
        text: "  Wachpersonal patrouilliert die Flure.",
        color: "#ff8800",
        delay: 5100,
      },
      { text: "", color: "#00ff00", delay: 5600 },
      { text: "> PLAN:", color: "#00ccff", delay: 5900 },
      {
        text: "  Einbruch durch den Südeingang. 02:30 Uhr.",
        color: "#ffffff",
        delay: 6500,
      },
      {
        text: "  Terminals hacken — Türen öffnen und Wächter ablenken.",
        color: "#ffffff",
        delay: 7200,
      },
      {
        text: "  Klausur finden. Kopieren. Verschwinden.",
        color: "#ffffff",
        delay: 7900,
      },
      { text: "  Keine Spuren hinterlassen.", color: "#ff4444", delay: 8500 },
      { text: "", color: "#00ff00", delay: 9000 },
      {
        text: "> WARNUNG: Wenn ein Wächter dich entdeckt — GAME OVER.",
        color: "#ff8800",
        delay: 9400,
      },
      { text: "", color: "#00ff00", delay: 10000 },
      {
        text: "> VIEL ERFOLG. LASS DICH NICHT ERWISCHEN.",
        color: "#00ff00",
        delay: 10400,
      },
    ];

    // Total typewriter duration (last delay + ~time to type last line)
    this.TOTAL_DURATION = 11800;

    // Create text objects (initially empty)
    this.textObjects = [];
    const startX = 80;
    const startY = 60;
    const lineH = 36;

    this.lines.forEach((line, i) => {
      const txt = this.add.text(startX, startY + i * lineH, "", {
        fontFamily: "monospace",
        fontSize: "22px",
        color: line.color,
      });
      this.textObjects.push(txt);
    });

    // "Klick zum Starten" hint — only shown after text is complete
    this.clickHint = this.add
      .text(W / 2, H - 55, "[LINKSKLICK]  Zum Starten", {
        fontFamily: "monospace",
        fontSize: "20px",
        color: "#00ff00",
      })
      .setOrigin(0.5)
      .setAlpha(0);

    // Blinking tween for hint (starts invisible, plays after text done)
    this.hintTween = this.tweens.add({
      targets: this.clickHint,
      alpha: { from: 0, to: 1 },
      duration: 600,
      yoyo: true,
      repeat: -1,
      paused: true,
    });

    // Skip hint while typewriter is running
    this.skipText = this.add
      .text(W / 2, H - 40, "[KLICK]  Text überspringen", {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#444444",
      })
      .setOrigin(0.5);

    // State
    this.isDone = false; // true once we start transitioning to GameScene
    this.textReady = false; // true once all text is fully displayed

    // Schedule typewriter lines
    this.timerEvents = [];
    this.lines.forEach((line, i) => {
      const ev = this.time.delayedCall(line.delay, () => {
        if (!this.textReady) this.typewriteLine(i, line.text);
      });
      this.timerEvents.push(ev);
    });

    // When all text is done → show click hint
    this.time.delayedCall(this.TOTAL_DURATION, () => this.onTextComplete());

    // Input: click/tap
    this.input.on("pointerdown", () => this.onPointerDown());
  }

  onPointerDown() {
    if (this.isDone) return;

    if (!this.textReady) {
      // First click: skip animation, show all text instantly
      this.showAllTextInstantly();
    } else {
      // Second click (after text is done): start game
      this.startGame();
    }
  }

  showAllTextInstantly() {
    this.textReady = true;

    // Cancel all pending timers
    this.timerEvents.forEach((ev) => {
      if (ev) ev.remove(false);
    });

    // Show all lines immediately
    this.lines.forEach((line, i) => {
      this.textObjects[i].setText(line.text);
    });

    this.skipText.setVisible(false);
    this.onTextComplete();
  }

  onTextComplete() {
    if (this.isDone) return;
    this.textReady = true;

    this.skipText.setVisible(false);
    this.clickHint.setAlpha(0);
    this.hintTween.resume();
  }

  typewriteLine(lineIndex, fullText) {
    const txt = this.textObjects[lineIndex];
    let charIndex = 0;

    this.time.addEvent({
      delay: 25,
      repeat: fullText.length - 1,
      callback: () => {
        charIndex++;
        txt.setText(fullText.substring(0, charIndex));
      },
    });
  }

  startGame() {
    if (this.isDone) return;
    this.isDone = true;
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.start("GameScene");
      this.scene.launch("UIScene");
    });
  }
}
