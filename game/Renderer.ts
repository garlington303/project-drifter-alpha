
import { World } from './World';
import { Player } from './Player';
import { WorldObject, Particle, Enemy, EnemyState } from './types';
import { TILE_WIDTH, TILE_HEIGHT, COLORS, PLAYER_WIDTH, PLAYER_HEIGHT, CAMERA_LOOK_AHEAD, MAX_CAMERA_OFFSET, PROJECTILE_COLOR, PROJECTILE_SIZE, TREE_WIDTH, TREE_HEIGHT, CLIFF_HEIGHT, GIANT_TREE_WIDTH, GIANT_TREE_HEIGHT } from './constants';

// Enum to avoid string comparisons in tight loop
enum RenderType {
  Player,
  Object,
  Enemy,
  Corpse,
  Particle
}

interface RenderEntry {
  type: RenderType;
  ySort: number;
  ref: any; // Holds reference to the entity (Player, WorldObject, Enemy, Particle)
}

export class Renderer {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  private playerSprite: HTMLCanvasElement;
  private renderQueue: RenderEntry[] = []; // Reusable array to avoid GC

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.ctx.imageSmoothingEnabled = false;
    this.playerSprite = this.createPlayerSprite();
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.ctx.imageSmoothingEnabled = false;
  }

  private createPlayerSprite(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = PLAYER_WIDTH;
    canvas.height = PLAYER_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    ctx.fillStyle = COLORS.player;
    ctx.fillRect(0, 0, PLAYER_WIDTH, PLAYER_HEIGHT);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, PLAYER_WIDTH - 2, PLAYER_HEIGHT - 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillRect(PLAYER_WIDTH - 8, 4, 4, PLAYER_HEIGHT - 8);

    return canvas;
  }

  toIso(x: number, y: number): { x: number, y: number } {
    const screenX = (x - y) * (TILE_WIDTH / 2);
    const screenY = (x + y) * (TILE_HEIGHT / 2);
    return { x: screenX, y: screenY };
  }

  draw(world: World, player: Player, mouseX: number, mouseY: number, time: number, shake: {x: number, y: number, angle: number}, zoomLevel: number) {
    this.ctx.fillStyle = '#1a1a1a';
    this.ctx.fillRect(0, 0, this.width, this.height);

    const playerIso = this.toIso(player.position.x, player.position.y);
    const halfWidth = this.width / (2 * zoomLevel);
    const halfHeight = this.height / (2 * zoomLevel);
    const margin = TILE_WIDTH * 4; 

    let lookOffsetX = (mouseX - this.width / 2) * CAMERA_LOOK_AHEAD;
    let lookOffsetY = (mouseY - this.height / 2) * CAMERA_LOOK_AHEAD;
    const offsetDist = Math.sqrt(lookOffsetX * lookOffsetX + lookOffsetY * lookOffsetY);
    if (offsetDist > MAX_CAMERA_OFFSET) {
      const ratio = MAX_CAMERA_OFFSET / offsetDist;
      lookOffsetX *= ratio;
      lookOffsetY *= ratio;
    }

    this.ctx.save();
    
    // Center Canvas
    this.ctx.translate(this.width / 2, this.height / 2);
    
    // Apply Camera Shake (Translation + Rotation)
    this.ctx.translate(shake.x, shake.y);
    this.ctx.rotate(shake.angle);

    // Apply Camera Follow
    this.ctx.translate(-lookOffsetX, -lookOffsetY);
    this.ctx.scale(zoomLevel, zoomLevel);
    this.ctx.translate(-playerIso.x, -playerIso.y);

    // 1. Draw Terrain
    // Optimization: Only filter chunks here, tile culling handled inside loop
    const chunks = world.getVisibleChunks();
    // Simple sort chunks by draw order (Top-Left to Bottom-Right)
    chunks.sort((a, b) => (a.y + a.x) - (b.y + b.x));

    for (const chunk of chunks) {
      for (const row of chunk.tiles) {
        for (const tile of row) {
          const iso = this.toIso(tile.worldX, tile.worldY);
          const dx = iso.x - playerIso.x;
          const dy = iso.y - playerIso.y;
          // Culling check
          if (dx < -halfWidth - margin || dx > halfWidth + margin ||
              dy < -halfHeight - margin || dy > halfHeight + margin) {
            continue;
          }
          this.drawTile(iso.x, iso.y, tile.type, tile.color);
        }
      }
    }

    // 2. Collect Renderables
    // Clear queue without reallocating
    this.renderQueue.length = 0;

    // Player
    this.renderQueue.push({
        type: RenderType.Player,
        ySort: player.position.x + player.position.y,
        ref: player
    });

    // Objects
    for (const obj of world.objects) {
        const iso = this.toIso(obj.x, obj.y);
        const dx = iso.x - playerIso.x;
        const dy = iso.y - playerIso.y;
        if (dx < -halfWidth - margin || dx > halfWidth + margin ||
            dy < -halfHeight - margin || dy > halfHeight + margin) {
          continue;
        }

        this.renderQueue.push({
            type: RenderType.Object,
            ySort: obj.x + obj.y,
            ref: obj
        });
    }

    // Enemies
    for (const enemy of world.enemies) {
        if (enemy.state === EnemyState.Dead) {
            this.renderQueue.push({
                type: RenderType.Corpse,
                ySort: enemy.x + enemy.y - 1000, // corpses below everything
                ref: enemy
            });
        } else {
            this.renderQueue.push({
                type: RenderType.Enemy,
                ySort: enemy.x + enemy.y,
                ref: enemy
            });
        }
    }

    // Particles
    for (const p of world.particleSystem.particles) {
       this.renderQueue.push({
         type: RenderType.Particle,
         ySort: p.x + p.y, 
         ref: p
       });
    }

    // Sort
    this.renderQueue.sort((a, b) => a.ySort - b.ySort);

    // Render loop using switch/case to avoid closure creation
    for (const item of this.renderQueue) {
        switch (item.type) {
            case RenderType.Player:
                this.drawPlayer(playerIso.x, playerIso.y, item.ref);
                break;
            case RenderType.Object:
                const obj = item.ref as WorldObject;
                this.ctx.globalAlpha = obj.opacity ?? 1.0;
                if (obj.type === 'tree' || obj.type === 'giant_tree') {
                    this.drawTree(obj, time);
                } else if (obj.type === 'cliff') {
                    this.drawCliff(obj);
                } else {
                    this.drawWorldObject(obj);
                }
                this.ctx.globalAlpha = 1.0;
                break;
            case RenderType.Enemy:
                this.drawEnemy(item.ref);
                break;
            case RenderType.Corpse:
                this.drawEnemyCorpse(item.ref);
                break;
            case RenderType.Particle:
                this.drawParticle(item.ref);
                break;
        }
    }

    this.drawProjectiles(player, world.enemies);
    if (player.nearbyInteractable) {
        this.drawInteractionPrompt(player.nearbyInteractable);
    }

    this.ctx.restore();
    
    // Reticle is outside of Shake/Zoom/Translate
    this.drawReticle(mouseX, mouseY, player.currentSpread);
  }

  private drawTile(x: number, y: number, type: string, color: string) {
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    this.ctx.lineTo(x + TILE_WIDTH / 2, y + TILE_HEIGHT / 2);
    this.ctx.lineTo(x, y + TILE_HEIGHT);
    this.ctx.lineTo(x - TILE_WIDTH / 2, y + TILE_HEIGHT / 2);
    this.ctx.closePath();

    this.ctx.fillStyle = color;
    this.ctx.fill();

    if (type !== 'gap' && type !== 'water') {
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      this.ctx.fill();
    }
  }

  // ... (Existing draw methods: drawTree, drawCliff, drawWorldObject unchanged) ...
  
  private drawTree(obj: WorldObject, time: number) {
    const iso = this.toIso(obj.x, obj.y);
    const isGiant = obj.type === 'giant_tree';
    const width = isGiant ? GIANT_TREE_WIDTH : TREE_WIDTH;
    const height = isGiant ? GIANT_TREE_HEIGHT : TREE_HEIGHT;
    const trunkColor = COLORS.treeTrunk;
    const foliageColor = isGiant ? COLORS.giantTreeFoliage : COLORS.treeFoliage;
    const speed = isGiant ? 0.001 : 0.002;
    const magnitude = isGiant ? 4 : 6;
    const sway = Math.sin(time * speed + (obj.seed || 0) * 10) * magnitude;
    this.ctx.save();
    this.ctx.translate(iso.x, iso.y);
    const trunkW = width * 0.3;
    const trunkH = height * 0.2;
    this.ctx.fillStyle = trunkColor;
    this.ctx.fillRect(-trunkW/2, -trunkH + TILE_HEIGHT/2, trunkW, trunkH);
    const foliageBottomY = -trunkH + TILE_HEIGHT/2;
    this.ctx.translate(0, foliageBottomY); 
    this.ctx.translate(sway, 0); 
    this.ctx.fillStyle = foliageColor;
    this.ctx.beginPath();
    this.ctx.arc(0, -(height * 0.6), width/2, 0, Math.PI * 2);
    this.ctx.arc(-width/3, -(height * 0.4), width/2.5, 0, Math.PI * 2);
    this.ctx.arc(width/3, -(height * 0.4), width/2.5, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.beginPath();
    this.ctx.arc(width/4, -(height * 0.7), width/4, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  private drawCliff(obj: WorldObject) {
      const iso = this.toIso(obj.x, obj.y);
      const width = TILE_WIDTH;
      const height = CLIFF_HEIGHT;
      this.ctx.save();
      this.ctx.translate(iso.x, iso.y);
      this.ctx.fillStyle = COLORS.cliffFace;
      this.ctx.fillRect(-width/2, -height + TILE_HEIGHT/2, width, height);
      this.ctx.fillStyle = COLORS.cliffTop;
      this.ctx.beginPath();
      this.ctx.moveTo(0, -height);
      this.ctx.lineTo(width/2, -height + TILE_HEIGHT/2);
      this.ctx.lineTo(0, -height + TILE_HEIGHT);
      this.ctx.lineTo(-width/2, -height + TILE_HEIGHT/2);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.restore();
  }

  private drawWorldObject(obj: WorldObject) {
      const iso = this.toIso(obj.x, obj.y);
      const width = 32;
      const height = 32;
      this.ctx.save();
      this.ctx.translate(iso.x, iso.y);
      this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
      this.ctx.beginPath();
      this.ctx.ellipse(0, TILE_HEIGHT/2, 12, 6, 0, 0, Math.PI*2);
      this.ctx.fill();
      const bodyColor = obj.interacted ? '#3b82f6' : COLORS.stone;
      this.ctx.fillStyle = bodyColor;
      this.ctx.fillRect(-width/2, -height + TILE_HEIGHT/2, width, height);
      this.ctx.fillStyle = COLORS.highlight;
      this.ctx.fillRect(-width/2, -height + TILE_HEIGHT/2, width, 4);
      this.ctx.restore();
  }

  private drawPlayer(x: number, y: number, player: Player) {
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(player.rotation);
    
    // Laser Sight
    const lineStart = 18; 
    const maxLineLength = 400; 
    const actualLength = Math.min(Math.max(player.aimDistance - lineStart, 0), maxLineLength);
    if (actualLength > 0) {
        const lineEnd = lineStart + actualLength;
        const gradient = this.ctx.createLinearGradient(lineStart, 0, lineEnd, 0);
        gradient.addColorStop(0, 'rgba(239, 68, 68, 0.6)'); 
        gradient.addColorStop(1, 'rgba(239, 68, 68, 0)');

        this.ctx.beginPath();
        this.ctx.moveTo(lineStart, 0);
        this.ctx.lineTo(lineEnd, 0);
        this.ctx.strokeStyle = gradient;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }

    const leftRecoil = player.recoilTimerLeft > 0 ? 4 : 0;
    const rightRecoil = player.recoilTimerRight > 0 ? 4 : 0;

    this.ctx.fillStyle = COLORS.player;
    this.ctx.fillRect(8 - leftRecoil, -14, 10, 8);
    this.ctx.fillRect(8 - rightRecoil, 6, 10, 8);

    this.ctx.drawImage(this.playerSprite, -PLAYER_WIDTH / 2, -PLAYER_HEIGHT / 2);
    this.ctx.restore();
  }

  private drawEnemy(enemy: Enemy) {
      const iso = this.toIso(enemy.x, enemy.y);
      let width = 24;
      let height = 36;
      let color = enemy.color;

      // Type-specific adjustments
      if (enemy.type === 'swarmer') {
          width = 16;
          height = 24;
      } else if (enemy.type === 'tank') {
          width = 36;
          height = 48;
      }

      this.ctx.save();
      this.ctx.translate(iso.x, iso.y);
      
      // Shadow
      this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
      this.ctx.beginPath();
      this.ctx.ellipse(0, TILE_HEIGHT/2, width/2, 6, 0, 0, Math.PI*2);
      this.ctx.fill();

      // Body
      this.ctx.fillStyle = color;
      this.ctx.fillRect(-width/2, -height + TILE_HEIGHT/2, width, height);

      // Tank Shield
      if (enemy.type === 'tank' && enemy.shieldActive) {
          this.ctx.strokeStyle = COLORS.enemyShield;
          this.ctx.lineWidth = 2;
          this.ctx.beginPath();
          this.ctx.arc(0, -height/2 + TILE_HEIGHT/2, width * 0.8, 0, Math.PI * 2);
          this.ctx.stroke();
          this.ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
          this.ctx.fill();
      }

      // Sniper Aim Line
      if (enemy.type === 'sniper' && enemy.state === EnemyState.Aiming && enemy.aimTarget) {
          const targetIso = this.toIso(enemy.aimTarget.x, enemy.aimTarget.y);
          // Transform target to local space (since we translated to enemy iso)
          const localTargetX = targetIso.x - iso.x;
          const localTargetY = targetIso.y - iso.y;

          this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
          this.ctx.lineWidth = 1;
          this.ctx.setLineDash([4, 4]);
          this.ctx.beginPath();
          this.ctx.moveTo(0, -height/2);
          this.ctx.lineTo(localTargetX, localTargetY);
          this.ctx.stroke();
          this.ctx.setLineDash([]);
      }
      
      // Health bar
      const hpPct = enemy.health / enemy.maxHealth;
      this.ctx.fillStyle = '#334155';
      this.ctx.fillRect(-10, -height - 8, 20, 4);
      this.ctx.fillStyle = '#ef4444';
      this.ctx.fillRect(-10, -height - 8, 20 * hpPct, 4);

      this.ctx.restore();
  }

  private drawEnemyCorpse(enemy: Enemy) {
      const iso = this.toIso(enemy.x, enemy.y);
      this.ctx.save();
      this.ctx.translate(iso.x, iso.y);
      
      this.ctx.fillStyle = '#1f2937'; // Dark grey corpse
      this.ctx.beginPath();
      this.ctx.ellipse(0, TILE_HEIGHT/2, 10, 5, 0, 0, Math.PI*2);
      this.ctx.fill();
      
      this.ctx.restore();
  }

  private drawParticle(p: Particle) {
    const iso = this.toIso(p.x, p.y);
    this.ctx.fillStyle = p.color;
    this.ctx.globalAlpha = p.life / p.maxLife; // Fade out
    
    this.ctx.beginPath();
    this.ctx.arc(iso.x, iso.y, p.size, 0, Math.PI * 2);
    this.ctx.fill();
    
    this.ctx.globalAlpha = 1.0;
  }

  private drawProjectiles(player: Player, enemies: Enemy[]) {
    const allProjectiles = [...player.projectiles];
    // Gather enemy projectiles
    enemies.forEach(e => allProjectiles.push(...e.projectiles));

    for (const p of allProjectiles) {
        const iso = this.toIso(p.x, p.y);
        
        // Draw Projectile Tail (Motion Trail)
        const velScreen = this.toIso(p.vx, p.vy);
        const trailLen = 0.08; 
        
        const tailX = iso.x - velScreen.x * trailLen;
        const tailY = iso.y - velScreen.y * trailLen;

        const isEnemy = p.owner === 'enemy';
        const coreColor = isEnemy ? '#ef4444' : PROJECTILE_COLOR;

        const grad = this.ctx.createLinearGradient(iso.x, iso.y, tailX, tailY);
        grad.addColorStop(0, coreColor);
        grad.addColorStop(1, 'rgba(0,0,0,0)');

        this.ctx.lineWidth = PROJECTILE_SIZE * 2;
        this.ctx.lineCap = 'round';
        this.ctx.strokeStyle = grad;
        this.ctx.beginPath();
        this.ctx.moveTo(iso.x, iso.y);
        this.ctx.lineTo(tailX, tailY);
        this.ctx.stroke();

        this.ctx.fillStyle = '#fff';
        this.ctx.beginPath();
        this.ctx.arc(iso.x, iso.y, PROJECTILE_SIZE, 0, Math.PI * 2);
        this.ctx.fill();
    }
  }

  private drawInteractionPrompt(obj: WorldObject) {
    const iso = this.toIso(obj.x, obj.y);
    this.ctx.save();
    this.ctx.translate(iso.x, iso.y - (obj.height || 32) - 10);
    this.ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    this.ctx.beginPath();
    this.ctx.roundRect(-12, -12, 24, 24, 4);
    this.ctx.fill();
    this.ctx.strokeStyle = COLORS.interactable;
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 14px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('E', 0, 1);
    this.ctx.restore();
  }

  private drawReticle(x: number, y: number, spread: number) {
    const size = 8 + (spread * 30); // Dynamic spread size
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.strokeStyle = COLORS.reticle;
    this.ctx.lineWidth = 2;
    
    // Crosshair with gaps for bloom
    this.ctx.beginPath();
    this.ctx.moveTo(0, -size);
    this.ctx.lineTo(0, -4);
    this.ctx.moveTo(0, 4);
    this.ctx.lineTo(0, size);
    this.ctx.moveTo(-size, 0);
    this.ctx.lineTo(-4, 0);
    this.ctx.moveTo(4, 0);
    this.ctx.lineTo(size, 0);
    this.ctx.stroke();
    
    this.ctx.restore();
  }
}
