export class PreloadScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PreloadScene' });
    }

    preload() {
        this.load.tilemapTiledJSON('mainMap', 'Tilemap/test.json'); 
        this.load.image('walls_floor_img', 'Tilemap/walls_floor.png'); 
        this.load.image('office_img', 'Tilemap/Room_Builder_Office_16x16.png');
        this.load.image('office_shadow_img', 'Tilemap/Modern_Office_Black_Shadow.png');

        this.load.spritesheet('player_sheet', 'assets/Player.png', { 
            frameWidth: 32, 
            frameHeight: 32 
        });
        
        this.load.spritesheet('security_bot', 'assets/Skeleton.png', { 
            frameWidth: 32, 
            frameHeight: 32 
        });
    }

    create() {
        this.scene.start('GameScene');
    }
}