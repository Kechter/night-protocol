export class PreloadScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PreloadScene' });
    }

    preload() {
        // --- 1. TILEMAP & TILESETS ---
        this.load.tilemapTiledJSON('mainMap', 'Tilemap/test.json'); 
        
        this.load.image('walls_floor_img', 'Tilemap/walls_floor.png'); 
        this.load.image('office_img', 'Tilemap/Room_Builder_Office_16x16.png');
        this.load.image('office_shadow_img', 'Tilemap/Modern_Office_Black_Shadow.png');

        // Passe den Pfad an, wo die Datei wirklich liegt!
        this.load.image('office_full_img', 'Tilemap/Office Tileset All 16x16 no shadow.png');

        // --- 2. SPRITES & ITEMS ---
        this.load.spritesheet('player_sheet', 'assets/Player.png', { 
            frameWidth: 32, 
            frameHeight: 32 
        });
        
        this.load.spritesheet('security_bot', 'assets/Skeleton.png', { 
            frameWidth: 32, 
            frameHeight: 32 
        });

        this.load.image('item_key_gold', 'assets/item673.png');
    }

    create() {
        this.scene.start('GameScene');
    }
}