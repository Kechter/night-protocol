export class LightingSystem {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.isLightOn = true;

    this.lightRadius = 35;

    this.createLighting();
    this.setupControls();
  }

  createLighting() {
    const mapWidth = this.scene.map.widthInPixels;
    const mapHeight = this.scene.map.heightInPixels;

    // Create an off-screen canvas for the darkness
    this.darkCanvas = document.createElement("canvas");
    this.darkCanvas.width = mapWidth;
    this.darkCanvas.height = mapHeight;
    this.darkCtx = this.darkCanvas.getContext("2d");

    // Ensure old texture is gone
    if (this.scene.textures.exists("darknessCanvas")) {
      this.scene.textures.remove("darknessCanvas");
    }

    // Create Phaser image from canvas texture
    this.scene.textures.addCanvas("darknessCanvas", this.darkCanvas);
    this.darknessImage = this.scene.add.image(0, 0, "darknessCanvas");
    this.darknessImage.setOrigin(0, 0);
    // Darkness overlay - must be above ALL game layers (TopWall at mapHeight+1000, DecoHigh at mapHeight+2000)
    this.darknessImage.setDepth(mapHeight + 10000);
    this.darknessImage.setScrollFactor(1);
  }

  setupControls() {
    this.scene.input.keyboard.on("keydown-L", () => {
      this.toggleLight();
    });
  }

  toggleLight() {
    this.isLightOn = !this.isLightOn;
  }

  update() {
    if (!this.player) return;

    const mapWidth = this.scene.map.widthInPixels;
    const mapHeight = this.scene.map.heightInPixels;
    const playerX = this.player.x;
    const playerY = this.player.y;

    // Clear canvas
    this.darkCtx.clearRect(0, 0, mapWidth, mapHeight);

    // Draw full darkness
    this.darkCtx.fillStyle = "rgba(0, 0, 0, 0.92)";
    this.darkCtx.fillRect(0, 0, mapWidth, mapHeight);

    if (this.isLightOn) {
      // Use destination-out to cut a hole
      this.darkCtx.globalCompositeOperation = "destination-out";

      // Draw gradient circle (soft edges)
      const gradient = this.darkCtx.createRadialGradient(
        playerX,
        playerY,
        0,
        playerX,
        playerY,
        this.lightRadius,
      );
      gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
      gradient.addColorStop(0.7, "rgba(255, 255, 255, 0.8)");
      gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

      this.darkCtx.fillStyle = gradient;
      this.darkCtx.beginPath();
      this.darkCtx.arc(playerX, playerY, this.lightRadius, 0, Math.PI * 2);
      this.darkCtx.fill();

      // Reset composite mode
      this.darkCtx.globalCompositeOperation = "source-over";
    }

    // Update Phaser texture from canvas
    this.scene.textures.get("darknessCanvas").refresh();
  }

  setLightRadius(radius) {
    this.lightRadius = radius;
  }

  destroy() {
    if (this.darknessImage) this.darknessImage.destroy();
    if (this.scene.textures.exists("darknessCanvas")) {
      this.scene.textures.remove("darknessCanvas");
    }
  }
}
