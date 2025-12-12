import { BOT_STATE, PHYSICS_CONFIG, DEPTH } from '../utils/Constants.js';

// Setze dies auf false, um die grünen/roten Hilfslinien auszublenden
const SHOW_DEBUG = true;

export class SecurityBot extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, path, blockingLayers) {
        super(scene, x, y, 'security_bot', 0);
        
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setImmovable(true);
        this.setCollideWorldBounds(true);
        this.setDepth(DEPTH.ENTITIES);

        // --- HITBOX ---
        this.body.setSize(12, 12);   
        this.body.setOffset(10, 20); 

        // State & Path
        this.state = BOT_STATE.PATROL;
        this.path = path || [];
        this.pathIndex = 0; 
        
        // Timer für State-Wechsel (z.B. beim Suchen), aber nicht mehr fürs Patrouillieren
        this.stateTimer = null; 

        this.target = scene.player; 
        this.blockingLayers = blockingLayers || []; 
        this.lastKnownLocation = null;

        // Anti-Stuck
        this.lastPosition = { x: x, y: y };
        this.stuckTimer = 0;

        // Debug
        if (SHOW_DEBUG) {
            this.debugGraphic = scene.add.graphics();
            this.debugGraphic.setDepth(DEPTH.UI);
        }

        this.initAnimations();
    }

    initAnimations() {
        const anims = this.scene.anims;
        const sheet = 'security_bot';
        const frameRate = 8;

        if (!anims.exists('bot-idle-down')) {
            anims.create({ key: 'bot-idle-down', frames: anims.generateFrameNumbers(sheet, { start: 0, end: 5 }), frameRate, repeat: -1 });
            anims.create({ key: 'bot-idle-side', frames: anims.generateFrameNumbers(sheet, { start: 6, end: 11 }), frameRate, repeat: -1 });
            anims.create({ key: 'bot-idle-up',   frames: anims.generateFrameNumbers(sheet, { start: 12, end: 17 }), frameRate, repeat: -1 });

            anims.create({ key: 'bot-walk-down', frames: anims.generateFrameNumbers(sheet, { start: 18, end: 23 }), frameRate, repeat: -1 });
            anims.create({ key: 'bot-walk-side', frames: anims.generateFrameNumbers(sheet, { start: 24, end: 29 }), frameRate, repeat: -1 });
            anims.create({ key: 'bot-walk-up',   frames: anims.generateFrameNumbers(sheet, { start: 30, end: 35 }), frameRate, repeat: -1 });
        }
    }

    preUpdate(time, delta) {
        super.preUpdate(time, delta);
        
        if (SHOW_DEBUG) this.drawDebug();

        if (!this.target) return;

        // Vision wieder aktivieren!
        this.checkVision(); 
        
        this.updateStateMachine();
        this.updateAnimation();
        
        // Nur prüfen wenn er sich wirklich bewegen soll
        if (this.state === BOT_STATE.PATROL) {
            this.checkIfStuck(time);
        }
    }

    drawDebug() {
        if (!this.debugGraphic) return;
        this.debugGraphic.clear();
        this.debugGraphic.lineStyle(1, 0x00ff00, 1);
        this.debugGraphic.strokeRect(this.body.x, this.body.y, this.body.width, this.body.height);

        if (this.state === BOT_STATE.PATROL && this.path.length > 0) {
            const point = this.path[this.pathIndex];
            this.debugGraphic.lineStyle(1, 0xff0000, 0.8);
            this.debugGraphic.lineBetween(this.body.center.x, this.body.center.y, point.x, point.y);
        }
    }

    destroy(fromScene) {
        if (this.debugGraphic) this.debugGraphic.destroy();
        super.destroy(fromScene);
    }

    checkIfStuck(time) {
        if (time > this.stuckTimer) {
            const dist = Phaser.Math.Distance.Between(this.body.x, this.body.y, this.lastPosition.x, this.lastPosition.y);
            
            // Wenn er hängt (fast 0 Bewegung), zum nächsten Punkt zwingen
            if (dist < 2) {
                this.nextPathPoint();
            }
            
            this.lastPosition = { x: this.body.x, y: this.body.y };
            this.stuckTimer = time + 1000;
        }
    }

    updateStateMachine() {
        switch (this.state) {
            case BOT_STATE.PATROL: this.handlePatrol(); break;
            case BOT_STATE.CHASE:  this.handleChase(); break;
            case BOT_STATE.SEARCH: this.handleSearch(); break;
        }
    }

    // --- NEUE, VEREINFACHTE PATROUILLE ---
    handlePatrol() {
        if (!this.path || this.path.length === 0) return;
        
        const targetPoint = this.path[this.pathIndex];
        
        // Distanz zur Mitte der Hitbox
        const dist = Phaser.Math.Distance.Between(this.body.center.x, this.body.center.y, targetPoint.x, targetPoint.y);

        // Wenn nah genug (5px Toleranz), SOFORT nächstes Ziel wählen.
        // Kein Stop, kein Reset, kein Warten -> Keine Bugs.
        if (dist < 5) {
            this.nextPathPoint();
        } else {
            this.scene.physics.moveTo(this, targetPoint.x, targetPoint.y, PHYSICS_CONFIG.BOT_PATROL_SPEED);
        }
    }

    nextPathPoint() {
        this.pathIndex = (this.pathIndex + 1) % this.path.length;
    }

    handleChase() {
        this.clearStateTimer();
        this.scene.physics.moveToObject(this, this.target, PHYSICS_CONFIG.BOT_CHASE_SPEED);
    }

    handleSearch() {
        this.clearStateTimer();
        if (!this.lastKnownLocation) { 
            this.state = BOT_STATE.PATROL; 
            return; 
        }

        const dist = Phaser.Math.Distance.Between(this.x, this.y, this.lastKnownLocation.x, this.lastKnownLocation.y);
        
        if (dist < 10) {
            this.setVelocity(0, 0);
            this.lastKnownLocation = null;
            
            // Hier nutzen wir einen Timer, weil er sich ja "umschaut"
            this.stateTimer = this.scene.time.delayedCall(1500, () => { 
                this.state = BOT_STATE.PATROL; 
            }, [], this);
        } else {
            this.scene.physics.moveTo(this, this.lastKnownLocation.x, this.lastKnownLocation.y, PHYSICS_CONFIG.BOT_PATROL_SPEED);
        }
    }

    clearStateTimer() {
        if (this.stateTimer) {
            this.stateTimer.remove(false);
            this.stateTimer = null;
        }
    }

    checkVision() {
        const dist = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);

        if (dist > PHYSICS_CONFIG.VISION_RANGE) {
            if (this.state !== BOT_STATE.SEARCH) this.state = BOT_STATE.PATROL;
            return;
        }

        const angleToTarget = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
        let currentRotation = this.rotation;
        
        // Rotation nur aktualisieren wenn er sich bewegt, damit er nicht "snappt"
        if (this.body.speed > 10) {
            currentRotation = Math.atan2(this.body.velocity.y, this.body.velocity.x);
        }

        const angleDiff = Math.abs(Phaser.Math.Angle.Wrap(angleToTarget - currentRotation));
        
        if (angleDiff >= Phaser.Math.DEG_TO_RAD * (PHYSICS_CONFIG.VISION_ANGLE / 2)) {
            if (this.state === BOT_STATE.CHASE) this.state = BOT_STATE.SEARCH;
            return;
        }
        
        const line = new Phaser.Geom.Line(this.x, this.y, this.target.x, this.target.y);
        let isObstructed = false;
        
        for (let layer of this.blockingLayers) {
            if (!layer) continue;
            // Nur Kollisions-Tiles blockieren die Sicht
            const tiles = layer.getTilesWithinShape(line);
            if (tiles.some(tile => (tile.index > 0 && tile.collides))) { 
                isObstructed = true; 
                break; 
            }
        }

        if (!isObstructed) {
            this.state = BOT_STATE.CHASE;
            this.lastKnownLocation = { x: this.target.x, y: this.target.y };
        } else if (this.state === BOT_STATE.CHASE) {
            this.state = BOT_STATE.SEARCH;
        }
    }

    updateAnimation() {
        // Toleranz für "Idle" erhöht, damit er nicht flackert wenn er langsam ist
        if (this.body.speed < 10) {
            if (this.anims.currentAnim && this.anims.currentAnim.key.includes('walk')) {
                 this.play('bot-idle-down', true);
            }
            return;
        }

        const vx = this.body.velocity.x;
        const vy = this.body.velocity.y;

        if (Math.abs(vx) > Math.abs(vy)) {
            this.play('bot-walk-side', true);
            this.setFlipX(vx < 0);
        } else {
            if (vy > 0) this.play('bot-walk-down', true);
            else this.play('bot-walk-up', true);
        }
    }
}