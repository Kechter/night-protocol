import { Config } from '../utils/Config.js';
import { Player } from '../entities/Player.js';
import { SecurityBot } from '../entities/SecurityBot.js';
import { KeyItem } from '../entities/KeyItem.js';
import { Door } from '../entities/Door.js';
import { Inventory } from '../systems/Inventory.js';
import { DEPTH } from '../utils/Constants.js';

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    create() {
        this.createMap();
        this.createPlayer(); // Inventar wird hier erstellt
        this.createEnemies();
        this.createInteractables(); 
        this.createCollisions();
        this.createCamera();
        
        // UI Text oben links für Debugging
        // Debug Mode entfernt auf User-Wunsch
    }

    update(time, delta) {
        if (this.player) {
            this.player.update();
            // Zeigt Koordinaten an - extrem hilfreich um die Stelle in Tiled zu finden!
            // if (this.coordText) { ... }
        }
    }

    createMap() {
        this.map = this.make.tilemap({ key: 'mainMap' }); 
        
        const allTilesets = [
            this.map.addTilesetImage('walls_floor', 'walls_floor_img'),
            this.map.addTilesetImage('Room_Builder_Office_16x16', 'office_img'),
            this.map.addTilesetImage('Modern_Office_Black_Shadow', 'office_shadow_img'),
            this.map.addTilesetImage('Office Tileset All 16x16 no shadow', 'office_full_img')
        ];

        this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);

        // --- Layer Setup ---
        
        // 1. Boden (Keine Kollision)
        this.floorLayer = this.map.createLayer('Boden', allTilesets, 0, 0).setDepth(0);
        
        // 2. Walls (BASIS DER WÄNDE - HIER MUSS DIE KOLLISION SEIN)
        this.wallsLayer = this.map.createLayer('Walls', allTilesets, 0, 0).setDepth(1);
        // REVERT TO BLACKLIST (Temporary Fix):
        // The user's map export does NOT yet contain the "collides" property on tiles.
        // To ensure the game is playable NOW, we revert to excluding the known empty tiles (72, 75).
        this.wallsLayer.setCollisionByExclusion([-1, 0, 72, 75]); 
        // this.wallsLayer.setCollisionByProperty({ collides: true }); 
        
        // 3. Decoration (Tische etc. - Auch Kollision)
        this.decoLayer = this.map.createLayer('Decoration', allTilesets, 0, 0).setDepth(5);
        // Also revert decoration to blacklist
        this.decoLayer.setCollisionByExclusion([-1, 0, 72, 75]); 
        // this.decoLayer.setCollisionByProperty({ collides: true }); 

        // 4. Topwall (DACH DER WÄNDE - KEINE KOLLISION, ABER HOHE TIEFE)
        // Dadurch kann der Spieler "hinter" der Wand laufen (Perspektive).
        if (this.map.getLayer('Topwall')) {
            this.topWallLayer = this.map.createLayer('Topwall', allTilesets, 0, 0).setDepth(20); 
        }

        if (this.map.getLayer('Decoration High')) {
            this.decoHighLayer = this.map.createLayer('Decoration High', allTilesets, 0, 0).setDepth(100); 
        }

        // --- DEBUG VISUALISIERUNG END ---
    }

    createPlayer() {
        // Dynamic Spawn Point Logic
        let spawnX = 800;
        let spawnY = 1400;

        const spawnPoint = this.map.findObject("Interactables", obj => obj.name === "SpawnPoint" || obj.name === "PlayerSpawn");
        if (spawnPoint) {
            spawnX = spawnPoint.x;
            spawnY = spawnPoint.y;
        } else {
            console.warn("No 'SpawnPoint' found in 'Interactables' layer. Using default 800, 1400.");
        }

        this.player = new Player(this, spawnX, spawnY);
        this.player.inventory = new Inventory(this);
    }

    createInteractables() {
        this.keysGroup = this.add.group();
        this.doorsGroup = this.add.group();

        const interactableLayer = this.map.getObjectLayer('Interactables');
        if (!interactableLayer) return;

        interactableLayer.objects.forEach(obj => {
            const props = {};
            if (obj.properties) obj.properties.forEach(p => { props[p.name] = p.value; });

            let x = obj.x;
            let y = obj.y;
            const objType = obj.class || obj.type || "";

            if (obj.gid) { // Grafik Objekte
                x += obj.width / 2;
                y -= obj.height / 2;

                if (objType === 'key') {
                    const keyID = props.keyID || 'unknown_key';
                    const keyItem = new KeyItem(this, x, y, keyID);
                    this.keysGroup.add(keyItem);
                }
            } 
            else { // Shape Objekte
                x += obj.width / 2;
                y += obj.height / 2;

                if (objType === 'door') {
                    const door = new Door(this, x, y, props, obj.width, obj.height);
                    this.doorsGroup.add(door);
                }
            }
        });
    }

    createEnemies() {
        this.bots = this.add.group();
        // Bots blocken nur an echten Wänden (Walls/Deco), nicht am Dach (Topwall)
        const blockingLayers = [this.wallsLayer, this.decoLayer];
        
        const waypointLayer = this.map.getObjectLayer('Waypoints');
        if (!waypointLayer) return;
        
        const allPoints = waypointLayer.objects;
        const getPath = (names) => {
            const targetNames = names.map(String);
            return allPoints
                .filter(p => targetNames.includes(String(p.name)))
                .sort((a, b) => parseInt(a.name) - parseInt(b.name))
                .map(p => ({ x: p.x, y: p.y }));
        };

        const path1 = getPath([1, 2, 3, 4]); 
        const path2 = getPath([5, 6, 7, 8]);
        
        if (path1.length > 0) this.bots.add(new SecurityBot(this, path1[0].x, path1[0].y, path1, blockingLayers));
        if (path2.length > 0) this.bots.add(new SecurityBot(this, path2[0].x, path2[0].y, path2, blockingLayers));
    }

    createCollisions() {
        // Kollision nur mit Walls und Decoration
        const obstacles = [this.wallsLayer, this.decoLayer];
        
        obstacles.forEach(layer => {
            this.physics.add.collider(this.player, layer);
            this.physics.add.collider(this.bots, layer);
        });
        
        this.physics.add.overlap(this.player, this.keysGroup, (player, keyItem) => keyItem.collect(player));
        this.physics.add.collider(this.player, this.doorsGroup, (player, door) => door.tryOpen(player));
        this.physics.add.collider(this.bots, this.doorsGroup);
    }

    createCamera() {
        this.cameras.main.setBounds(0, 0, this.physics.world.bounds.width, this.physics.world.bounds.height);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        // Zoom increased even further to focus entirely on one room
        this.cameras.main.setZoom(4.5);
    }
}