import { Player } from '../entities/Player.js';
import { SecurityBot } from '../entities/SecurityBot.js';
import { DEPTH } from '../utils/Constants.js';

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    create() {
        this.createMap();
        this.createPlayer();
        this.createEnemies();
        this.createCollisions();
        this.createCamera();
        this.createUI();
    }

    update(time, delta) {
        if (this.player) {
            this.player.update();
            this.coordText.setText(`Pos: ${Math.floor(this.player.x)}, ${Math.floor(this.player.y)}`);
        }
    }

    createMap() {
        this.map = this.make.tilemap({ key: 'mainMap' }); 
        
        const allTilesets = [
            this.map.addTilesetImage('walls_floor', 'walls_floor_img'),
            this.map.addTilesetImage('Room_Builder_Office_16x16', 'office_img'),
            this.map.addTilesetImage('Modern_Office_Black_Shadow', 'office_shadow_img')
        ];

        this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);

        // 1. Boden (Ganz unten)
        this.floorLayer = this.map.createLayer('Boden', allTilesets, 0, 0);
        this.floorLayer.setDepth(DEPTH.FLOOR);

        // 2. Wände Basis (Kollision)
        this.wallsLayer = this.map.createLayer('Walls', allTilesets, 0, 0);
        this.wallsLayer.setDepth(DEPTH.WALLS);
        this.wallsLayer.setCollisionBetween(1, 10000); 

        // 3. Normale Deko (Kollision, z.B. Tische)
        this.decoLayer = this.map.createLayer('Decoration', allTilesets, 0, 0);
        this.decoLayer.setDepth(DEPTH.DECO);
        this.decoLayer.setCollisionBetween(1, 10000); 

        // 4. Hohe Deko (Keine Kollision, über Spieler - z.B. Lampen)
        // Prüfen ob Layer existiert, um Fehler zu vermeiden falls leer
        if (this.map.getLayer('Decoration High')) {
            this.decoHighLayer = this.map.createLayer('Decoration High', allTilesets, 0, 0);
            this.decoHighLayer.setDepth(DEPTH.DECO_HIGH);
        }

        // 5. Obere Wände (Keine Kollision, über Spieler - Das 2.5D Dach)
        if (this.map.getLayer('Topwall')) {
            this.topWallLayer = this.map.createLayer('Topwall', allTilesets, 0, 0);
            this.topWallLayer.setDepth(DEPTH.DECO_HIGH); // Gleiche Tiefe wie hohe Deko
        }
    }

    createPlayer() {
        const startX = 800;
        const startY = 1400;
        this.player = new Player(this, startX, startY);
    }

    createEnemies() {
        this.bots = this.add.group();
        
        // Blocking Layers für die Sichtlinie (Raycast)
        // Der Bot kann nicht durch Walls oder Tische (Decoration) schauen.
        // Durch Topwall (oberer Teil der Mauer) kann er logisch "durchschauen" wenn er davor steht,
        // oder man fügt es hinzu, wenn er nicht drüber schauen soll. 
        // Für 2.5D ist es meist besser, Topwall NICHT als Sichtblockade zu nehmen, 
        // da die Füße der Mauer (Walls) das schon erledigen.
        const blockingLayers = [this.wallsLayer, this.decoLayer];
        
        const waypointLayer = this.map.getObjectLayer('Waypoints');
        
        if (!waypointLayer) {
            console.error("FEHLER: Objekt-Ebene 'Waypoints' nicht gefunden!");
            return;
        }

        const allPoints = waypointLayer.objects;

        const getPath = (names) => {
            const targetNames = names.map(String);
            
            return allPoints
                .filter(p => targetNames.includes(String(p.name))) 
                .sort((a, b) => parseInt(a.name) - parseInt(b.name)) 
                .map(p => ({ x: p.x, y: p.y }));
        };

        // Paths
        const path1 = getPath([1, 2, 3, 4]); 
        const path2 = getPath([5, 6, 7, 8]);

        // Bot 1
        if (path1.length > 0) {
            const bot1 = new SecurityBot(this, path1[0].x, path1[0].y, path1, blockingLayers);
            this.bots.add(bot1);
        }

        // Bot 2
        if (path2.length > 0) {
            const bot2 = new SecurityBot(this, path2[0].x, path2[0].y, path2, blockingLayers);
            this.bots.add(bot2);
        }
    }

    createCollisions() {
        // Hier NUR die Layer mit Kollision reinpacken.
        // Topwall und Decoration High fehlen hier absichtlich!
        const obstacles = [this.wallsLayer, this.decoLayer];
        
        obstacles.forEach(layer => {
            this.physics.add.collider(this.player, layer);
            this.physics.add.collider(this.bots, layer);
        });

        // Kollision mit Bots (kannst du wieder einkommentieren, wenn du fertig mit Testen bist)
        // this.physics.add.collider(this.player, this.bots, this.handleGameOver, null, this);
    }

    createCamera() {
        this.cameras.main.setBounds(0, 0, this.physics.world.bounds.width, this.physics.world.bounds.height);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setZoom(2);
    }

    createUI() {
        this.coordText = this.add.text(10, 10, 'Ready', { 
            fontSize: '12px', 
            fill: '#FFF', 
            backgroundColor: '#000' 
        }).setScrollFactor(0).setDepth(DEPTH.UI);
    }

    handleGameOver(player, bot) {
        this.physics.pause();
        player.setTint(0xff0000);
        console.log("ALARM!");
        this.time.delayedCall(2000, () => {
            this.scene.restart();
        });
    }
}