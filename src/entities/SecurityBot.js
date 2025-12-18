import { BOT_STATE, PHYSICS_CONFIG, DEPTH } from '../utils/Constants.js';

export class SecurityBot extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, path, blockingLayers) {
        super(scene, x, y, 'security_bot', 0);
        
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setImmovable(true);
        this.setCollideWorldBounds(true);
        this.setDepth(DEPTH.ENTITIES);
        this.body.setCircle(6, 10, 16); 

        this.state = BOT_STATE.PATROL;
        this.path = path || [];
        this.pathIndex = 0; 
        
        this.breadcrumbs = []; 
        this.lastBreadcrumbPos = { x: x, y: y };
        
        this.stagnationTimer = 0;     
        this.lastDistanceToTarget = 9999; 

        this.stateTimer = null; 
        this.target = scene.player; 
        this.blockingLayers = blockingLayers || []; 
        this.lastKnownLocation = null;

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
        if (!this.target) return;
        this.checkVision(); 
        this.updateStateMachine(time, delta);
        this.updateAnimation();
    }

    moveAndCheckArrival(targetX, targetY, speed, radius, delta) {
        const dist = Phaser.Math.Distance.Between(this.x, this.y, targetX, targetY);
        const stepDistance = (speed * delta) / 1000;

        if (dist < stepDistance || dist <= radius) {
            this.body.reset(targetX, targetY); 
            this.stagnationTimer = 0;
            this.lastDistanceToTarget = 9999;
            return true; 
        } 

        const improvement = this.lastDistanceToTarget - dist;
        if (Math.abs(improvement) < 0.2) {
            this.stagnationTimer += delta;
        } else {
            this.stagnationTimer = Math.max(0, this.stagnationTimer - delta);
        }

        this.lastDistanceToTarget = dist;

        if (this.stagnationTimer > 500) {
            this.stagnationTimer = 0;
            this.lastDistanceToTarget = 9999;
            return true;
        }
        
        this.scene.physics.moveTo(this, targetX, targetY, speed);
        return false; 
    }

    updateStateMachine(time, delta) {
        switch (this.state) {
            case BOT_STATE.PATROL: this.handlePatrol(delta); break;
            case BOT_STATE.CHASE:  this.handleChase(); break;
            case BOT_STATE.SEARCH: this.handleSearch(delta); break; 
            case BOT_STATE.RETURN: this.handleReturn(time, delta); break; 
        }
    }

    handlePatrol(delta) {
        if (!this.path || this.path.length === 0) return;
        if (this.breadcrumbs.length > 0) this.breadcrumbs = [];
        const targetPoint = this.path[this.pathIndex];
        if (this.moveAndCheckArrival(targetPoint.x, targetPoint.y, PHYSICS_CONFIG.BOT_PATROL_SPEED, 2, delta)) {
            this.nextPathPoint();
        }
    }

    nextPathPoint() {
        this.pathIndex = (this.pathIndex + 1) % this.path.length;
        this.stagnationTimer = 0;
        this.lastDistanceToTarget = 9999;
    }

    handleChase() {
        this.clearStateTimer();
        this.dropBreadcrumb(); 
        this.scene.physics.moveToObject(this, this.target, PHYSICS_CONFIG.BOT_CHASE_SPEED);
    }

    handleSearch(delta) {
        this.clearStateTimer();
        this.dropBreadcrumb(); 
        if (!this.lastKnownLocation) { this.startReturn(); return; }
        if (this.moveAndCheckArrival(this.lastKnownLocation.x, this.lastKnownLocation.y, PHYSICS_CONFIG.BOT_PATROL_SPEED, 10, delta)) {
            this.setVelocity(0, 0);
            this.lastKnownLocation = null;
            this.stateTimer = this.scene.time.delayedCall(1500, () => { this.startReturn(); }, [], this);
        }
    }

    dropBreadcrumb() {
        const dist = Phaser.Math.Distance.Between(this.x, this.y, this.lastBreadcrumbPos.x, this.lastBreadcrumbPos.y);
        if (dist > 40) {
            const snapX = Math.floor(this.x / 16) * 16 + 8;
            const snapY = Math.floor(this.y / 16) * 16 + 8;
            this.breadcrumbs.push({ x: snapX, y: snapY });
            this.lastBreadcrumbPos = { x: this.x, y: this.y };
        }
    }

    startReturn() {
        this.state = BOT_STATE.RETURN;
        this.stagnationTimer = 0; 
        this.lastDistanceToTarget = 9999;
    }

    handleReturn(time, delta) {
        if (this.breadcrumbs.length === 0) {
            this.state = BOT_STATE.PATROL;
            this.findResumePatrolPoint();
            return;
        }
        let nextTarget = this.breadcrumbs[this.breadcrumbs.length - 1];
        if (this.moveAndCheckArrival(nextTarget.x, nextTarget.y, PHYSICS_CONFIG.BOT_PATROL_SPEED, 4, delta)) {
            this.breadcrumbs.pop(); 
            this.stagnationTimer = 0;
            this.lastDistanceToTarget = 9999;
        }
    }

    findResumePatrolPoint() {
        if (!this.path || this.path.length === 0) return;
        let closestDist = Infinity;
        let closestIndex = 0;
        this.path.forEach((point, index) => {
            const dist = Phaser.Math.Distance.Between(this.x, this.y, point.x, point.y);
            if (dist < closestDist) { closestDist = dist; closestIndex = index; }
        });
        this.pathIndex = (closestIndex + 1) % this.path.length;
    }

    clearStateTimer() {
        if (this.stateTimer) { this.stateTimer.remove(false); this.stateTimer = null; }
    }

    checkVision() {
        const dist = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
        if (dist > PHYSICS_CONFIG.VISION_RANGE) {
            if (this.state === BOT_STATE.CHASE) this.state = BOT_STATE.SEARCH;
            return;
        }
        const angleToTarget = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
        let currentRotation = this.rotation;
        if (this.body.speed > 10) currentRotation = Math.atan2(this.body.velocity.y, this.body.velocity.x);
        const angleDiff = Math.abs(Phaser.Math.Angle.Wrap(angleToTarget - currentRotation));
        
        if (angleDiff >= Phaser.Math.DEG_TO_RAD * (PHYSICS_CONFIG.VISION_ANGLE / 2)) {
            if (this.state === BOT_STATE.CHASE) this.state = BOT_STATE.SEARCH;
            return;
        }
        
        const line = new Phaser.Geom.Line(this.x, this.y, this.target.x, this.target.y);
        let isObstructed = false;
        for (let layer of this.blockingLayers) {
            if (!layer) continue;
            const tiles = layer.getTilesWithinShape(line);
            if (tiles.some(tile => (tile.index > 0 && tile.collides))) { isObstructed = true; break; }
        }

        if (!isObstructed) {
            this.state = BOT_STATE.CHASE;
            this.lastKnownLocation = { x: this.target.x, y: this.target.y };
            if (this.state === BOT_STATE.RETURN || this.state === BOT_STATE.PATROL) {
                this.breadcrumbs = [];
                this.lastBreadcrumbPos = { x: this.x, y: this.y };
            }
        } else if (this.state === BOT_STATE.CHASE) {
            this.state = BOT_STATE.SEARCH;
        }
    }

    updateAnimation() {
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