import { BOT_STATE, PHYSICS_CONFIG, DEPTH } from "../utils/Constants.js";
import { getDifficulty } from "../utils/DifficultyConfig.js";

export class SecurityBot extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, path, blockingLayers) {
    super(scene, x, y, "security_bot", 0);

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
    this._lastState = BOT_STATE.PATROL;
    this.facingAngle = Math.PI / 2; // Default facing down

    // Vision cone graphics - above darkness (mapHeight+10000) so always visible
    this.visionCone = scene.add.graphics();
    this.visionCone.setDepth(scene.map.heightInPixels + 10001);

    this.initAnimations();
  }

  initAnimations() {
    const anims = this.scene.anims;
    const sheet = "security_bot";
    const frameRate = 8;

    if (!anims.exists("bot-idle-down")) {
      anims.create({
        key: "bot-idle-down",
        frames: anims.generateFrameNumbers(sheet, { start: 0, end: 5 }),
        frameRate,
        repeat: -1,
      });
      anims.create({
        key: "bot-idle-side",
        frames: anims.generateFrameNumbers(sheet, { start: 6, end: 11 }),
        frameRate,
        repeat: -1,
      });
      anims.create({
        key: "bot-idle-up",
        frames: anims.generateFrameNumbers(sheet, { start: 12, end: 17 }),
        frameRate,
        repeat: -1,
      });
      anims.create({
        key: "bot-walk-down",
        frames: anims.generateFrameNumbers(sheet, { start: 18, end: 23 }),
        frameRate,
        repeat: -1,
      });
      anims.create({
        key: "bot-walk-side",
        frames: anims.generateFrameNumbers(sheet, { start: 24, end: 29 }),
        frameRate,
        repeat: -1,
      });
      anims.create({
        key: "bot-walk-up",
        frames: anims.generateFrameNumbers(sheet, { start: 30, end: 35 }),
        frameRate,
        repeat: -1,
      });
    }
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.target) return;

    // Track facing direction from movement
    if (this.body.speed > 10) {
      this.facingAngle = Math.atan2(this.body.velocity.y, this.body.velocity.x);
    }

    this.checkVision();
    this.updateStateMachine(time, delta);
    this.updateAnimation();
    this.drawVisionCone();

    // Show alert icon on state change
    if (this.state !== this._lastState) {
      // Das "!" erscheint jetzt schon beim STUNNED state (Entdeckung)
      if (this.state === BOT_STATE.STUNNED || (this.state === BOT_STATE.CHASE && this._lastState !== BOT_STATE.STUNNED)) {
        this.showAlert("!");
      }
      if (this.state === BOT_STATE.SEARCH) {
        this.showAlert("?");
      }
      this._lastState = this.state;
    }
  }

  drawVisionCone() {
    this.visionCone.clear();
    if (!this.active) return;

    const diff = getDifficulty();
    const range = diff.visionRange;
    const halfAngle = Phaser.Math.DegToRad(diff.visionAngle / 2);

    // Color based on state
    let color = 0xffff00;
    let alpha = 0.08;
    if (this.state === BOT_STATE.CHASE || this.state === BOT_STATE.STUNNED) {
      color = 0xff0000;
      alpha = 0.15;
    } else if (this.state === BOT_STATE.SEARCH) {
      color = 0xff8800;
      alpha = 0.12;
    }

    const startAngle = this.facingAngle - halfAngle;
    const endAngle = this.facingAngle + halfAngle;
    const steps = 24;

    // OPTIMIERUNG: Aktive Türen einmal auslesen anstatt in jedem einzelnen Schritt des Strahls (das verursacht enormen Lag!)
    const activeDoors = [];
    if (this.scene.doorsGroup) {
      this.scene.doorsGroup.children.iterate((door) => {
        if (door && door.active !== false) {
          activeDoors.push({
            minX: door.x - door.width / 2,
            minY: door.y - door.height / 2,
            maxX: door.x + door.width / 2,
            maxY: door.y + door.height / 2
          });
        }
      });
    }

    const getCollisionDistance = (angle, maxDist) => {
      const stepSize = 12; // Von 8 auf 12 erhöht bringt nochmal ~33% Performance
      const maxSteps = Math.ceil(maxDist / stepSize);
      const dx = Math.cos(angle) * stepSize;
      const dy = Math.sin(angle) * stepSize;
      
      let currentX = this.x;
      let currentY = this.y;
      
      for (let s = 1; s <= maxSteps; s++) {
        currentX += dx;
        currentY += dy;
        
        let hit = false;
        // 1. Check tiled layers
        for (let i = 0; i < this.blockingLayers.length; i++) {
          const layer = this.blockingLayers[i];
          if (!layer) continue;
          const tile = layer.getTileAtWorldXY(currentX, currentY);
          if (tile && tile.index > 0 && tile.collides) {
            hit = true;
            break;
          }
        }
        
        // 2. Check doors
        if (!hit && activeDoors.length > 0) {
          for (let i = 0; i < activeDoors.length; i++) {
            const d = activeDoors[i];
            if (currentX >= d.minX && currentX <= d.maxX &&
                currentY >= d.minY && currentY <= d.maxY) {
              hit = true;
              break;
            }
          }
        }
        
        if (hit) {
          // Genaue Distanz zurückgeben
          return Phaser.Math.Distance.Between(this.x, this.y, currentX, currentY);
        }
      }
      return maxDist;
    };

    // Calculate all points first
    const conePoints = [];
    for (let i = 0; i <= steps; i++) {
      const a = startAngle + (endAngle - startAngle) * (i / steps);
      const dist = getCollisionDistance(a, range);
      conePoints.push({
        x: this.x + Math.cos(a) * dist,
        y: this.y + Math.sin(a) * dist
      });
    }

    // Filled shape
    this.visionCone.fillStyle(color, alpha);
    this.visionCone.beginPath();
    this.visionCone.moveTo(this.x, this.y);
    for (const pt of conePoints) {
      this.visionCone.lineTo(pt.x, pt.y);
    }
    this.visionCone.closePath();
    this.visionCone.fillPath();

    // Subtle edge outline
    this.visionCone.lineStyle(1, color, alpha * 2);
    this.visionCone.beginPath();
    this.visionCone.moveTo(this.x, this.y);
    for (const pt of conePoints) {
      this.visionCone.lineTo(pt.x, pt.y);
    }
    this.visionCone.closePath();
    this.visionCone.strokePath();
  }

  destroy(fromScene) {
    if (this.visionCone) {
      this.visionCone.destroy();
      this.visionCone = null;
    }
    super.destroy(fromScene);
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
      case BOT_STATE.PATROL:
        this.handlePatrol(delta);
        break;
      case BOT_STATE.STUNNED:
        this.handleStunned(delta);
        break;
      case BOT_STATE.CHASE:
        this.handleChase();
        break;
      case BOT_STATE.SEARCH:
        this.handleSearch(delta);
        break;
      case BOT_STATE.RETURN:
        this.handleReturn(time, delta);
        break;
    }
  }

  handleStunned(delta) {
    // Stehenbleiben
    this.setVelocity(0, 0);
    
    // Timer runterzählen
    if (this.stunTimer > 0) {
      this.stunTimer -= delta;
      
      // Drehe den Bot aber trotzdem schon zur Position des Spielers, 
      // damit es realistischer aussieht ("er guckt ihn an")
      this.facingAngle = Phaser.Math.Angle.Between(
        this.x,
        this.y,
        this.target.x,
        this.target.y
      );
      
      if (this.stunTimer <= 0) {
        this.state = BOT_STATE.CHASE;
      }
    } else {
      this.state = BOT_STATE.CHASE;
    }
  }

  handlePatrol(delta) {
    if (!this.path || this.path.length === 0) return;
    if (this.breadcrumbs.length > 0) this.breadcrumbs = [];
    const targetPoint = this.path[this.pathIndex];
    if (
      this.moveAndCheckArrival(
        targetPoint.x,
        targetPoint.y,
        getDifficulty().botPatrolSpeed,
        2,
        delta,
      )
    ) {
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
    this.scene.physics.moveToObject(
      this,
      this.target,
      getDifficulty().botChaseSpeed,
    );
  }

  handleSearch(delta) {
    this.clearStateTimer();
    this.dropBreadcrumb();
    if (!this.lastKnownLocation) {
      this.startReturn();
      return;
    }
    if (
      this.moveAndCheckArrival(
        this.lastKnownLocation.x,
        this.lastKnownLocation.y,
        getDifficulty().botPatrolSpeed,
        10,
        delta,
      )
    ) {
      this.setVelocity(0, 0);
      this.lastKnownLocation = null;
      this.stateTimer = this.scene.time.delayedCall(
        1500,
        () => {
          this.startReturn();
        },
        [],
        this,
      );
    }
  }

  dropBreadcrumb() {
    const dist = Phaser.Math.Distance.Between(
      this.x,
      this.y,
      this.lastBreadcrumbPos.x,
      this.lastBreadcrumbPos.y,
    );
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
    if (
      this.moveAndCheckArrival(
        nextTarget.x,
        nextTarget.y,
        PHYSICS_CONFIG.BOT_PATROL_SPEED,
        4,
        delta,
      )
    ) {
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
      const dist = Phaser.Math.Distance.Between(
        this.x,
        this.y,
        point.x,
        point.y,
      );
      if (dist < closestDist) {
        closestDist = dist;
        closestIndex = index;
      }
    });
    this.pathIndex = (closestIndex + 1) % this.path.length;
  }

  clearStateTimer() {
    if (this.stateTimer) {
      this.stateTimer.remove(false);
      this.stateTimer = null;
    }
  }

  checkVision() {
    const diff = getDifficulty();
    const dist = Phaser.Math.Distance.Between(
      this.x,
      this.y,
      this.target.x,
      this.target.y,
    );
    if (dist > diff.visionRange) {
      if (this.state === BOT_STATE.CHASE || this.state === BOT_STATE.STUNNED) {
        this.state = BOT_STATE.SEARCH;
      }
      return;
    }
    const angleToTarget = Phaser.Math.Angle.Between(
      this.x,
      this.y,
      this.target.x,
      this.target.y,
    );
    // Use tracked facing angle instead of raw rotation
    const currentFacing = this.facingAngle;
    const angleDiff = Math.abs(
      Phaser.Math.Angle.Wrap(angleToTarget - currentFacing),
    );

    if (angleDiff >= Phaser.Math.DEG_TO_RAD * (diff.visionAngle / 2)) {
      if (this.state === BOT_STATE.CHASE || this.state === BOT_STATE.STUNNED) {
        this.state = BOT_STATE.SEARCH;
      }
      return;
    }

    // Stepped raycast: sample tiles every 16px along the line for reliable wall detection
    let isObstructed = false;
    const steps = Math.ceil(dist / 16);
    const dx = (this.target.x - this.x) / steps;
    const dy = (this.target.y - this.y) / steps;

    for (let s = 1; s < steps && !isObstructed; s++) {
      const sx = this.x + dx * s;
      const sy = this.y + dy * s;
      for (const layer of this.blockingLayers) {
        if (!layer) continue;
        const tile = layer.getTileAtWorldXY(sx, sy);
        if (tile && tile.index > 0 && tile.collides) {
          isObstructed = true;
          break;
        }
      }
    }

    // 2. Check closed doors – Door is a Rectangle with a static physics body.
    //    Open doors have already been destroyed (door.isOpen is set then destroy() called).
    if (!isObstructed && this.scene.doorsGroup) {
      const line = new Phaser.Geom.Line(
        this.x,
        this.y,
        this.target.x,
        this.target.y,
      );
      this.scene.doorsGroup.children.iterate((door) => {
        if (isObstructed || !door || door.active === false) return;
        const doorRect = new Phaser.Geom.Rectangle(
          door.x - door.width / 2,
          door.y - door.height / 2,
          door.width,
          door.height,
        );
        if (Phaser.Geom.Intersects.LineToRectangle(line, doorRect)) {
          isObstructed = true;
        }
      });
    }

    if (!isObstructed) {
      this.lastKnownLocation = { x: this.target.x, y: this.target.y };
      
      // Fix: Wenn er davor Patrol oder Return war, haben wir ihn NEU entdeckt
      if (this.state === BOT_STATE.RETURN || this.state === BOT_STATE.PATROL || this.state === BOT_STATE.IDLE) {
        this.breadcrumbs = [];
        this.lastBreadcrumbPos = { x: this.x, y: this.y };
        
        // Start Stun based on Difficulty
        const dfLabel = diff.label || "NORMAL";
        if (dfLabel === "EASY") {
            this.stunTimer = 2000;
            this.state = BOT_STATE.STUNNED;
        } else if (dfLabel === "NORMAL") {
            this.stunTimer = 1000;
            this.state = BOT_STATE.STUNNED;
        } else {
            // HARD oder HARDCORE -> Instant Chase
            this.state = BOT_STATE.CHASE;
        }
      } 
      // Wenn er schon SEARCH war (aber noch nicht STUNNED) -> Direkt STUN oder CHASE
      else if (this.state === BOT_STATE.SEARCH) {
         this.state = BOT_STATE.CHASE; 
      }
      
    } else if (this.state === BOT_STATE.CHASE || this.state === BOT_STATE.STUNNED) {
      // Spieler ist wieder verdeckt
      this.state = BOT_STATE.SEARCH;
    }
  }

  updateAnimation() {
    if (this.body.speed < 10) {
      if (
        this.anims.currentAnim &&
        this.anims.currentAnim.key.includes("walk")
      ) {
        this.play("bot-idle-down", true);
      }
      return;
    }
    const vx = this.body.velocity.x;
    const vy = this.body.velocity.y;
    if (Math.abs(vx) > Math.abs(vy)) {
      this.play("bot-walk-side", true);
      this.setFlipX(vx < 0);
    } else {
      if (vy > 0) this.play("bot-walk-down", true);
      else this.play("bot-walk-up", true);
    }
  }

  showAlert(icon) {
    const text = this.scene.add
      .text(this.x, this.y - 20, icon, {
        fontFamily: "monospace",
        fontSize: "18px",
        fontStyle: "bold",
        color: icon === "!" ? "#ff4444" : "#ffff00",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setDepth(DEPTH.PROMPT)
      .setOrigin(0.5);

    this.scene.tweens.add({
      targets: text,
      y: this.y - 50,
      alpha: 0,
      duration: 900,
      ease: "Power2",
      onComplete: () => text.destroy(),
    });
  }
}
