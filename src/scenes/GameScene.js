// GameScene.js

const STATE = {
    PATROL: 'patrol',
    CHASE: 'chase',
    SEARCH: 'search',
    IDLE: 'idle'
};

// --- SECURITY BOT KLASSE ---
class SecurityBot extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, path) {
        super(scene, x, y, 'security_bot');
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setImmovable(true);
        this.setCollideWorldBounds(true);
        this.setDepth(5); 

        // Bot Logic
        this.state = STATE.PATROL;
        this.path = path || [];
        this.pathIndex = 0;
        this.patrolSpeed = 80;
        this.chaseSpeed = 160;
        this.visionRange = 250;
        this.visionAngle = 70;
        this.player = scene.player;
        
        // Sichtblockade: Bot kann nicht durch Wände oder Schränke schauen
        this.blockingLayers = [scene.wallsLayer, scene.decoLayer, scene.decoHighLayer];
        this.lastKnownLocation = null;
        this.justSpawned = true;
    }

    preUpdate(time, delta) {
        super.preUpdate(time, delta);
        if (!this.player) return;
        this.checkPlayerVision();
        switch (this.state) {
            case STATE.PATROL: this.handlePatrol(); break;
            case STATE.CHASE:  this.handleChase(); break;
            case STATE.SEARCH: this.handleSearch(); break;
        }
        this.updateRotation();
    }

    handlePatrol() {
        if (!this.path || this.path.length === 0) return;
        const targetPoint = this.path[this.pathIndex];
        if (Phaser.Math.Distance.Between(this.x, this.y, targetPoint.x, targetPoint.y) < 5) {
            if (this.justSpawned) {
                this.justSpawned = false;
                this.pathIndex = (this.pathIndex + 1) % this.path.length;
                this.scene.physics.moveToObject(this, this.path[this.pathIndex], this.patrolSpeed);
                return;
            }
            this.pathIndex = (this.pathIndex + 1) % this.path.length;
            this.setVelocity(0, 0);
            this.scene.time.delayedCall(1000, () => {
                if (this.state === STATE.PATROL) this.scene.physics.moveToObject(this, this.path[this.pathIndex], this.patrolSpeed);
            }, [], this);
            return;
        }
        this.justSpawned = false;
        if (this.body.speed === 0) this.scene.physics.moveToObject(this, targetPoint, this.patrolSpeed);
    }

    handleChase() {
        this.scene.physics.moveToObject(this, this.player, this.chaseSpeed);
    }

    handleSearch() {
        if (!this.lastKnownLocation) { this.state = STATE.PATROL; return; }
        this.scene.physics.moveToObject(this, this.lastKnownLocation, this.patrolSpeed);
        if (Phaser.Math.Distance.Between(this.x, this.y, this.lastKnownLocation.x, this.lastKnownLocation.y) < 5) {
            this.setVelocity(0, 0);
            this.lastKnownLocation = null;
            this.scene.time.delayedCall(1500, () => { this.state = STATE.PATROL; }, [], this);
        }
    }

    checkPlayerVision() {
        if (Phaser.Math.Distance.Between(this.x, this.y, this.player.x, this.player.y) > this.visionRange) {
            if (this.state !== STATE.SEARCH) this.state = STATE.PATROL;
            return;
        }
        const angleToPlayer = Phaser.Math.Angle.Between(this.x, this.y, this.player.x, this.player.y);
        if (Math.abs(Phaser.Math.Angle.Wrap(angleToPlayer - this.rotation)) >= Phaser.Math.DEG_TO_RAD * (this.visionAngle / 2)) {
            if (this.state === STATE.CHASE) this.state = STATE.SEARCH;
            return;
        }
        
        const line = new Phaser.Geom.Line(this.x, this.y, this.player.x, this.player.y);
        let isObstructed = false;
        for (let layer of this.blockingLayers) {
            if (!layer) continue;
            if (layer.getTilesWithinShape(line).some(tile => tile.index > 0)) { isObstructed = true; break; }
        }

        if (!isObstructed) {
            this.state = STATE.CHASE;
            this.lastKnownLocation = { x: this.player.x, y: this.player.y };
        } else if (this.state === STATE.CHASE) {
            this.state = STATE.SEARCH;
        }
    }

    updateRotation() {
        if (this.body.speed > 0) this.rotation = Math.atan2(this.body.velocity.y, this.body.velocity.x);
    }
}

// --- GAMESCENE KLASSE ---
class GameScene extends Phaser.Scene {
    constructor() { super({ key: 'GameScene' }); }

    preload() {
        this.load.tilemapTiledJSON('mainMap', 'Tilemap/test.json'); 
        this.load.image('walls_floor_img', 'Tilemap/walls_floor.png'); 
        this.load.image('office_img', 'Tilemap/Room_Builder_Office_16x16.png');
        this.load.image('office_shadow_img', 'Tilemap/Modern_Office_Black_Shadow.png');
        this.load.spritesheet('player_sheet', 'assets/Player.png', { frameWidth: 32, frameHeight: 32 });
        this.load.image('security_bot', 'assets/security_bot.png'); 
    }

    create() {
        // 1. MAP INIT
        const map = this.make.tilemap({ key: 'mainMap' });
        if (!map.widthInPixels) return console.error("Map Error");

        const allTilesets = [
            map.addTilesetImage('walls_floor', 'walls_floor_img'),
            map.addTilesetImage('Room_Builder_Office_16x16', 'office_img'),
            map.addTilesetImage('Modern_Office_Black_Shadow', 'office_shadow_img')
        ];

        this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

        // 2. LAYERS & KOLLISION
        this.floorLayer = map.createLayer('Boden', allTilesets, 0, 0);
        if(this.floorLayer) this.floorLayer.setDepth(0);

        this.wallsLayer = map.createLayer('Walls', allTilesets, 0, 0);
        if(this.wallsLayer) {
            this.wallsLayer.setDepth(1);
            this.wallsLayer.setCollisionBetween(1, 10000); 
        }

        this.decoLayer = map.createLayer('Decoration', allTilesets, 0, 0);
        if(this.decoLayer) {
            this.decoLayer.setDepth(2);
            this.decoLayer.setCollisionBetween(1, 10000); 
        }

        this.decoHighLayer = map.createLayer('Decoration High', allTilesets, 0, 0);
        if(this.decoHighLayer) {
            this.decoHighLayer.setDepth(10); // Über dem Spieler
            // KEINE KOLLISION HIER! Damit man dahinter laufen kann.
        }

        // DEBUG VISUALS
        const debugGraphics = this.add.graphics().setAlpha(0.5);
        if(this.wallsLayer) this.wallsLayer.renderDebug(debugGraphics, { collidingTileColor: new Phaser.Display.Color(0, 255, 0, 255) });
        if(this.decoLayer) this.decoLayer.renderDebug(debugGraphics, { collidingTileColor: new Phaser.Display.Color(255, 0, 0, 255) });

        // --- 3. Spieler erstellen ---
        const playerStartX = 800; 
        const playerStartY = 1400; 
        
        this.player = this.physics.add.sprite(playerStartX, playerStartY, 'player_sheet', 0)
            .setCollideWorldBounds(true) 
            .setDepth(5); 

        // --- HITBOX TUNING ---
        this.player.body.setSize(12, 8); 
        this.player.body.setOffset(10, 24);

        // ANIMATIONEN
        this.anims.create({
            key: 'walk',
            frames: this.anims.generateFrameNumbers('player_sheet', { frames: [0, 1, 2, 1] }),
            frameRate: 8,
            repeat: -1
        });
        
        this.anims.create({
            key: 'idle',
            frames: [{ key: 'player_sheet', frame: 1 }], 
            frameRate: 1,
        });

        // 4. BOT
        this.bots = this.add.group();
        if (this.textures.exists('security_bot')) {
            const bot = new SecurityBot(this, 800, 1300, [{x:800, y:1300}, {x:900, y:1300}, {x:900, y:1400}, {x:800, y:1400}]);
            this.bots.add(bot);
        }

        // 5. GLOBAL COLLIDERS
        // decoHighLayer ist NICHT dabei!
        const obstacles = [this.wallsLayer, this.decoLayer]; 
        
        obstacles.forEach(layer => {
            if (layer) {
                this.physics.add.collider(this.player, layer);
                this.physics.add.collider(this.bots, layer);
            }
        });
        
        this.physics.add.collider(this.player, this.bots, this.gameOver, null, this);

        // CAMERA & CONTROLS
        this.cursors = this.input.keyboard.createCursorKeys();
        
        // --- KAMERA EINSTELLUNGEN ---
        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        
        // ZOOM: Zurück auf 1.0 (oder 1.2 für leichten Zoom) bei kleinerem Fenster
        this.cameras.main.setZoom(2); 
        
        this.coordText = this.add.text(10, 10, 'Ready', { fontSize: '12px', fill: '#FFF', backgroundColor: '#000' }).setScrollFactor(0).setDepth(100);
    }

    update() {
        if (!this.player || !this.player.body) return;
        const speed = 150; 
        this.player.setVelocity(0); 
        let isMoving = false;
        
        if (this.cursors.left.isDown) { this.player.setVelocityX(-speed); this.player.setFlipX(true); isMoving = true; }
        else if (this.cursors.right.isDown) { this.player.setVelocityX(speed); this.player.setFlipX(false); isMoving = true; }

        if (this.cursors.up.isDown) { this.player.setVelocityY(-speed); isMoving = true; }
        else if (this.cursors.down.isDown) { this.player.setVelocityY(speed); isMoving = true; }
        
        if (isMoving) {
            this.player.body.velocity.normalize().scale(speed);
            if(this.anims.exists('walk')) this.player.play('walk', true);
        } else {
            if(this.anims.exists('idle')) this.player.play('idle', true);
        }
        
        this.coordText.setText(`Pos: ${Math.floor(this.player.x)}, ${Math.floor(this.player.y)}`);
    }
    
    gameOver(player, bot) {
        this.physics.pause();
        player.setTint(0xff0000); 
        console.log("ALARM!");
    }
}

// -------------------------------------------------------------
// 3. KONFIGURATION (Original 800x600)
// -------------------------------------------------------------

const config = {
    type: Phaser.AUTO,
    title: 'Night Protocol',
    parent: 'game-container',
    width: 800, 
    height: 600,
    backgroundColor: '#555',
    render: { pixelArt: true },
    canvasContext: { willReadFrequently: true },
    physics: { default: 'arcade', arcade: { debug: true } },
    scene: [GameScene], 
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
};

const game = new Phaser.Game(config);