import { DEPTH, KEY_CONFIG } from '../utils/Constants.js';

export class KeyItem extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, keyID, texture, frame) {
        // Wir nutzen immer den goldenen Key als Basis, weil wir ihn einfärben
        super(scene, x, y, 'item_key_gold'); 
        
        this.scene = scene;
        this.keyID = String(keyID).trim();

        scene.add.existing(this);
        scene.physics.add.existing(this, true); 

        this.setDepth(DEPTH.PROMPT); 
        this.body.setCircle(6, 2, 2); 

        // --- FARBE ANWENDEN ---
        const config = KEY_CONFIG[this.keyID] || KEY_CONFIG['default'];
        this.setTint(config.color);

        // Animation
        this.scene.tweens.add({
            targets: this,
            scaleX: 0.9,
            scaleY: 0.9,
            duration: 800,
            yoyo: true,
            repeat: -1
        });

        // Clickable fallback (if spawned behind a wall)
        this.setInteractive({ useHandCursor: true });
        this.on('pointerdown', () => {
            if (this.scene.player) {
                // Determine distance to make sure player is somewhat near
                const dist = Phaser.Math.Distance.Between(this.x, this.y, this.scene.player.x, this.scene.player.y);
                if (dist < 150) {
                    this.collect(this.scene.player);
                } else {
                    const uiScene = this.scene.scene.get("UIScene");
                    if (uiScene && uiScene.showNotification) {
                        uiScene.showNotification("ZU WEIT WEG", 0xffaa00);
                    }
                }
            }
        });
    }

    collect(player) {
        if (player.inventory) {
            const added = player.inventory.addKey(this.keyID);
            
            if (added) {
                // UI Effekt: Key fliegt zur Inventar-Leiste (optional cool)
                this.scene.tweens.add({
                    targets: this,
                    y: this.y - 30,
                    alpha: 0,
                    duration: 300,
                    onComplete: () => {
                        this.destroy();
                    }
                });
            }
        }
    }
}