export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: "PreloadScene" });
  }

  preload() {
    // --- 1. TILEMAP & TILESETS ---
    this.load.tilemapTiledJSON("mainMap", "Tilemap/test.json");

    this.load.image("walls_floor_img", "Tilemap/walls_floor.png");
    this.load.image("office_img", "Tilemap/Room_Builder_Office_16x16.png");
    this.load.image(
      "office_shadow_img",
      "Tilemap/Modern_Office_Black_Shadow.png",
    );

    // Passe den Pfad an, wo die Datei wirklich liegt!
    this.load.image(
      "office_full_img",
      "Tilemap/Office Tileset All 16x16 no shadow.png",
    );

    // --- 2. SPRITES & ITEMS ---
    this.load.spritesheet("player_sheet", "assets/Player.png", {
      frameWidth: 32,
      frameHeight: 32,
    });

    this.load.spritesheet("security_bot", "assets/Skeleton.png", {
      frameWidth: 32,
      frameHeight: 32,
    });

    this.load.image("item_key_gold", "assets/item673.png");

    // --- 3. SOUNDS ---
    this.load.audio("bgm", "assets/sounds/bgm.wav");
    this.load.audio("ui_hover", "assets/sounds/ui_hover.wav");
    this.load.audio("ui_click", "assets/sounds/ui_click.wav");
    this.load.audio("door", "assets/sounds/soundreality-opening-door-411632.mp3");
    this.load.audio("error_blip", "assets/sounds/error_blip.wav");
    
    // PC-Hacker Sounds
    this.load.audio("access_granted", "assets/sounds/access_granted_v2.wav");
    this.load.audio("access_denied", "assets/sounds/access_denied_v2.wav");
    this.load.audio("key_click_1", "assets/sounds/key_click_1.wav");
    this.load.audio("key_click_2", "assets/sounds/key_click_2.wav");
    this.load.audio("key_click_3", "assets/sounds/key_click_3.wav");
    
    // Minigame specific
    this.load.audio("lock_click", "assets/sounds/lock_click.wav");
    this.load.audio("simon_1", "assets/sounds/simon_tone_1.wav");
    this.load.audio("simon_2", "assets/sounds/simon_tone_2.wav");
    this.load.audio("simon_3", "assets/sounds/simon_tone_3.wav");
    this.load.audio("simon_4", "assets/sounds/simon_tone_4.wav");
    this.load.audio("spark", "assets/sounds/spark.wav");
    this.load.audio("slide", "assets/sounds/slide_puzzle_move.wav");
    this.load.audio("signal_lock", "assets/sounds/signal_lock.wav");
    this.load.audio("timer_tick", "assets/sounds/timer_tick.wav");
    this.load.audio("alarm_loop", "assets/sounds/alarm_loop_v2.wav");
    this.load.audio("pickup", "assets/sounds/pickup_item.wav");
  }

  create() {
    this.scene.start("ControlsScene");
  }
}
