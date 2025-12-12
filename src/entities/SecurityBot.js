import { BOT_STATE, PHYSICS_CONFIG, DEPTH } from '../utils/Constants.js';

const SHOW_DEBUG = true;

export class SecurityBot extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, path, blockingLayers) {
        super(scene, x, y, 'security_bot', 0);
        
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setImmovable(true);
        this.setCollideWorldBounds(true);
        this.setDepth(DEPTH.ENTITIES);

        // --- HITBOX OPTIMIERUNG ---
        // Eine runde/kleinere Hitbox verhindert das Hängenbleiben an Ecken
        this.body.setCircle(6, 10, 16); 

        // State & Path
        this.state = BOT_STATE.PATROL;
        this.path = path || [];
        this.pathIndex = 0; 
        
        // --- BREADCRUMB SYSTEM ---
        this.breadcrumbs = []; 
        this.lastBreadcrumbPos = { x: x, y: y };
        
        // Anti-Jitter & Stuck Variablen
        this.stagnationTimer = 0;     
        this.lastDistanceToTarget = 9999; 
        // -------------------------

        this.stateTimer = null; 
        this.target = scene.player; 
        this.blockingLayers = blockingLayers || []; 
        this.lastKnownLocation = null;

        // Debug
        if (SHOW_DEBUG) {
            this.debugGraphic = scene.add.graphics();
            this.debugGraphic.setDepth(DEPTH.UI);
            this.debugText = scene.add.text(x, y - 40, '', { 
                fontSize: '10px', fill: '#00ff00', backgroundColor: '#00000088' 
            }).setDepth(DEPTH.UI);
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
        
        if (SHOW_DEBUG) this.updateDebugInfo();

        if (!this.target) return;

        this.checkVision(); 
        this.updateStateMachine(time, delta);
        this.updateAnimation();
    }

    // --- ROBUSTE BEWEGUNG (ANTI-JITTER & ANTI-STUCK) ---
    moveAndCheckArrival(targetX, targetY, speed, radius, delta) {
        const dist = Phaser.Math.Distance.Between(this.x, this.y, targetX, targetY);

        // 1. OVERSHOOT PREVENTION (Das verhindert das Zittern)
        // Wir berechnen, wie weit wir uns diesen Frame bewegen würden (Pixel)
        // delta ist in ms, speed in px/sec. -> (delta / 1000) * speed
        const stepDistance = (speed * delta) / 1000;

        // Wenn wir näher sind als ein Schritt, schnappen wir direkt zum Ziel
        if (dist < stepDistance || dist <= radius) {
            this.body.reset(targetX, targetY); // Physik Reset auf Position
            this.stagnationTimer = 0;
            this.lastDistanceToTarget = 9999;
            return true; // Angekommen
        } 

        // 2. STAGNATION CHECK (Anti-Wall-Stuck)
        // Wir prüfen, ob wir trotz Bewegung nicht näher kommen
        const improvement = this.lastDistanceToTarget - dist;
        
        // Wenn Verbesserung kleiner als 0.2px ist (wir hängen an einer Wand), zählen wir hoch
        if (Math.abs(improvement) < 0.2) {
            this.stagnationTimer += delta;
        } else {
            this.stagnationTimer = Math.max(0, this.stagnationTimer - delta);
        }

        this.lastDistanceToTarget = dist;

        // Timeout: Wenn wir 500ms lang feststecken, erzwingen wir "Angekommen".
        // Das löst das Problem, wenn der Bot gegen eine Ecke läuft.
        if (this.stagnationTimer > 500) {
            if (SHOW_DEBUG) console.log("⚠️ Stagnation! Skipping waypoint or stopping search.");
            this.stagnationTimer = 0;
            this.lastDistanceToTarget = 9999;
            return true; // Force Arrival
        }
        
        // Normale Bewegung
        this.scene.physics.moveTo(this, targetX, targetY, speed);
        return false; 
    }

    updateStateMachine(time, delta) {
        switch (this.state) {
            case BOT_STATE.PATROL: this.handlePatrol(delta); break;
            case BOT_STATE.CHASE:  this.handleChase(); break;
            case BOT_STATE.SEARCH: this.handleSearch(delta); break; // Delta übergeben!
            case BOT_STATE.RETURN: this.handleReturn(time, delta); break; 
        }
    }

    handlePatrol(delta) {
        if (!this.path || this.path.length === 0) return;
        if (this.breadcrumbs.length > 0) this.breadcrumbs = [];

        const targetPoint = this.path[this.pathIndex];
        
        // Radius 2px ist okay dank Overshoot-Fix
        const arrived = this.moveAndCheckArrival(targetPoint.x, targetPoint.y, PHYSICS_CONFIG.BOT_PATROL_SPEED, 2, delta);

        if (arrived) {
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
        // MoveToObject ist okay, da sich Target bewegt und wir bei Kollision in SEARCH wechseln
        this.scene.physics.moveToObject(this, this.target, PHYSICS_CONFIG.BOT_CHASE_SPEED);
    }

    handleSearch(delta) {
        this.clearStateTimer();
        this.dropBreadcrumb(); 
        
        // Wenn kein Ort bekannt ist, direkt zurückkehren
        if (!this.lastKnownLocation) { 
            this.startReturn(); 
            return; 
        }

        // FIX: Nutze moveAndCheckArrival statt einfachem moveTo
        // Das sorgt dafür, dass der Bot aufhört gegen die Wand zu rennen, wenn er stuck ist.
        const arrived = this.moveAndCheckArrival(
            this.lastKnownLocation.x, 
            this.lastKnownLocation.y, 
            PHYSICS_CONFIG.BOT_PATROL_SPEED, 
            10, // Größerer Radius für Suche (10px)
            delta
        );
        
        if (arrived) {
            this.setVelocity(0, 0);
            this.lastKnownLocation = null;
            // Kurze Pause (Umschauen), dann Rückweg
            this.stateTimer = this.scene.time.delayedCall(1500, () => { 
                this.startReturn(); 
            }, [], this);
        }
    }

    dropBreadcrumb() {
        const dist = Phaser.Math.Distance.Between(this.x, this.y, this.lastBreadcrumbPos.x, this.lastBreadcrumbPos.y);
        
        // Alle 40px einen Punkt setzen
        if (dist > 40) {
            // Tile Snapping (auf Mitte des 16er Grids runden)
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
        // Wenn keine Brotkrumen mehr da sind, finden wir den Patrouillenweg wieder
        if (this.breadcrumbs.length === 0) {
            this.state = BOT_STATE.PATROL;
            this.findResumePatrolPoint();
            return;
        }

        // Ziel ist der letzte Punkt im Array
        let nextTarget = this.breadcrumbs[this.breadcrumbs.length - 1];
        
        // Toleranz 4px
        const arrived = this.moveAndCheckArrival(nextTarget.x, nextTarget.y, PHYSICS_CONFIG.BOT_PATROL_SPEED, 4, delta);

        if (arrived) {
            this.breadcrumbs.pop(); // Punkt entfernen
            this.stagnationTimer = 0;
            this.lastDistanceToTarget = 9999;
        }
    }

    findResumePatrolPoint() {
        if (!this.path || this.path.length === 0) return;

        let closestDist = Infinity;
        let closestIndex = 0;

        // Finde den absolut nächsten Punkt
        this.path.forEach((point, index) => {
            const dist = Phaser.Math.Distance.Between(this.x, this.y, point.x, point.y);
            if (dist < closestDist) {
                closestDist = dist;
                closestIndex = index;
            }
        });

        // Gehe zum DARAUFFOLGENDEN Punkt für "Forward Momentum"
        this.pathIndex = (closestIndex + 1) % this.path.length;
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
            if (this.state === BOT_STATE.CHASE) this.state = BOT_STATE.SEARCH;
            return;
        }

        const angleToTarget = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
        let currentRotation = this.rotation;
        
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
            const tiles = layer.getTilesWithinShape(line);
            if (tiles.some(tile => (tile.index > 0 && tile.collides))) { 
                isObstructed = true; 
                break; 
            }
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

    updateDebugInfo() {
        if (!this.debugGraphic || !this.debugText) return;
        
        this.debugGraphic.clear();
        
        // Hitbox
        this.debugGraphic.lineStyle(1, 0x00ff00, 1);
        if (this.body.isCircle) {
            this.debugGraphic.strokeCircle(this.body.x + this.body.width/2, this.body.y + this.body.height/2, this.body.halfWidth);
        } else {
            this.debugGraphic.strokeRect(this.body.x, this.body.y, this.body.width, this.body.height);
        }

        this.debugText.setPosition(this.x - 20, this.y - 50);
        
        let targetX = 0, targetY = 0;
        let dist = 0;

        // Visualisiere Ziel basierend auf State
        if (this.state === BOT_STATE.PATROL && this.path.length > 0) {
            const p = this.path[this.pathIndex];
            targetX = p.x; targetY = p.y;
        } else if (this.state === BOT_STATE.RETURN && this.breadcrumbs.length > 0) {
            const p = this.breadcrumbs[this.breadcrumbs.length - 1];
            targetX = p.x; targetY = p.y;
        } else if (this.state === BOT_STATE.SEARCH && this.lastKnownLocation) {
            // FIX: Jetzt sehen wir auch im Search Mode, wo er hin will
            targetX = this.lastKnownLocation.x; targetY = this.lastKnownLocation.y;
        }

        if (targetX !== 0) {
            dist = Phaser.Math.Distance.Between(this.body.center.x, this.body.center.y, targetX, targetY);
            this.debugGraphic.lineStyle(1, 0xff0000, 0.8);
            this.debugGraphic.lineBetween(this.body.center.x, this.body.center.y, targetX, targetY);
            this.debugGraphic.fillStyle(0xff0000, 1);
            this.debugGraphic.fillCircle(targetX, targetY, 3);
        }

        this.debugText.setText(
            `State: ${this.state}\n` +
            `Stag: ${Math.floor(this.stagnationTimer)}\n` +
            `Dist: ${dist.toFixed(1)}`
        );

        if (this.breadcrumbs.length > 0) {
            this.debugGraphic.fillStyle(0x0000ff, 0.5);
            this.breadcrumbs.forEach(p => this.debugGraphic.fillCircle(p.x, p.y, 2));
        }
    }

    destroy(fromScene) {
        if (this.debugGraphic) this.debugGraphic.destroy();
        if (this.debugText) this.debugText.destroy();
        super.destroy(fromScene);
    }
}