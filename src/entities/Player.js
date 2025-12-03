import Phaser from 'phaser';

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'player');

    // Add to scene
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Physics configuration for "drift" feel
    this.setDrag(800); // High drag creates the drift feel
    this.setMaxVelocity(400); // Max speed cap
    this.setCollideWorldBounds(true);

    // Movement properties
    this.acceleration = 1200; // Acceleration rate
    this.sprintMultiplier = 1.8;
    this.isDashing = false;
    this.dashSpeed = 1500;
    this.dashDuration = 200; // milliseconds
    this.dashCooldown = 800;
    this.dashTimer = 0;
    this.dashCooldownTimer = 0;

    // Input
    this.cursors = scene.input.keyboard.createCursorKeys();
    this.wasd = scene.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      sprint: Phaser.Input.Keyboard.KeyCodes.SHIFT,
      interact: Phaser.Input.Keyboard.KeyCodes.E
    });

    // Mouse tracking
    this.mousePointer = scene.input.activePointer;

    // Combat
    this.projectiles = scene.physics.add.group({
      classType: Phaser.Physics.Arcade.Sprite,
      maxSize: 50,
      runChildUpdate: true
    });

    this.fireRateLeft = 150; // milliseconds between shots
    this.fireRateRight = 150;
    this.lastFiredLeft = 0;
    this.lastFiredRight = 0;

    // Stats
    this.health = 100;
    this.maxHealth = 100;
    this.stamina = 100;
    this.maxStamina = 100;
    this.mana = 100;
    this.maxMana = 100;
  }

  update(time, delta) {
    if (this.isDead) return;

    // Update timers
    if (this.dashTimer > 0) {
      this.dashTimer -= delta;
      if (this.dashTimer <= 0) {
        this.isDashing = false;
      }
    }

    if (this.dashCooldownTimer > 0) {
      this.dashCooldownTimer -= delta;
    }

    // Movement (Acceleration-based for drift feel)
    if (!this.isDashing) {
      this.handleMovement(delta);
    }

    // Twin-stick aiming
    this.handleAiming();

    // Combat
    this.handleFiring(time);
  }

  handleMovement(delta) {
    const up = this.cursors.up.isDown || this.wasd.up.isDown;
    const down = this.cursors.down.isDown || this.wasd.down.isDown;
    const left = this.cursors.left.isDown || this.wasd.left.isDown;
    const right = this.cursors.right.isDown || this.wasd.right.isDown;
    const sprint = this.wasd.sprint.isDown;

    let accel = this.acceleration;
    if (sprint && this.stamina > 0) {
      accel *= this.sprintMultiplier;
      this.stamina = Math.max(0, this.stamina - delta * 0.025);
    } else {
      // Regenerate stamina
      this.stamina = Math.min(this.maxStamina, this.stamina + delta * 0.015);
    }

    // Apply acceleration based on input
    if (left) {
      this.setAccelerationX(-accel);
    } else if (right) {
      this.setAccelerationX(accel);
    } else {
      this.setAccelerationX(0);
    }

    if (up) {
      this.setAccelerationY(-accel);
    } else if (down) {
      this.setAccelerationY(accel);
    } else {
      this.setAccelerationY(0);
    }
  }

  handleAiming() {
    // Rotate player to face mouse pointer
    const worldPoint = this.scene.cameras.main.getWorldPoint(
      this.mousePointer.x,
      this.mousePointer.y
    );

    const angle = Phaser.Math.Angle.Between(
      this.x,
      this.y,
      worldPoint.x,
      worldPoint.y
    );

    this.rotation = angle;
  }

  handleFiring(time) {
    // Left mouse button (primary fire)
    if (this.mousePointer.leftButtonDown() && time > this.lastFiredLeft + this.fireRateLeft) {
      this.fireProjectile('left');
      this.lastFiredLeft = time;
    }

    // Right mouse button (secondary fire)
    if (this.mousePointer.rightButtonDown() && time > this.lastFiredRight + this.fireRateRight) {
      this.fireProjectile('right');
      this.lastFiredRight = time;
    }
  }

  fireProjectile(hand) {
    if (this.mana < 8) return;

    this.mana -= 8;

    const projectile = this.projectiles.get(this.x, this.y, 'projectile');
    if (!projectile) return;

    projectile.setActive(true);
    projectile.setVisible(true);

    // Offset for dual-wielding
    const offset = hand === 'left' ? -8 : 8;
    const offsetX = Math.cos(this.rotation + Math.PI / 2) * offset;
    const offsetY = Math.sin(this.rotation + Math.PI / 2) * offset;

    projectile.setPosition(this.x + offsetX, this.y + offsetY);

    // Set velocity in direction of aim
    const speed = 600;
    const velocityX = Math.cos(this.rotation) * speed;
    const velocityY = Math.sin(this.rotation) * speed;
    projectile.setVelocity(velocityX, velocityY);

    // Lifetime
    this.scene.time.delayedCall(1000, () => {
      projectile.setActive(false);
      projectile.setVisible(false);
      projectile.setVelocity(0, 0);
    });
  }

  dash() {
    if (this.dashCooldownTimer > 0 || this.stamina < 20) return;

    this.isDashing = true;
    this.dashTimer = this.dashDuration;
    this.dashCooldownTimer = this.dashCooldown;
    this.stamina -= 20;

    // Apply dash impulse in facing direction
    const dashVelocityX = Math.cos(this.rotation) * this.dashSpeed;
    const dashVelocityY = Math.sin(this.rotation) * this.dashSpeed;

    this.setVelocity(dashVelocityX, dashVelocityY);
    this.setAcceleration(0, 0);
  }

  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0) {
      this.die();
    }
  }

  die() {
    this.isDead = true;
    console.log('Player died!');
    // TODO: Game over logic
  }
}
