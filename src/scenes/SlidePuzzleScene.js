import { DEPTH } from "../utils/Constants.js";
import { Config } from "../utils/Config.js";
import { getDifficulty } from "../utils/DifficultyConfig.js";

export class SlidePuzzleScene extends Phaser.Scene {
  constructor() {
    super({ key: "SlidePuzzleScene" });
  }

  init(data) {
    this.onResult = data.onResult;

    this.rows = 3;
    this.cols = 3;
    this.tileSize = 100;
    this.spacing = 5;

    this.solvedState = [1, 2, 3, 4, 5, 6, 7, 8, 0];
    this.currentState = [...this.solvedState];

    this.tiles = [];
    this.inputActive = true;
    this.isComplete = false;

    // Timer
    const diff = getDifficulty();
    this.timeLimit = Math.floor(90000 * diff.minigameTimeMultiplier); // 90s base
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

    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    this.add.rectangle(
      centerX,
      centerY,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0.9,
    );
    this.container = this.add.container(centerX, centerY);

    const bg = this.add
      .rectangle(0, 0, 400, 450, 0x222222)
      .setStrokeStyle(4, 0x00ff00);
    this.container.add(bg);

    const title = this.add
      .text(0, -180, "DATA DEFRAG", {
        fontFamily: "monospace",
        fontSize: "24px",
        color: "#00ff00",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.container.add(title);

    // Timer display
    this.timerText = this.add
      .text(165, -180, this.formatTime(this.timeRemaining), {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#00ff00",
      })
      .setOrigin(1, 0.5);
    this.container.add(this.timerText);

    // Timer event
    this.timerEvent = this.time.addEvent({
      delay: 100,
      callback: () => {
        if (this.isComplete) return;
        this.timeRemaining -= 100;
        this.timerText.setText(this.formatTime(this.timeRemaining));
        if (this.timeRemaining <= 10000) this.timerText.setColor("#ff0000");
        if (this.timeRemaining <= 0) {
          this.timerEvent.remove();
          this.inputActive = false;
          this.isComplete = true;
          this.time.delayedCall(800, () => {
            if (this.onResult) this.onResult(false);
            this.scene.stop();
            this.scene.resume("GameScene");
          });
        }
      },
      loop: true,
    });

    this.shufflePuzzle();
    this.createTiles();
  }

  formatTime(ms) {
    return `${Math.ceil(ms / 1000)}s`;
  }

  shufflePuzzle() {
    let emptyIdx = 8;
    let lastIdx = -1;

    for (let i = 0; i < 100; i++) {
      const neighbors = this.getNeighbors(emptyIdx);
      const validNeighbors = neighbors.filter((n) => n !== lastIdx);

      if (validNeighbors.length > 0) {
        const moveIdx = Phaser.Math.RND.pick(validNeighbors);

        [this.currentState[emptyIdx], this.currentState[moveIdx]] = [
          this.currentState[moveIdx],
          this.currentState[emptyIdx],
        ];

        lastIdx = emptyIdx;
        emptyIdx = moveIdx;
      }
    }
  }

  getNeighbors(index) {
    const neighbors = [];
    const row = Math.floor(index / this.cols);
    const col = index % this.cols;

    if (row > 0) neighbors.push(index - this.cols);
    if (row < this.rows - 1) neighbors.push(index + this.cols);
    if (col > 0) neighbors.push(index - 1);
    if (col < this.cols - 1) neighbors.push(index + 1);

    return neighbors;
  }

  createTiles() {
    // Alte Tiles aufräumen
    this.tiles.forEach((t) => t.container.destroy());
    this.tiles = [];

    const startX =
      -((this.cols * (this.tileSize + this.spacing)) / 2) + this.tileSize / 2;
    const startY =
      -((this.rows * (this.tileSize + this.spacing)) / 2) +
      this.tileSize / 2 +
      20;

    this.currentState.forEach((val, index) => {
      if (val === 0) return;

      const row = Math.floor(index / this.cols);
      const col = index % this.cols;

      const x = startX + col * (this.tileSize + this.spacing);
      const y = startY + row * (this.tileSize + this.spacing);

      const tileContainer = this.add.container(x, y);

      // FIX: Das Rechteck ist jetzt interactive, nicht der Container
      const rect = this.add
        .rectangle(0, 0, this.tileSize, this.tileSize, 0x003300)
        .setStrokeStyle(2, 0x00ff00)
        .setInteractive({ useHandCursor: true });

      // Klick Event direkt am Rechteck
      rect.on("pointerdown", () => this.handleTileClick(index));

      const text = this.add
        .text(0, 0, String(val), {
          fontFamily: "monospace",
          fontSize: "40px",
          color: "#00ff00",
          fontStyle: "bold",
        })
        .setOrigin(0.5);
      // Text muss ignoriert werden für Klicks, damit er den Klick auf rect nicht blockt
      text.inputEnabled = false;

      tileContainer.add([rect, text]);

      this.container.add(tileContainer);
      this.tiles.push({ val, container: tileContainer });
    });
  }

  handleTileClick(index) {
    if (!this.inputActive) return;

    const emptyIdx = this.currentState.indexOf(0);
    const neighbors = this.getNeighbors(emptyIdx);

    if (neighbors.includes(index)) {
      // Swap
      [this.currentState[emptyIdx], this.currentState[index]] = [
        this.currentState[index],
        this.currentState[emptyIdx],
      ];

      // Einfachste Methode: Alles neu zeichnen
      this.createTiles();
      this.checkWin();
    }
  }

  checkWin() {
    const isSolved = this.currentState.every(
      (val, i) => val === this.solvedState[i],
    );

    if (isSolved) {
      this.inputActive = false;
      this.isComplete = true;
      if (this.timerEvent) this.timerEvent.remove();

      this.tiles.forEach((t) => {
        t.container.list[0].setFillStyle(0x00ff00);
        t.container.list[1].setColor("#000000");
      });

      const winText = this.add
        .text(0, 200, "DEFRAGMENTATION COMPLETE", {
          fontFamily: "monospace",
          fontSize: "20px",
          color: "#00ff00",
          backgroundColor: "#000",
        })
        .setOrigin(0.5);
      this.container.add(winText);

      this.time.delayedCall(1500, () => {
        if (this.onResult) this.onResult(true);
        this.scene.stop();
        this.scene.resume("GameScene");
      });
    }
  }
}
