import { Player } from '../entities/Player.js';
import { SecurityBot } from '../entities/SecurityBot.js';
import { KeyItem } from '../entities/KeyItem.js';
import { Door } from '../entities/Door.js';
import { Computer } from '../entities/Computer.js'; // NEU IMPORTIERT
import { Inventory } from '../systems/Inventory.js';
import { DEPTH } from '../utils/Constants.js';

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    create() {
        this.createMap();
        this.createPlayer(); 
        this.createEnemies();
        this.createInteractables(); 
        this.createCollisions();
        this.createCamera();
        
        this.coordText = this.add.text(10, 10, '', { 
            fontSize: '12px', fill: '#FFF', stroke: '#000', strokeThickness: 2 
        }).setScrollFactor(0).setDepth(DEPTH.UI);
    }

    update(time, delta) {
        if (this.player) {
            this.player.update();
        }
        
        // NEU: Updates für alle Computer aufrufen (für das "E" Prompt)
        if (this.computersGroup) {
            this.computersGroup.getChildren().forEach(pc => pc.update());
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

        this.floorLayer = this.map.createLayer('Boden', allTilesets, 0, 0).setDepth(0);
        
        this.wallsLayer = this.map.createLayer('Walls', allTilesets, 0, 0).setDepth(1);
        this.wallsLayer.setCollisionBetween(1, 10000); 
        
        this.decoLayer = this.map.createLayer('Decoration', allTilesets, 0, 0).setDepth(5);
        this.decoLayer.setCollisionBetween(1, 10000); 

        if (this.map.getLayer('Topwall')) {
            this.topWallLayer = this.map.createLayer('Topwall', allTilesets, 0, 0).setDepth(10); 
        }

        if (this.map.getLayer('Decoration High')) {
            this.decoHighLayer = this.map.createLayer('Decoration High', allTilesets, 0, 0).setDepth(100); 
        }
    }

    createPlayer() {
        this.player = new Player(this, 800, 1400);
        this.player.inventory = new Inventory(this);
    }

    createInteractables() {
        this.keysGroup = this.add.group();
        this.doorsGroup = this.add.group();
        this.computersGroup = this.add.group(); // NEUE GRUPPE

        const interactableLayer = this.map.getObjectLayer('Interactables');
        if (!interactableLayer) return;

        interactableLayer.objects.forEach(obj => {
            const props = {};
            if (obj.properties) obj.properties.forEach(p => { props[p.name] = p.value; });

            let x = obj.x;
            let y = obj.y;
            // Type/Class aus Tiled lesen (toLowerCase für Sicherheit)
            const objType = (obj.class || obj.type || "").toLowerCase();

            if (obj.gid) { // Grafik Objekte (Insert Tile)
                x += obj.width / 2;
                y -= obj.height / 2;

                if (objType === 'key') {
                    const keyID = props.keyID || 'unknown_key';
                    const keyItem = new KeyItem(this, x, y, keyID);
                    this.keysGroup.add(keyItem);
                }
                // NEU: Auch Tile-Objekte können Computer sein
                else if (objType === 'computer') {
                    const pc = new Computer(this, x, y, props, obj.width, obj.height);
                    this.computersGroup.add(pc);
                }
            } 
            else { // Shape Objekte (Rechtecke)
                x += obj.width / 2;
                y += obj.height / 2;

                if (objType === 'door') {
                    const door = new Door(this, x, y, props, obj.width, obj.height);
                    this.doorsGroup.add(door);
                }
                // NEU: Shape-Objekte können Computer sein (Interaktions-Zonen)
                else if (objType === 'computer') {
                    const pc = new Computer(this, x, y, props, obj.width, obj.height);
                    this.computersGroup.add(pc);
                }
            }
        });
    }

    createEnemies() {
        this.bots = this.add.group();
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
        const obstacles = [this.wallsLayer, this.decoLayer];
        obstacles.forEach(layer => {
            this.physics.add.collider(this.player, layer);
            this.physics.add.collider(this.bots, layer);
        });
        
        this.physics.add.overlap(this.player, this.keysGroup, (player, keyItem) => keyItem.collect(player));
        this.physics.add.collider(this.player, this.doorsGroup, (player, door) => door.tryOpen(player));
        this.physics.add.collider(this.bots, this.doorsGroup);
        
        // Computer brauchen keine physische Kollision (wir machen das über Distanz im update),
        // aber wenn du willst, dass man nicht durchlaufen kann, aktiviere dies:
        // this.physics.add.collider(this.player, this.computersGroup);
    }

    createCamera() {
        this.cameras.main.setBounds(0, 0, this.physics.world.bounds.width, this.physics.world.bounds.height);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setZoom(2);
    }
}