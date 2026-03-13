import { lootLocker } from "../utils/LootLockerBackend.js";
import { getSoundManager } from "../utils/SoundManager.js";
import { DIFFICULTY_SETTINGS } from "../utils/DifficultyConfig.js";

/**
 * LeaderboardScene - Displays global highscores per difficulty.
 */
export class LeaderboardScene extends Phaser.Scene {
    constructor() {
        super({ key: "LeaderboardScene" });
    }

    create() {
        const W = this.cameras.main.width;
        const H = this.cameras.main.height;
        this.soundManager = getSoundManager(this);

        // Background
        this.add.rectangle(W / 2, H / 2, W, H, 0x000000);

        // Title
        this.add.text(W / 2, 80, "GLOBAL LEADERBOARD", {
            fontFamily: "monospace",
            fontSize: "48px",
            color: "#00ffff",
            fontStyle: "bold"
        }).setOrigin(0.5);

        this.add.text(W / 2, 130, "────────────────────────────────────────────────", {
            fontFamily: "monospace",
            fontSize: "20px",
            color: "#004444"
        }).setOrigin(0.5);

        // Difficulty Tabs
        this.difficulties = ["easy", "normal", "hard", "hardcore"];
        this.currentDiff = "normal";
        this.createTabs(W / 2, 180);

        // Score Container
        this.scoreContainer = this.add.container(0, 0);
        this.loadScores(this.currentDiff);

        // Back Button
        const backBtn = this.add.text(W / 2, H - 80, "[ ZURÜCK ]", {
            fontFamily: "monospace",
            fontSize: "24px",
            color: "#555555",
            padding: { x: 20, y: 10 }
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

        backBtn.on("pointerover", () => backBtn.setColor("#ffffff"));
        backBtn.on("pointerout", () => backBtn.setColor("#555555"));
        backBtn.on("pointerdown", () => {
            if (this.soundManager) this.soundManager.playClick();
            this.scene.start("DifficultySelectScene");
        });

        // Scanlines
        const scanlines = this.add.graphics();
        scanlines.fillStyle(0x000000, 0.1);
        for (let y = 0; y < H; y += 4) {
            scanlines.fillRect(0, y, W, 2);
        }
    }

    createTabs(x, y) {
        const totalW = 600;
        const startX = x - totalW / 2;
        this.tabButtons = [];

        this.difficulties.forEach((diff, i) => {
            const btnX = startX + i * (totalW / (this.difficulties.length - 1));
            const cfg = DIFFICULTY_SETTINGS[diff];
            
            const btn = this.add.text(btnX, y, cfg.label.toUpperCase(), {
                fontFamily: "monospace",
                fontSize: "20px",
                color: diff === this.currentDiff ? "#ffffff" : "#444444",
                backgroundColor: diff === this.currentDiff ? "#004444" : "#111111",
                padding: { x: 10, y: 5 }
            })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

            btn.on("pointerdown", () => {
                if (this.soundManager) this.soundManager.playClick();
                this.currentDiff = diff;
                this.updateTabs();
                this.loadScores(diff);
            });

            this.tabButtons.push({ btn, diff });
        });
    }

    updateTabs() {
        this.tabButtons.forEach(obj => {
            const isActive = obj.diff === this.currentDiff;
            obj.btn.setColor(isActive ? "#ffffff" : "#444444");
            obj.btn.setBackgroundColor(isActive ? "#004444" : "#111111");
        });
    }

    async loadScores(difficulty) {
        this.scoreContainer.removeAll(true);
        
        const loading = this.add.text(this.cameras.main.width / 2, 400, "DATA RETRIEVAL IN PROGRESS...", {
            fontFamily: "monospace",
            fontSize: "20px",
            color: "#00ffff"
        }).setOrigin(0.5);
        this.scoreContainer.add(loading);

        // Fetch using the difficulty key as leaderboard identifier
        const scores = await lootLocker.getTopScores(difficulty);
        loading.destroy();

        if (scores.length === 0) {
            const none = this.add.text(this.cameras.main.width / 2, 400, "NO DATA FOUND ON SERVER.", {
                fontFamily: "monospace",
                fontSize: "24px",
                color: "#ff0000"
            }).setOrigin(0.5);
            this.scoreContainer.add(none);
            return;
        }

        const W = this.cameras.main.width;
        const startY = 250;
        const rowH = 45;

        scores.forEach((s, i) => {
            const y = startY + i * rowH;
            
            const rank = this.add.text(W / 2 - 250, y, `${i + 1}.`, {
                fontFamily: "monospace",
                fontSize: "24px",
                color: i < 3 ? "#ffff00" : "#888888"
            }).setOrigin(0, 0.5);

            const name = this.add.text(W / 2 - 200, y, s.name, {
                fontFamily: "monospace",
                fontSize: "24px",
                color: "#ffffff"
            }).setOrigin(0, 0.5);

            const timeStr = lootLocker.formatTime(s.score);
            const timeText = this.add.text(W / 2 + 250, y, timeStr, {
                fontFamily: "monospace",
                fontSize: "24px",
                color: "#00ff00"
            }).setOrigin(1, 0.5);

            this.scoreContainer.add([rank, name, timeText]);
        });
    }
}
