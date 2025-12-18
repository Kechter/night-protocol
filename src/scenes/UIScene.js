import { KEY_CONFIG } from '../utils/Constants.js';

export class UIScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UIScene' });
    }

    create() {
        // Diese Szene hat KEINEN Zoom (Default 1) -> UI ist scharf und passt auf den Schirm
        this.createInventoryUI();
        
        // Listener: Wenn GameScene sagt "Update Inventar", machen wir das
        const gameScene = this.scene.get('GameScene');
        gameScene.events.on('updateInventory', this.updateInventory, this);
    }

    createInventoryUI() {
        this.uiGroup = this.add.group();
        this.slotCount = 5;
        this.slotSize = 40;
        this.gap = 8;
        
        // Positionierung (800x600 Screen)
        const totalWidth = (this.slotCount * this.slotSize) + ((this.slotCount - 1) * this.gap);
        this.startX = (800 - totalWidth) / 2;
        this.startY = 540; // Unten Mitte
        
        this.drawSlots([]); // Leer zeichnen
    }

    updateInventory(collectedKeys) {
        this.drawSlots(collectedKeys);
    }

    drawSlots(keysArray) {
        this.uiGroup.clear(true, true);

        for (let i = 0; i < this.slotCount; i++) {
            const x = this.startX + (i * (this.slotSize + this.gap));
            const y = this.startY;

            // Slot Box
            const slotBg = this.add.rectangle(x, y, this.slotSize, this.slotSize, 0x222222, 0.8)
                .setOrigin(0, 0)
                .setStrokeStyle(2, 0x555555);
            this.uiGroup.add(slotBg);

            // Item
            if (i < keysArray.length) {
                const keyID = keysArray[i];
                const config = KEY_CONFIG[keyID] || KEY_CONFIG['default'];

                const icon = this.add.image(x + this.slotSize/2, y + this.slotSize/2, 'item_key_gold')
                    .setScale(0.8)
                    .setTint(config.color);
                this.uiGroup.add(icon);
            }
        }
    }
}