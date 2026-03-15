import { Config } from "../utils/Config.js";
import { getDifficulty } from "../utils/DifficultyConfig.js";
import { Player } from "../entities/Player.js";
import { SecurityBot } from "../entities/SecurityBot.js";
import { KeyItem } from "../entities/KeyItem.js";
import { Door } from "../entities/Door.js";
import { NoteItem } from "../entities/NoteItem.js";
import { Computer } from "../entities/Computer.js";
import { Inventory } from "../systems/Inventory.js";
import { LightingSystem } from "../systems/LightingSystem.js";
import { getSoundManager } from "../utils/SoundManager.js";
import { DEPTH } from "../utils/Constants.js";

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameScene" });
  }

  create() {
    // Reset game over state
    this.isGameOver = false;
    this.gameOverGrace = 500; // 500ms grace period at start

    this.soundManager = getSoundManager(this);
    this.soundManager.playBGM();

    this.createMap();
    this.createPlayer(); // Inventar wird hier erstellt
    this.createEnemies();
    this.createInteractables();
    this.createCollisions();
    this.createCamera();
    this.createLighting(); // NEW: Atmospheric lighting
    this.setupEventListeners(); // NEW: Event System für PC-Hacks
    this.createBranding(); // NEW: Add Ohm logos to the university walls

    // Speedrun Mode timing
    if (Config.speedrunMode) {
      this.startTime = 0;
      this.timerStarted = false;
      this.events.emit("updateTimer", 0);
    }

    // UI Text oben links für Debugging
    // Debug Mode entfernt auf User-Wunsch

    // Cleanup listener for scene shutdown/restart
    this.events.on("shutdown", this.shutdown, this);
    this.events.on("destroy", this.shutdown, this);

    // Fix sticky controls: reset input state when scene resumes from minigame
    this.events.on("resume", () => {
      if (this.player && this.player.body) {
        this.player.body.setVelocity(0, 0);
      }
      this.input.keyboard.resetKeys();
      this.gameOverGrace = 500; // Grace period after minigame return
    });
  }

  shutdown() {
    // Stop lighting system
    if (this.lightingSystem) {
      this.lightingSystem.destroy();
      this.lightingSystem = null;
    }

    // Explicitly remove persistent event listeners
    this.events.off("unlockDoor");
    this.events.off("spawnKey");
    this.events.off("disableBots");
    this.events.off("disableAlarm");
    this.events.off("triggerAlarm");
    this.events.off("winGame");
    this.events.off("shutdown");
    this.events.off("destroy");
    this.events.off("resume");

    // Stop all BGM of this scene
    if (this.soundManager) {
        this.soundManager.stopBGM();
    }
  }

  update(time, delta) {
    if (this.player) {
      this.player.update();
    }

    // Speedrun Timer Update
    if (Config.speedrunMode && !this.isGameOver) {
      if (!this.timerStarted) {
        // Start timer when player first moves or interacts
        const move = this.player && (this.player.body.velocity.x !== 0 || this.player.body.velocity.y !== 0);
        if (move) {
          this.startTime = this.time.now;
          this.timerStarted = true;
        }
      } else {
        const elapsed = this.time.now - this.startTime;
        this.events.emit("updateTimer", elapsed);
      }
    }

    // Tick down game-over grace period
    if (this.gameOverGrace > 0) {
      this.gameOverGrace -= delta;
    }

    if (this.lightingSystem) {
      this.lightingSystem.update();
    }

    // Computer Updates
    if (this.computersGroup) {
      this.computersGroup.children.iterate((computer) => {
        if (computer && computer.update) computer.update(delta);
      });
    }
  }

  createMap() {
    this.map = this.make.tilemap({ key: "mainMap" });

    const allTilesets = [
      this.map.addTilesetImage("walls_floor", "walls_floor_img"),
      this.map.addTilesetImage("Room_Builder_Office_16x16", "office_img"),
      this.map.addTilesetImage(
        "Modern_Office_Black_Shadow",
        "office_shadow_img",
      ),
      this.map.addTilesetImage(
        "Office Tileset All 16x16 no shadow",
        "office_full_img",
      ),
    ];

    this.physics.world.setBounds(
      0,
      0,
      this.map.widthInPixels,
      this.map.heightInPixels,
    );

    // --- Layer Setup ---

    // 1. Boden (Keine Kollision)
    this.floorLayer = this.map
      .createLayer("Boden", allTilesets, 0, 0)
      .setDepth(0);

    // 2. Walls (BASIS DER WÄNDE - HIER MUSS DIE KOLLISION SEIN)
    this.wallsLayer = this.map
      .createLayer("Walls", allTilesets, 0, 0)
      .setDepth(1);
    // REVERT TO BLACKLIST (Temporary Fix):
    // The user's map export does NOT yet contain the "collides" property on tiles.
    // To ensure the game is playable NOW, we revert to excluding the known empty tiles (72, 75).
    this.wallsLayer.setCollisionByExclusion([
      -1, 0, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80,
    ]);
    // this.wallsLayer.setCollisionByProperty({ collides: true });

    // 3. Decoration (Tische etc. - UNTER dem Spieler, Spieler läuft darüber)
    //    Poster/Wanddeko die VOR dem Spieler sein sollen → "Decoration High" Layer in Tiled
    this.decoLayer = this.map
      .createLayer("Decoration", allTilesets, 0, 0)
      .setDepth(5);
    // Also revert decoration to blacklist
    this.decoLayer.setCollisionByExclusion([
      -1, 0, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80,
    ]);
    // this.decoLayer.setCollisionByProperty({ collides: true });

    // 4. WallDeco (Poster, Bilder auf Wänden - oberer Teil)
    // Depth über Topwall (mapHeight + 1005), so dass sie auf dem Dach sichtbar sind.
    // Der Spieler läuft hinter der Topwall und damit auch hinter diesem oberen Posterteil.
    if (this.map.getLayer("WallDeco")) {
      this.wallDecoLayer = this.map
        .createLayer("WallDeco", allTilesets, 0, 0)
        .setDepth(this.map.heightInPixels + 1005);
    }

    // 5. Topwall (DACH DER WÄNDE - VOR DEM SPIELER, UNTER DUNKELHEIT)
    // Depth = mapHeight + 1000 damit der Spieler (max depth ~mapHeight+10) dahinter erscheinen kann
    if (this.map.getLayer("Topwall")) {
      this.topWallLayer = this.map
        .createLayer("Topwall", allTilesets, 0, 0)
        .setDepth(this.map.heightInPixels + 1000);
      
      // Enable collision for vision occlusion (same tiles as normal walls)
      this.topWallLayer.setCollisionByExclusion([
        -1, 0, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80,
      ]);
    }

    // 6. Decoration High (immer VOR Spieler, z.B. Überhänge)
    if (this.map.getLayer("Decoration High")) {
      this.decoHighLayer = this.map
        .createLayer("Decoration High", allTilesets, 0, 0)
        .setDepth(this.map.heightInPixels + 2000);
    }

    // --- DEBUG VISUALISIERUNG END ---
  }

  createPlayer() {
    // Dynamic Spawn Point Logic
    let spawnX = 800;
    let spawnY = 1400;

    const spawnPoint = this.map.findObject(
      "Interactables",
      (obj) => obj.name === "SpawnPoint" || obj.name === "PlayerSpawn",
    );
    if (spawnPoint) {
      spawnX = spawnPoint.x;
      spawnY = spawnPoint.y;
    } else {
      console.warn(
        "No 'SpawnPoint' found in 'Interactables' layer. Using default 800, 1400.",
      );
    }

    this.player = new Player(this, spawnX, spawnY);
    this.player.inventory = new Inventory(this);

    // Admin Mode: Alle Keys direkt ins Inventar
    if (Config.adminMode) {
      console.log("ADMIN MODE: Giving all keycards to player");
      this.player.inventory.addKey("keycard_a");
      this.player.inventory.addKey("keycard_b");
      this.player.inventory.addKey("keycard_c");
      this.player.inventory.addKey("keycard_d");
      this.player.inventory.addKey("keycard_e");
      this.player.inventory.addKey("master_key");
      this.player.inventory.addKey("keycard_red");
      this.player.inventory.addKey("keycard_blue");
      this.player.inventory.addKey("keycard_green");
    }
  }

  createInteractables() {
    this.keysGroup = this.add.group();
    this.doorsGroup = this.add.group();
    this.computersGroup = this.add.group();
    this.notesGroup = this.add.group();

    const interactableLayer = this.map.getObjectLayer("Interactables");
    if (!interactableLayer) return;

    interactableLayer.objects.forEach((obj) => {
      const props = {};
      if (obj.properties)
        obj.properties.forEach((p) => {
          props[p.name] = p.value;
        });

      let x = obj.x;
      let y = obj.y;
      const objType = obj.class || obj.type || "";

      if (obj.gid) {
        // Grafik Objekte
        x += obj.width / 2;
        y -= obj.height / 2;

        if (objType === "key") {
          const keyID = props.keyID || "unknown_key";
          const keyItem = new KeyItem(this, x, y, keyID);
          this.keysGroup.add(keyItem);
        }
      } else {
        // Shape Objekte
        x += obj.width / 2;
        y += obj.height / 2;

        if (objType === "door") {
          const door = new Door(this, x, y, props, obj.width, obj.height);
          door.doorId = props.id || null; // Für Event-System
          this.doorsGroup.add(door);
        }

        // Computer/PC Objekte
        if (objType === "computer" || objType === "pc") {
          const computer = new Computer(
            this,
            x,
            y,
            props,
            obj.width,
            obj.height,
          );
          this.computersGroup.add(computer);
        }

        // Note Objekte
        if (objType === "note") {
          const noteItem = new NoteItem(
            this,
            x,
            y,
            props.noteTitle || props.title || "Notiz",
            props.noteText || props.text || "",
          );
          this.notesGroup.add(noteItem);
        }
      }
    });
  }

  setupEventListeners() {
    // Event: Tür per ID öffnen (von Computer-Hack ausgelöst)
    this.events.on("unlockDoor", (doorId) => {
      this.doorsGroup.children.iterate((door) => {
        if (door && door.doorId === doorId) {
          door.open();
          console.log(`Door ${doorId} opened by PC hack!`);
        }
      });
    });

    // Event: Key an bestimmter Stelle spawnen
    this.events.on("spawnKey", (keyConfig) => {
      // keyConfig kann "keyID" oder "keyID:x:y" sein
      let keyID, spawnX, spawnY;

      if (typeof keyConfig === "string" && keyConfig.includes(":")) {
        const parts = keyConfig.split(":");
        keyID = parts[0];
        spawnX = parseInt(parts[1]);
        spawnY = parseInt(parts[2]);
      } else {
        keyID = keyConfig;
        // Spawne in der Nähe des Spielers
        spawnX = this.player.x + Phaser.Math.Between(-50, 50);
        spawnY = this.player.y + Phaser.Math.Between(-50, 50);
      }

      // Prevent duplicate keys: check if this keyID already exists in world or inventory
      let alreadyExists = false;
      this.keysGroup.children.iterate((k) => {
        if (k && k.keyID === keyID) alreadyExists = true;
      });
      if (this.player.inventory && this.player.inventory.hasKey(keyID))
        alreadyExists = true;
      if (alreadyExists) {
        console.log(`Key ${keyID} already exists, skipping spawn.`);
        return;
      }

      const newKey = new KeyItem(this, spawnX, spawnY, keyID);
      this.keysGroup.add(newKey);

      // Kollision hinzufügen
      this.physics.add.overlap(this.player, newKey, (player, key) => {
        key.collect(player);
      });

      // Visueller Effekt
      this.tweens.add({
        targets: newKey,
        scaleX: 1.5,
        scaleY: 1.5,
        duration: 200,
        yoyo: true,
      });

      console.log(`Spawned key ${keyID} at ${spawnX}, ${spawnY}`);
    });

    // Event: Security Bots deaktivieren
    this.events.on("disableBots", () => {
      if (this.bots) {
        this.bots.children.iterate((bot) => {
          if (bot && bot.disable) {
            bot.disable();
          } else if (bot) {
            // Fallback: Bot einfrieren
            bot.setVelocity(0, 0);
            bot.setTint(0x555555);
            if (bot.body) bot.body.enable = false;
          }
        });
      }
      console.log("All security bots disabled!");
    });

    // Event: Alarm deaktivieren
    this.events.on("disableAlarm", () => {
      this.alarmDisabled = true;
      const uiScene = this.scene.get("UIScene");
      if (uiScene && uiScene.showNotification) {
        uiScene.showNotification("ALARM DEAKTIVIERT", 0x00ff00);
      }
      console.log("Alarm system disabled!");
    });

    // Event: Alarm AUSLÖSEN (Laptop Lecture Falle)
    this.events.on("triggerAlarm", () => {
      // 1. Visueller Alarm (Blinken)
      this.cameras.main.flash(500, 255, 0, 0); // Roter Flash
      this.cameras.main.shake(300, 0.01);

      // Dauerhaftes rotes Pulsieren hinzufügen (optional)
      const flashFx = this.cameras.main.postFX.addColorMatrix();
      let flashActive = false;
      this.time.addEvent({
        delay: 800,
        callback: () => {
          flashActive = !flashActive;
          if (flashActive) {
            flashFx.contrast(1.5).sepia().hue(0);
          } else {
            flashFx.contrast(1).sepia(0).hue(0);
          }
        },
        loop: true,
      });

      // 2. Audio/UI Notification
      const uiScene = this.scene.get("UIScene");
      if (uiScene && uiScene.showNotification) {
        uiScene.showNotification("WARNUNG: ALARM AUSGELÖST!", 0xff0000);
      }

      console.log(
        "Lecture Alarm triggered! Waiting for Computer.js to send the hint note.",
      );
    });

    // Event: Win Condition
    this.events.on("winGame", () => {
      this.triggerWin();
    });
  }

  createEnemies() {
    this.bots = this.add.group();
    // Bots blocken nur an echten Wänden (Walls/Deco/Topwalls)
    const blockingLayers = [this.wallsLayer, this.decoLayer];
    if (this.topWallLayer) blockingLayers.push(this.topWallLayer);

    const waypointLayer = this.map.getObjectLayer("Waypoints");
    if (!waypointLayer) return;

    const allPoints = waypointLayer.objects;
    const getPath = (names) => {
      const targetNames = names.map(String);
      return allPoints
        .filter((p) => targetNames.includes(String(p.name)))
        .sort((a, b) => parseInt(a.name) - parseInt(b.name))
        .map((p) => ({ x: p.x, y: p.y }));
    };

    // User Requested Patrol Rules:
    // Bot 1: 1-5 <-> 5-1
    const path1Forward = getPath([1, 2, 3, 4, 5]);
    const path1Backward = [...path1Forward].reverse().slice(1, -1);
    const path1 = [...path1Forward, ...path1Backward];

    // Bot 2: 6-9 <-> 9-6
    const path2Forward = getPath([6, 7, 8, 9]);
    const path2Backward = [...path2Forward].reverse().slice(1, -1);
    const path2 = [...path2Forward, ...path2Backward];

    // Bot 3: 10-22 <-> 22-10
    const path3Forward = getPath([
      10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
    ]);
    const path3Backward = [...path3Forward].reverse().slice(1, -1);
    const path3 = [...path3Forward, ...path3Backward];

    // Bot 4: 23-24 <-> 24-23
    const path4Forward = getPath([23, 24]);
    const path4Backward = [...path4Forward].reverse().slice(1, -1);
    const path4 = [...path4Forward, ...path4Backward];

    // Bot 5: 25-29 <-> 29-25
    const path5Forward = getPath([25, 26, 27, 28, 29]);
    const path5Backward = [...path5Forward].reverse().slice(1, -1);
    const path5 = [...path5Forward, ...path5Backward];

    if (path1.length > 0)
      this.bots.add(
        new SecurityBot(this, path1[0].x, path1[0].y, path1, blockingLayers),
      );
    if (path2.length > 0)
      this.bots.add(
        new SecurityBot(this, path2[0].x, path2[0].y, path2, blockingLayers),
      );
    if (path3.length > 0)
      this.bots.add(
        new SecurityBot(this, path3[0].x, path3[0].y, path3, blockingLayers),
      );
    if (path4.length > 0)
      this.bots.add(
        new SecurityBot(this, path4[0].x, path4[0].y, path4, blockingLayers),
      );
    if (path5.length > 0)
      this.bots.add(
        new SecurityBot(this, path5[0].x, path5[0].y, path5, blockingLayers),
      );
  }

  createCollisions() {
    // Kollision nur mit Walls und Decoration
    const obstacles = [this.wallsLayer, this.decoLayer];

    obstacles.forEach((layer) => {
      this.physics.add.collider(this.player, layer);
      this.physics.add.collider(this.bots, layer);
    });

    this.physics.add.overlap(this.player, this.keysGroup, (player, keyItem) =>
      keyItem.collect(player),
    );
    this.physics.add.collider(this.player, this.doorsGroup, (player, door) =>
      door.tryOpen(player),
    );
    this.physics.add.collider(this.bots, this.doorsGroup);

    // Notes einsammeln
    this.physics.add.overlap(this.player, this.notesGroup, (player, noteItem) =>
      noteItem.collect(player),
    );

    // NEU: Bot fängt Spieler -> Game Over (nur wenn nicht adminMode)
    this.physics.add.overlap(this.player, this.bots, (player, bot) => {
      if (!Config.adminMode && !this.isGameOver && this.gameOverGrace <= 0) {
        this.gameOver();
      }
    });
  }

  // Game Over: Bot erwischt Spieler
  gameOver() {
    this.isGameOver = true;
    this.player.body.setVelocity(0, 0);
    this.player.setTint(0xff0000);

    this.cameras.main.flash(300, 255, 0, 0);
    this.cameras.main.shake(400, 0.025);

    // Fade to black, then show Game Over overlay via UIScene
    this.time.delayedCall(500, () => {
      this.cameras.main.fadeOut(600, 0, 0, 0);
      this.cameras.main.once("camerafadeoutcomplete", () => {
        this.scene.stop("UIScene");
        this.scene.stop("GameScene");
        this.scene.start("GameOverScene");
      });
    });
  }

  // Win: Mainframe gehackt
  triggerWin() {
    if (this.isGameOver) return;
    this.isGameOver = true; // block further interactions
    this.player.body.setVelocity(0, 0);

    this.cameras.main.flash(400, 0, 255, 100);
    this.time.delayedCall(600, () => {
      this.cameras.main.fadeOut(600, 0, 0, 0);
      this.cameras.main.once("camerafadeoutcomplete", () => {
        const finalTime = Config.speedrunMode ? (this.time.now - this.startTime) : null;
        this.scene.stop("UIScene");
        this.scene.stop("GameScene");
        this.scene.start("WinScene", { finalTime });
      });
    });
  }

  createCamera() {
    this.cameras.main.setBounds(
      0,
      0,
      this.physics.world.bounds.width,
      this.physics.world.bounds.height,
    );
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    // Zoom increased even further to focus entirely on one room
    this.cameras.main.setZoom(4.5);
  }

  createLighting() {
    this.lightingSystem = new LightingSystem(this, this.player);
  }

  createBranding() {
    // Ein zentrales Logo auf dem Boden im Eingangsbereich
    const logo = this.add.image(800, 1360, "ohm_logo")
      .setScale(0.1)
      .setAlpha(0.4)
      .setDepth(0.5) // Unter den Wänden, über dem Boden
      .setTint(0xaaaaaa); // Dezent im Boden-Look
  }
}
