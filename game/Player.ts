
import { Position, InputState, Projectile, WorldObject, IDamageable, IWorld, EnemyState } from './types';
import { 
  BASE_SPEED, SPRINT_MULTIPLIER, ROTATION_SPEED, 
  PROJECTILE_SPEED, PROJECTILE_LIFETIME, TILE_WIDTH, TILE_HEIGHT, CHUNK_SIZE,
  STAMINA_MAX, STAMINA_DRAIN_RATE, STAMINA_REGEN_RATE, STAMINA_REGEN_DELAY, STAMINA_EXHAUST_RECOVERY, INTERACTION_RADIUS,
  MANA_MAX, MANA_REGEN_RATE, MANA_REGEN_DELAY, MANA_COST_FIRE, STAMINA_COST_FIRE,
  DASH_SPEED, DASH_DURATION, DASH_COOLDOWN, DASH_STAMINA_COST,
  MAX_SPREAD, SPREAD_PER_SHOT, SPREAD_RECOVERY, RECOIL_DURATION, SHAKE_ON_FIRE, SHAKE_ON_DAMAGE, SHAKE_ON_WALL_HIT, PLAYER_WIDTH, PLAYER_HEIGHT,
  PLAYER_DAMAGE
} from './constants';
import { World } from './World';

export class Player implements IDamageable {
  position: Position;
  velocity: Position;
  rotation: number; // in radians
  targetRotation: number;
  aimDistance: number;
  
  projectiles: Projectile[] = [];
  private nextProjectileId = 0;
  
  // Stats & Health
  health: number = 100;
  maxHealth: number = 100;
  isDead: boolean = false;
  invulnerableTimer: number = 0;

  // Stamina System
  stamina: number = STAMINA_MAX;
  private staminaRegenTimer: number = 0;
  private isExhausted: boolean = false;

  // Mana System
  mana: number = MANA_MAX;
  private manaRegenTimer: number = 0;

  // Dash System
  isDashing: boolean = false;
  private dashTimer: number = 0;
  private dashCooldownTimer: number = 0;
  private dashVelocity: Position = { x: 0, y: 0 };

  // Interaction System
  nearbyInteractable: WorldObject | null = null;
  private wasInteracting: boolean = false;

  // Combat Feel (Recoil / Spread)
  private wasFiringLeft = false;
  private wasFiringRight = false;
  
  currentSpread: number = 0;
  recoilTimerLeft: number = 0;
  recoilTimerRight: number = 0;

  constructor() {
    this.position = { x: 0, y: 0 };
    this.velocity = { x: 0, y: 0 };
    this.rotation = 0;
    this.targetRotation = 0;
    this.aimDistance = 0;
  }

  takeDamage(amount: number, knockbackDir: Position) {
    if (this.isDead || this.invulnerableTimer > 0 || this.isDashing) return; // Invulnerable while dashing

    this.health -= amount;
    this.invulnerableTimer = 0.5; // 0.5s i-frames
    
    // Apply knockback
    const knockbackForce = 5; // Tiles instant push
    this.position.x += knockbackDir.x * knockbackForce * 0.1; // Small instant nudge
    this.position.y += knockbackDir.y * knockbackForce * 0.1;

    if (this.health <= 0) {
      this.health = 0;
      this.die();
    }
  }

  die() {
    this.isDead = true;
    console.log("Player died!");
    // Game Over logic would go here
  }

  update(deltaTime: number, input: InputState, world: World) {
    if (this.isDead) return;

    if (this.invulnerableTimer > 0) {
        this.invulnerableTimer -= deltaTime;
    }
    
    if (this.dashCooldownTimer > 0) {
      this.dashCooldownTimer -= deltaTime;
    }

    // Recover spread
    if (this.currentSpread > 0) {
        this.currentSpread -= SPREAD_RECOVERY * deltaTime;
        if (this.currentSpread < 0) this.currentSpread = 0;
    }
    
    // Recover recoil visuals
    if (this.recoilTimerLeft > 0) this.recoilTimerLeft -= deltaTime;
    if (this.recoilTimerRight > 0) this.recoilTimerRight -= deltaTime;

    // Mana Regeneration
    if (this.manaRegenTimer > 0) {
      this.manaRegenTimer -= deltaTime;
    } else if (this.mana < MANA_MAX) {
      this.mana += MANA_REGEN_RATE * deltaTime;
      if (this.mana > MANA_MAX) this.mana = MANA_MAX;
    }

    this.handleMovement(deltaTime, input);
    this.handleCombat(input, world);
    this.handleInteraction(input, world);
    this.updateProjectiles(deltaTime, world);
  }

  private handleMovement(deltaTime: number, input: InputState) {
    // --- 1. DASH STATE Override ---
    if (this.isDashing) {
      this.position.x += this.dashVelocity.x * deltaTime;
      this.position.y += this.dashVelocity.y * deltaTime;
      
      this.dashTimer -= deltaTime;
      if (this.dashTimer <= 0) {
        this.isDashing = false;
      }
      return; // Skip normal movement while dashing
    }

    // --- 2. CHECK DASH TRIGGER ---
    if (input.dashDir && this.dashCooldownTimer <= 0 && this.stamina >= DASH_STAMINA_COST && !this.isExhausted) {
      this.startDash(input.dashDir);
      return; // Start dashing immediately
    }

    // --- 3. NORMAL MOVEMENT ---
    let dx = 0;
    let dy = 0;

    // Screen-Relative Movement
    // Up on screen is (-1, -1) in World (North)
    if (input.up) { dx -= 1; dy -= 1; }
    if (input.down) { dx += 1; dy += 1; }
    if (input.left) { dx -= 1; dy += 1; }
    if (input.right) { dx += 1; dy -= 1; }

    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
      const length = Math.sqrt(dx * dx + dy * dy);
      dx /= length;
      dy /= length;
    }

    // Stamina & Sprint Logic
    let isSprinting = input.sprint;
    const isMoving = dx !== 0 || dy !== 0;

    if (isSprinting && isMoving && !this.isExhausted) {
      // Draining
      this.stamina -= STAMINA_DRAIN_RATE * deltaTime;
      this.staminaRegenTimer = STAMINA_REGEN_DELAY;
      
      if (this.stamina <= 0) {
        this.stamina = 0;
        this.isExhausted = true; // Enter exhausted state
      }
    } else {
      // Not sprinting or not moving
      isSprinting = false; 

      // Regenerating
      if (this.staminaRegenTimer > 0) {
        this.staminaRegenTimer -= deltaTime;
      } else if (this.stamina < STAMINA_MAX) {
        this.stamina += STAMINA_REGEN_RATE * deltaTime;
        if (this.stamina > STAMINA_MAX) this.stamina = STAMINA_MAX;
      }

      // Recovery from exhaustion
      if (this.isExhausted && this.stamina >= STAMINA_EXHAUST_RECOVERY) {
        this.isExhausted = false;
      }
    }

    // Apply speed
    const currentSpeed = BASE_SPEED * (isSprinting ? SPRINT_MULTIPLIER : 1.0);
    
    this.position.x += dx * currentSpeed * deltaTime;
    this.position.y += dy * currentSpeed * deltaTime;

    // Smooth Rotation
    let angleDiff = this.targetRotation - this.rotation;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    const smoothingFactor = 1 - Math.exp(-ROTATION_SPEED * deltaTime);
    this.rotation += angleDiff * smoothingFactor;
  }

  private startDash(dir: Position) {
    this.isDashing = true;
    this.dashTimer = DASH_DURATION;
    this.dashCooldownTimer = DASH_COOLDOWN;
    
    // Consume Stamina
    this.stamina -= DASH_STAMINA_COST;
    this.staminaRegenTimer = STAMINA_REGEN_DELAY; // Reset regen delay
    
    // Normalize dash direction just in case (though inputs are unit vectors usually)
    const len = Math.sqrt(dir.x * dir.x + dir.y * dir.y);
    const nx = (len > 0) ? dir.x / len : 0;
    const ny = (len > 0) ? dir.y / len : 0;

    this.dashVelocity = {
      x: nx * DASH_SPEED,
      y: ny * DASH_SPEED
    };
  }

  private handleInteraction(input: InputState, world: World) {
    // 1. Scan for nearby objects
    this.nearbyInteractable = null;
    let closestDist = INTERACTION_RADIUS;

    for (const obj of world.objects) {
      if (!obj.interactable) continue;

      const dx = obj.x - this.position.x;
      const dy = obj.y - this.position.y;
      const dist = Math.sqrt(dx*dx + dy*dy);

      if (dist < closestDist) {
        closestDist = dist;
        this.nearbyInteractable = obj;
      }
    }

    // 2. Handle Input
    if (input.interact && !this.wasInteracting && this.nearbyInteractable) {
      // Trigger interaction logic (placeholder)
      console.log(`Interacted with ${this.nearbyInteractable.type} [${this.nearbyInteractable.id}]`);
      
      // Simple toggle state for visual feedback
      this.nearbyInteractable.interacted = !this.nearbyInteractable.interacted;
    }
    this.wasInteracting = input.interact;
  }

  private handleCombat(input: InputState, world: IWorld) {
    // Left Hand Fire
    if (input.fireLeft && !this.wasFiringLeft) {
      if (this.mana >= MANA_COST_FIRE && this.stamina >= STAMINA_COST_FIRE) {
        this.fireProjectile('left', world);
        this.recoilTimerLeft = RECOIL_DURATION;
        this.mana -= MANA_COST_FIRE;
        this.manaRegenTimer = MANA_REGEN_DELAY;
        this.stamina -= STAMINA_COST_FIRE;
        this.staminaRegenTimer = STAMINA_REGEN_DELAY;
      }
    }
    this.wasFiringLeft = input.fireLeft;

    // Right Hand Fire
    if (input.fireRight && !this.wasFiringRight) {
      if (this.mana >= MANA_COST_FIRE && this.stamina >= STAMINA_COST_FIRE) {
        this.fireProjectile('right', world);
        this.recoilTimerRight = RECOIL_DURATION;
        this.mana -= MANA_COST_FIRE;
        this.manaRegenTimer = MANA_REGEN_DELAY;
        this.stamina -= STAMINA_COST_FIRE;
        this.staminaRegenTimer = STAMINA_REGEN_DELAY;
      }
    }
    this.wasFiringRight = input.fireRight;
  }

  // Helper to convert Screen Space vector to World Space vector
  private screenToWorldVector(screenX: number, screenY: number): { x: number, y: number } {
    // Inverse Isometric Projection
    const halfW = TILE_WIDTH / 2;
    const halfH = TILE_HEIGHT / 2;

    const wx = (screenY / halfH + screenX / halfW) / 2;
    const wy = (screenY / halfH - screenX / halfW) / 2;

    return { x: wx, y: wy };
  }

  private fireProjectile(hand: 'left' | 'right', world: IWorld) {
    // Add shake
    world.addTrauma(SHAKE_ON_FIRE);
    
    // Add Spread
    this.currentSpread = Math.min(this.currentSpread + SPREAD_PER_SHOT, MAX_SPREAD);

    const forwardOffset = 12;
    const sideOffset = 14; 
    const yMult = hand === 'left' ? -1 : 1;

    const localX = forwardOffset;
    const localY = sideOffset * yMult;

    const rot = this.rotation;
    const screenDx = localX * Math.cos(rot) - localY * Math.sin(rot);
    const screenDy = localX * Math.sin(rot) + localY * Math.cos(rot);
    
    const offsetMag = Math.sqrt(screenDx*screenDx + screenDy*screenDy);
    
    const worldDir = this.screenToWorldVector(screenDx / offsetMag, screenDy / offsetMag);
    const worldDirLen = Math.sqrt(worldDir.x*worldDir.x + worldDir.y*worldDir.y);
    
    const handWorldDist = 0.6; 
    const worldOffsetX = (worldDir.x / worldDirLen) * handWorldDist;
    const worldOffsetY = (worldDir.y / worldDirLen) * handWorldDist;

    const spawnX = this.position.x + worldOffsetX;
    const spawnY = this.position.y + worldOffsetY;
    
    // VFX: Muzzle Flash
    world.spawnParticle(spawnX, spawnY, 'muzzle');

    // Direction calculation with Spread
    const sideBias = hand === 'left' ? -0.4 : 0.4;
    const randomSpread = (Math.random() - 0.5) * this.currentSpread;
    const fireAngle = this.targetRotation + sideBias + randomSpread;

    const aimDx = Math.cos(fireAngle);
    const aimDy = Math.sin(fireAngle);

    const aimWorld = this.screenToWorldVector(aimDx, aimDy);
    
    const aimLen = Math.sqrt(aimWorld.x * aimWorld.x + aimWorld.y * aimWorld.y);
    const vx = (aimWorld.x / aimLen) * PROJECTILE_SPEED;
    const vy = (aimWorld.y / aimLen) * PROJECTILE_SPEED;

    const projectile: Projectile = {
      id: this.nextProjectileId++,
      x: spawnX,
      y: spawnY,
      vx: vx,
      vy: vy,
      life: PROJECTILE_LIFETIME,
      owner: 'player'
    };

    this.projectiles.push(projectile);
  }

  private updateProjectiles(deltaTime: number, world: IWorld) {
    const screenAimX = Math.cos(this.targetRotation) * this.aimDistance;
    const screenAimY = Math.sin(this.targetRotation) * this.aimDistance;
    const worldAimOffset = this.screenToWorldVector(screenAimX, screenAimY);
    
    const targetX = this.position.x + worldAimOffset.x;
    const targetY = this.position.y + worldAimOffset.y;

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      
      const prevX = p.x;
      const prevY = p.y;
      
      // Homing logic only for player projectiles
      if (p.owner === 'player' && p.life < PROJECTILE_LIFETIME * 0.85) {
        const dx = targetX - p.x;
        const dy = targetY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0.5) {
          const desiredVx = (dx / dist) * PROJECTILE_SPEED;
          const desiredVy = (dy / dist) * PROJECTILE_SPEED;

          const turnRate = 20.0 * deltaTime;
          
          p.vx += (desiredVx - p.vx) * turnRate;
          p.vy += (desiredVy - p.vy) * turnRate;

          const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
          p.vx = (p.vx / speed) * PROJECTILE_SPEED;
          p.vy = (p.vy / speed) * PROJECTILE_SPEED;
        }
      }

      const nextX = p.x + p.vx * deltaTime;
      const nextY = p.y + p.vy * deltaTime;

      // 1. Enemy Collision Check (Raycast / Continuous)
      if (p.owner === 'player') {
          let hitEnemy = false;
          for (const enemy of world.enemies) {
              if (enemy.state === EnemyState.Dead) continue;
              
              const cx = enemy.x;
              const cy = enemy.y;
              const radius = enemy.hitboxRadius || 0.5;

              // Line Segment (prev -> next) to Point (enemy center) distance check
              // Vector AB (shot path)
              const dx = nextX - prevX;
              const dy = nextY - prevY;
              const lenSq = dx*dx + dy*dy;
              
              let t = 0;
              if (lenSq > 0.0001) {
                // Vector AC (prev -> enemy)
                const ex = cx - prevX;
                const ey = cy - prevY;
                // Project AC onto AB
                t = (ex * dx + ey * dy) / lenSq;
                t = Math.max(0, Math.min(1, t));
              }

              // Closest point on line
              const closeX = prevX + t * dx;
              const closeY = prevY + t * dy;
              
              // Dist from closest point to enemy center
              const distX = cx - closeX;
              const distY = cy - closeY;
              const distSq = distX*distX + distY*distY;

              if (distSq < radius * radius) { 
                  // Hit!
                  const knockback = { x: p.vx > 0 ? 1 : -1, y: p.vy > 0 ? 1 : -1 };
                  enemy.takeDamage(PLAYER_DAMAGE, knockback);
                  
                  // Juice
                  world.spawnParticle(closeX, closeY, 'blood');
                  world.triggerHitStop(0.05);
                  world.addTrauma(SHAKE_ON_DAMAGE);
                  
                  hitEnemy = true;
                  break;
              }
          }
          if (hitEnemy) {
              this.projectiles.splice(i, 1);
              continue;
          }
      }

      // 2. Wall Collision Check (Momentum / Weight)
      // Use isProjectilePassable to check if we hit a wall/mountain
      // It allows flying over water/void
      if (!world.isProjectilePassable(nextX, nextY)) {
        // Impact!
        world.spawnParticle(p.x, p.y, 'spark');
        world.spawnParticle(p.x, p.y, 'smoke');
        world.addTrauma(SHAKE_ON_WALL_HIT);
        // Destroy projectile
        this.projectiles.splice(i, 1);
        continue;
      }

      p.x = nextX;
      p.y = nextY;
      p.life -= deltaTime;

      if (p.life <= 0) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  getChunkPosition(): Position {
    return {
      x: Math.floor(this.position.x / CHUNK_SIZE),
      y: Math.floor(this.position.y / CHUNK_SIZE)
    };
  }
}
