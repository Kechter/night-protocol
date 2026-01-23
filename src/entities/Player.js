import { PHYSICS_CONFIG, DEPTH } from '../utils/Constants.js';

export class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'player_sheet', 0);
        
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setCollideWorldBounds(true);
        this.setDepth(DEPTH.ENTITIES);

        this.body.setSize(14, 10);
        this.body.setOffset(9, 20);

        this.scene = scene;
        this.cursors = scene.input.keyboard.createCursorKeys();
        
        // Add WASD keys
        this.wasd = {
            W: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            A: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            S: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            D: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
        };

        this.initAnimations();

        this.play('player-idle-down')
    }

    initAnimations() {
        if (!this.scene.anims.exists('walk')) {
            this.scene.anims.create({
                key: 'walk',
                frames: this.scene.anims.generateFrameNumbers('player_sheet', { frames: [0, 1, 2, 1] }),
                frameRate: 8,
                repeat: -1
            });
        }
        
        if (!this.scene.anims.exists('idle')) {
            this.scene.anims.create({
                key: 'idle',
                frames: [{ key: 'player_sheet', frame: 1 }],
                frameRate: 1,
            });
        }
    }

    update() {
        this.handleInput();
    }

    handleInput() {
        const speed = PHYSICS_CONFIG.PLAYER_SPEED;
        this.setVelocity(0);
        let isMoving = false;

        // Horizontal movement (Arrow keys OR WASD)
        if (this.cursors.left.isDown || this.wasd.A.isDown) {
            this.setVelocityX(-speed);
            this.setFlipX(true);
            isMoving = true;
        } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
            this.setVelocityX(speed);
            this.setFlipX(false);
            isMoving = true;
        }

        // Vertical movement (Arrow keys OR WASD)
        if (this.cursors.up.isDown || this.wasd.W.isDown) {
            this.setVelocityY(-speed);
            isMoving = true;
        } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
            this.setVelocityY(speed);
            isMoving = true;
        }

        // Animation und Normalisierung
        if (isMoving) {
            // Verhindert, dass diagonales Laufen schneller ist
            this.body.velocity.normalize().scale(speed);
            this.play('walk', true);
        } else {
            this.play('idle', true);
        }
    }
}