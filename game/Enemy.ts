
import { Enemy, EnemyState, Position, IDamageable, IWorld, Projectile } from './types';
import { 
  ENEMY_SPEED, ENEMY_CHASE_RANGE, ENEMY_ATTACK_RANGE, ENEMY_ATTACK_COOLDOWN, 
  COLORS, PROJECTILE_SIZE, SHAKE_ON_DAMAGE,
  // Swarmer
  SWARMER_HP, SWARMER_SPEED, SWARMER_DMG, FLOCK_SEPARATION_DIST, FLOCK_WEIGHT_SEPARATION, FLOCK_WEIGHT_COHESION,
  // Sniper
  SNIPER_HP, SNIPER_SPEED, SNIPER_DMG, SNIPER_PROJECTILE_SPEED, SNIPER_RETREAT_DIST, SNIPER_AIM_DIST, SNIPER_AIM_TIME,
  // Tank
  TANK_HP, TANK_SPEED, TANK_DMG, TANK_SHIELD_DURATION, TANK_SHIELD_COOLDOWN, TANK_SHIELD_MITIGATION
} from './constants';

export class EnemyAI implements Enemy, IDamageable {
  id: number;
  type: 'basic' | 'shooter' | 'swarmer' | 'sniper' | 'tank';
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  state: EnemyState;
  color: string;
  projectiles: Projectile[] = [];
  hitboxRadius: number; // Visual size for collision
  
  // AI State
  hasAttackToken: boolean = false;
  private attackTimer: number = 0;
  
  // Sniper Specifics
  aimTimer: number = 0;
  aimTarget: Position | undefined;

  // Tank Specifics
  shieldActive: boolean = false;
  shieldTimer: number = 0;

  private worldRef: IWorld | null = null;

  constructor(id: number, x: number, y: number, type: 'basic' | 'shooter' | 'swarmer' | 'sniper' | 'tank' = 'basic') {
    this.id = id;
    this.x = x;
    this.y = y;
    this.type = type;
    this.state = EnemyState.Idle;
    
    // Stats based on Type
    switch(type) {
        case 'swarmer':
            this.maxHealth = SWARMER_HP;
            this.color = COLORS.enemySwarmer;
            this.hitboxRadius = 0.4; // Smaller
            break;
        case 'sniper':
            this.maxHealth = SNIPER_HP;
            this.color = COLORS.enemySniper;
            this.hitboxRadius = 0.5;
            break;
        case 'tank':
            this.maxHealth = TANK_HP;
            this.color = COLORS.enemyTank;
            this.hitboxRadius = 0.7; // Larger
            break;
        default:
            this.maxHealth = 100; // Basic
            this.color = COLORS.enemyIdle;
            this.hitboxRadius = 0.5;
            break;
    }
    this.health = this.maxHealth;
  }

  takeDamage(amount: number, knockbackDir: Position) {
    // Tank Shield Mitigation
    if (this.type === 'tank' && this.shieldActive) {
        amount *= (1.0 - TANK_SHIELD_MITIGATION);
        // Visual feedback for shield hit?
    }

    this.health -= amount;
    
    // Knockback (Tanks resist knockback)
    const kbMult = this.type === 'tank' ? 0.2 : 1.0;
    this.x += knockbackDir.x * 0.5 * kbMult;
    this.y += knockbackDir.y * 0.5 * kbMult;

    if (this.worldRef) {
      this.worldRef.triggerHitStop(0.05);
      this.worldRef.spawnParticle(this.x, this.y, 'blood');
      this.worldRef.addTrauma(SHAKE_ON_DAMAGE);
    }

    if (this.health <= 0) {
      this.die();
    } else {
        if (this.state === EnemyState.Idle) {
            this.state = EnemyState.Chase;
        }
    }
  }

  die() {
    this.health = 0;
    this.state = EnemyState.Dead;
    if (this.hasAttackToken && this.worldRef) {
        this.worldRef.combatDirector.releaseToken(this.id);
        this.hasAttackToken = false;
    }
  }

  update(deltaTime: number, playerPos: Position, world: IWorld) {
    this.worldRef = world;
    if (this.state === EnemyState.Dead) return;

    // Cooldowns
    if (this.attackTimer > 0) this.attackTimer -= deltaTime;
    this.updateProjectiles(deltaTime, playerPos);

    // AI Logic Selector
    switch (this.type) {
        case 'swarmer':
            this.updateSwarmer(deltaTime, playerPos, world);
            break;
        case 'sniper':
            this.updateSniper(deltaTime, playerPos, world);
            break;
        case 'tank':
            this.updateTank(deltaTime, playerPos, world);
            break;
        default:
            this.updateBasic(deltaTime, playerPos, world);
            break;
    }
  }

  // --- 1. SWARMER AI (Flocking) ---
  private updateSwarmer(dt: number, target: Position, world: IWorld) {
    const dist = Math.sqrt((target.x - this.x)**2 + (target.y - this.y)**2);

    // State Transitions
    if (this.state === EnemyState.Idle && dist < ENEMY_CHASE_RANGE) this.state = EnemyState.Chase;

    if (this.state === EnemyState.Chase || this.state === EnemyState.Attack) {
        // Attack
        if (dist < 1.0 && this.attackTimer <= 0) {
            // Melee Attack logic
            this.attackTimer = 1.0;
            // Immediate damage (simplified melee)
            // In a real game, this would be a hitbox check
        }
        
        // Movement (Flocking)
        const separation = this.computeSeparation(world.enemies);
        
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const len = Math.sqrt(dx*dx + dy*dy);
        
        let moveX = 0;
        let moveY = 0;

        // Seek Player
        if (len > 0) {
            moveX = (dx / len);
            moveY = (dy / len);
        }

        // Apply Forces
        moveX += separation.x * FLOCK_WEIGHT_SEPARATION;
        moveY += separation.y * FLOCK_WEIGHT_SEPARATION;

        // Normalize
        const moveLen = Math.sqrt(moveX*moveX + moveY*moveY);
        if (moveLen > 0) {
            moveX = (moveX / moveLen) * SWARMER_SPEED * dt;
            moveY = (moveY / moveLen) * SWARMER_SPEED * dt;
            
            if (world.isWalkable(this.x + moveX, this.y + moveY)) {
                this.x += moveX;
                this.y += moveY;
            }
        }
    }
  }

  private computeSeparation(neighbors: Enemy[]): Position {
    let sepX = 0;
    let sepY = 0;
    let count = 0;

    for (const other of neighbors) {
        if (other.id === this.id || other.health <= 0) continue;
        
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        const distSq = dx*dx + dy*dy;

        if (distSq < FLOCK_SEPARATION_DIST * FLOCK_SEPARATION_DIST && distSq > 0.001) {
            sepX += dx / distSq;
            sepY += dy / distSq;
            count++;
        }
    }
    
    if (count > 0) {
        sepX /= count;
        sepY /= count;
    }
    return { x: sepX, y: sepY };
  }

  // --- 2. SNIPER AI (Kiting + Telegraphing) ---
  private updateSniper(dt: number, target: Position, world: IWorld) {
    const dist = Math.sqrt((target.x - this.x)**2 + (target.y - this.y)**2);

    // Kiting Logic
    if (dist < SNIPER_RETREAT_DIST) {
        this.state = EnemyState.Retreat;
        // Release aim if retreating
        this.aimTimer = 0;
        this.aimTarget = undefined;
    } else if (dist < SNIPER_AIM_DIST) {
        if (this.state !== EnemyState.Aiming && this.state !== EnemyState.Attack) {
             if (this.attackTimer <= 0) {
                 this.state = EnemyState.Aiming;
                 this.aimTimer = SNIPER_AIM_TIME;
             } else {
                 this.state = EnemyState.Chase; // Idle/Waiting
             }
        }
    } else {
        this.state = EnemyState.Chase;
    }

    // Execute State
    if (this.state === EnemyState.Retreat) {
        // Run away
        const dx = this.x - target.x;
        const dy = this.y - target.y;
        const len = Math.sqrt(dx*dx + dy*dy);
        const vx = (dx/len) * SNIPER_SPEED * dt;
        const vy = (dy/len) * SNIPER_SPEED * dt;
        
        if (world.isWalkable(this.x + vx, this.y + vy)) {
            this.x += vx;
            this.y += vy;
        }
    } else if (this.state === EnemyState.Chase) {
        // Move to range
        // (Simplified pathfinding)
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const len = Math.sqrt(dx*dx + dy*dy);
        if (len > 0) {
            this.x += (dx/len) * SNIPER_SPEED * dt;
            this.y += (dy/len) * SNIPER_SPEED * dt;
        }
    } else if (this.state === EnemyState.Aiming) {
        // Telegraph
        this.aimTarget = { ...target }; // Track player
        this.aimTimer -= dt;
        if (this.aimTimer <= 0) {
            this.state = EnemyState.Attack;
            this.attack(SNIPER_PROJECTILE_SPEED, SNIPER_DMG);
            this.attackTimer = 2.5; // Long cooldown
            this.aimTarget = undefined;
        }
    }
  }

  // --- 3. TANK AI (Shielding) ---
  private updateTank(dt: number, target: Position, world: IWorld) {
    const dist = Math.sqrt((target.x - this.x)**2 + (target.y - this.y)**2);

    // Manage Shield
    if (this.shieldTimer > 0) {
        this.shieldTimer -= dt;
    } else {
        // Toggle Shield
        this.shieldActive = !this.shieldActive;
        // If activating, set duration. If deactivating, set cooldown.
        this.shieldTimer = this.shieldActive ? TANK_SHIELD_DURATION : TANK_SHIELD_COOLDOWN;
        this.state = this.shieldActive ? EnemyState.Shield : EnemyState.Chase;
    }

    // Movement
    if (dist < ENEMY_CHASE_RANGE * 1.5) {
        const speed = this.shieldActive ? TANK_SPEED * 0.5 : TANK_SPEED; // Slower while shielded
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const len = Math.sqrt(dx*dx + dy*dy);
        if (len > 0.5) { // Don't stand inside player
             const vx = (dx/len) * speed * dt;
             const vy = (dy/len) * speed * dt;
             if (world.isWalkable(this.x + vx, this.y + vy)) {
                 this.x += vx;
                 this.y += vy;
             }
        }

        // Basic Melee Attack
        if (dist < 1.5 && this.attackTimer <= 0) {
            // Melee bump
             this.attackTimer = 1.5;
        }
    }
  }

  // --- BASIC AI (Fallback) ---
  private updateBasic(dt: number, target: Position, world: IWorld) {
    const dist = Math.sqrt((target.x - this.x)**2 + (target.y - this.y)**2);

    if (this.state === EnemyState.Idle && dist < ENEMY_CHASE_RANGE) {
        this.state = EnemyState.Chase;
    }

    if (this.state === EnemyState.Chase) {
        if (dist > ENEMY_CHASE_RANGE * 1.5) {
            this.state = EnemyState.Idle;
            if (this.hasAttackToken) {
                world.combatDirector.releaseToken(this.id);
                this.hasAttackToken = false;
            }
        } else if (dist < ENEMY_ATTACK_RANGE) {
            // Request Token
            if (world.combatDirector.requestToken(this.id)) {
                this.hasAttackToken = true;
                this.state = EnemyState.Attack;
            }
        } else {
            this.moveTowards(target.x, target.y, dt, world, ENEMY_SPEED);
        }
    }

    if (this.state === EnemyState.Attack) {
         if (dist > ENEMY_ATTACK_RANGE) {
             this.state = EnemyState.Chase;
             world.combatDirector.releaseToken(this.id);
             this.hasAttackToken = false;
         } else {
             if (this.attackTimer <= 0) {
                 this.attack();
                 this.attackTimer = ENEMY_ATTACK_COOLDOWN;
             }
         }
    }
  }

  private moveTowards(tx: number, ty: number, dt: number, world: IWorld, speed: number) {
      const dx = tx - this.x;
      const dy = ty - this.y;
      const len = Math.sqrt(dx*dx + dy*dy);
      if (len > 0) {
          const vx = (dx/len) * speed * dt;
          const vy = (dy/len) * speed * dt;
          if (world.isWalkable(this.x + vx, this.y)) this.x += vx;
          if (world.isWalkable(this.x, this.y + vy)) this.y += vy;
      }
  }

  // Generic Ranged Attack (used by Basic Shooter & Sniper)
  private attack(speed: number = 10, damage: number = 10) {
      if (!this.worldRef || !this.aimTarget && this.type === 'sniper') {
         // Auto-aim for non-snipers
      }
      
      // Placeholder projectile spawn (logic normally in updateProjectiles or World)
  }
  
  // Actually fire - helper called from update
  private fireAt(target: Position, speed: number) {
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const len = Math.sqrt(dx*dx + dy*dy);
      
      this.projectiles.push({
          id: Math.random(),
          x: this.x,
          y: this.y,
          vx: (dx/len) * speed,
          vy: (dy/len) * speed,
          life: 2.0,
          owner: 'enemy'
      });
  }

  private updateProjectiles(dt: number, playerPos: Position) {
      // Sniper firing logic hook
      if (this.state === EnemyState.Attack && this.type === 'sniper' && this.attackTimer > 2.0) {
           // Just fired (timer reset to 2.5), spawn actual projectile
           if (this.projectiles.length === 0 || this.projectiles[this.projectiles.length-1].life < 1.9) {
               this.fireAt(playerPos, SNIPER_PROJECTILE_SPEED);
           }
      }
      // Basic Shooter logic
      if (this.state === EnemyState.Attack && this.type === 'shooter' && this.attackTimer > 1.4) {
           this.fireAt(playerPos, 15);
      }

      // Update existing
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
          const p = this.projectiles[i];
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.life -= dt;
          
          // Collision with Player
          const dx = playerPos.x - p.x;
          const dy = playerPos.y - p.y;
          if (Math.sqrt(dx*dx + dy*dy) < 0.5) {
              // Hit Player
              this.projectiles.splice(i, 1);
              continue;
          }

          if (p.life <= 0) this.projectiles.splice(i, 1);
      }
  }
}
