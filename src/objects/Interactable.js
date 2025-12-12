export class Interactable extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture, frame) {
        super(scene, x, y, texture, frame);
        scene.add.existing(this);
        scene.physics.add.existing(this, true); // Static body
    }

    interact(player) {
        console.log("Interaction triggered!");
        // Überschreiben in Subklassen (Terminal, Door, Item)
    }
}