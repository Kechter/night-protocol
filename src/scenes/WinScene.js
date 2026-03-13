import { getDifficulty } from "../utils/DifficultyConfig.js";
import { lootLocker } from "../utils/LootLockerBackend.js";

/**
 * WinScene - Wird aufgerufen wenn der Mainframe gehackt wurde.
 */
export class WinScene extends Phaser.Scene {
  constructor() {
    super({ key: "WinScene" });
  }

  init(data) {
    this.stats = data || {};
  }

  create() {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;
    const diff = getDifficulty();

    // Background
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000);

    // Scanlines
    const scanlines = this.add.graphics();
    scanlines.fillStyle(0x000000, 0.15);
    for (let y = 0; y < H; y += 4) {
      scanlines.fillRect(0, y, W, 2);
    }

    // Lines to print
    const lines = [
      { text: "> ZUGANG SERVERRAUM OG2: GEWÄHRT", color: "#555555" },
      { text: "> KLAUSURDATENBANK: GEFUNDEN", color: "#00ff00" },
      { text: "> KOPIERVORGANG ABGESCHLOSSEN", color: "#00ff00" },
      { text: "", color: "#ffffff" },
      { text: "┌─────────────────────────────────┐", color: "#004400" },
      { text: "│                                 │", color: "#004400" },
      { text: "│      MISSION: ERFOLGREICH       │", color: "#00ff00" },
      { text: "│                                 │", color: "#004400" },
      { text: "└─────────────────────────────────┘", color: "#004400" },
      { text: "", color: "#ffffff" },
      { text: `> Schwierigkeit: ${diff.label}`, color: diff.colorHex },
      { text: "", color: "#ffffff" },
      { text: "> Keine Spuren hinterlassen.", color: "#555555" },
      { text: "> Du verschwindest unbemerkt.", color: "#555555" },
    ];

    if (this.stats.finalTime) {
      lines.push({ text: "", color: "#ffffff" });
      lines.push({ 
        text: `> ABSCHLUSSZEIT: ${lootLocker.formatTime(this.stats.finalTime)}`, 
        color: "#ffff00" 
      });
      lines.push({ text: "> NEUER HIGHSCORE!", color: "#00ffff" });
    }

    const startY = 180;
    const lineH = 36;

    lines.forEach((line, i) => {
      this.time.delayedCall(i * 180, () => {
        this.add
          .text(W / 2, startY + i * lineH, line.text, {
            fontFamily: "monospace",
            fontSize: "22px",
            color: line.color,
          })
          .setOrigin(0.5)
          .setAlpha(0);

        // Fade in each line
        this.tweens.add({
          targets: this.children.getAll().at(-1),
          alpha: 1,
          duration: 300,
        });
      });
    });

    // Replay button
    const totalDelay = lines.length * 180 + 800;
    this.time.delayedCall(totalDelay, () => {
      const btn = this.add
        .text(W / 2, H - 80, "[ NOCHMAL SPIELEN ]", {
          fontFamily: "monospace",
          fontSize: "22px",
          color: "#00ff00",
          backgroundColor: "#001100",
          padding: { x: 20, y: 10 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .setAlpha(0);

      this.tweens.add({ targets: btn, alpha: 1, duration: 400 });

      btn.on("pointerover", () => btn.setColor("#ffffff"));
      btn.on("pointerout", () => btn.setColor("#00ff00"));
      btn.on("pointerdown", () => {
        this.cameras.main.fadeOut(400, 0, 0, 0);
        this.cameras.main.once("camerafadeoutcomplete", () => {
          this.scene.stop("WinScene");
          this.scene.stop("UIScene");
          this.scene.start("DifficultySelectScene");
        });
      });

      // ESC also restarts
      this.input.keyboard.once("keydown-ESC", () => btn.emit("pointerdown"));
      this.input.keyboard.once("keydown-ENTER", () => btn.emit("pointerdown"));
    });

    if (this.stats.finalTime) {
      this.time.delayedCall(totalDelay - 400, () => {
        this.createNameEntry(W / 2, H / 2 + 150);
      });
    }
  }

  createNameEntry(x, y) {
    this.playerName = "HACKER";
    
    const label = this.add.text(x, y, "DEIN INITIALEN: ", {
      fontFamily: "monospace",
      fontSize: "20px",
      color: "#888888"
    }).setOrigin(1, 0.5);

    const nameText = this.add.text(x + 10, y, this.playerName, {
      fontFamily: "monospace",
      fontSize: "30px",
      color: "#00ff00",
      backgroundColor: "#002200",
      padding: { x: 10, y: 5 }
    }).setOrigin(0, 0.5);

    // Cursor effect
    this.time.addEvent({
      delay: 500,
      callback: () => {
        if (nameText.active) {
            const current = nameText.text;
            if (current.endsWith("_")) nameText.setText(current.slice(0, -1));
            else nameText.setText(current + "_");
        }
      },
      loop: true
    });

    const submitBtn = this.add.text(x + 300, y, "[ SUBMIT ]", {
        fontFamily: "monospace",
        fontSize: "22px",
        color: "#00ffff",
        backgroundColor: "#002222",
        padding: { x: 15, y: 8 }
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });

    submitBtn.on("pointerdown", async () => {
        const finalName = nameText.text.replace("_", "").trim() || "ANON";
        submitBtn.setText("[ SAVING... ]").disableInteractive();
        
        // 1. Set Name
        await lootLocker.setPlayerName(finalName);

        // 2. Submit Score
        // (Leaderboard IDs would be configured in reality)
        const diffId = getDifficulty().id;
        await lootLocker.submitScore(diffId, this.stats.finalTime);

        submitBtn.setText("[ SAVED! ]").setColor("#00ff00");
        this.time.delayedCall(1000, () => {
            this.scene.start("LeaderboardScene");
        });
    });

    // Keyboard Input for name
    this.input.keyboard.on("keydown", (event) => {
        if (event.keyCode === 8 && this.playerName.length > 0) {
            this.playerName = this.playerName.slice(0, -1);
        } else if (event.key.length === 1 && this.playerName.length < 12) {
            this.playerName += event.key.toUpperCase();
        }
        nameText.setText(this.playerName);
    });
  }
}
