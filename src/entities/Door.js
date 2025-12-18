import { DEPTH, KEY_CONFIG } from '../utils/Constants.js';

export class Door extends Phaser.GameObjects.Rectangle {
    constructor(scene, x, y, properties, width, height) {
        // Unsichtbares Rechteck (Alpha 0)
        super(scene, x, y, width, height, 0x000000, 0); 
        
        this.scene = scene;
        
        const rawID = properties.reqKeyID || properties.keyID || properties.id;
        this.reqKeyID = rawID ? String(rawID) : null;

        if (this.reqKeyID) {
            this.isLocked = true;
        } else {
            this.isLocked = properties.locked !== undefined ? properties.locked : false; 
        }

        scene.add.existing(this);
        scene.physics.add.existing(this, true); 

        // Fix: Wand-Kollision unter der Tür ausschalten
        this.scene.time.delayedCall(50, () => this.disableWallCollisionUnderDoor());

        // Schloss Icon
        if (this.isLocked && this.reqKeyID) {
            this.addLockIcon();
        }
    }

    addLockIcon() {
        const config = KEY_CONFIG[this.reqKeyID] || KEY_CONFIG['default'];
        this.lockIcon = this.scene.add.sprite(this.x, this.y, 'item_key_gold');
        this.lockIcon.setDepth(DEPTH.UI); 
        this.lockIcon.setScale(0.8);
        this.lockIcon.setTint(config.color); 
        
        this.scene.tweens.add({
            targets: this.lockIcon,
            y: this.y - 2,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    disableWallCollisionUnderDoor() {
        const layer = this.scene.wallsLayer;
        if (!layer) return;
        const topLeftX = this.x - (this.width / 2);
        const topLeftY = this.y - (this.height / 2);
        const tiles = layer.getTilesWithinWorldXY(topLeftX, topLeftY, this.width, this.height);
        tiles.forEach(tile => { if (tile.index !== -1) tile.setCollision(false, false, false, false); });
    }

    tryOpen(player) {
        if (this.isOpen) return;

        if (!this.isLocked) {
            this.open();
            return;
        }
        
        if (player.inventory && player.inventory.hasKey(this.reqKeyID)) {
            this.open();
        } else {
            // Wackel-Effekt bei Fehlschlag
            if (this.lockIcon) {
                this.scene.tweens.add({
                    targets: this.lockIcon,
                    x: this.x + 5,
                    duration: 50,
                    yoyo: true,
                    repeat: 5
                });
            }
            this.showLockedMessage();
        }
    }

    open() {
        this.isOpen = true;
        if (this.lockIcon) this.lockIcon.destroy();

        const topLeftX = this.x - (this.width / 2);
        const topLeftY = this.y - (this.height / 2);
        const layer = this.scene.wallsLayer;
        const startTile = layer.worldToTileXY(topLeftX, topLeftY);
        const w = Math.ceil(this.width / 16);
        const h = Math.ceil(this.height / 16);
        for(let dx=0; dx < w; dx++) {
            for(let dy=0; dy < h; dy++) {
                layer.removeTileAt(startTile.x + dx, startTile.y + dy);
            }
        }
        this.destroy(); 
    }

    showLockedMessage() {
        if (this.msgText) return;
        this.msgText = this.scene.add.text(this.x, this.y - 40, "LOCKED", {
             fontSize: '10px', fill: '#ff0000', backgroundColor: '#000', padding: { x: 2, y: 2 }
        }).setOrigin(0.5).setDepth(DEPTH.UI);
        this.scene.time.delayedCall(1000, () => {
             if (this.msgText) this.msgText.destroy();
             this.msgText = null;
        });
    }
}