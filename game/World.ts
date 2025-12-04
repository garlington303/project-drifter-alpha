
import { Chunk, Position, Tile, TileType, ITilePool, WorldObject, IWorld, Particle, Enemy } from './types';
import { OverworldGenerator } from './OverworldGenerator';
import { CHUNK_SIZE, TILE_WIDTH, TILE_HEIGHT, PROJECTILE_SIZE, PROJECTILE_SPEED, COLORS } from './constants';
import { EnemyAI } from './Enemy';
import { ParticleSystem } from './ParticleSystem';
import { CameraShake } from './CameraShake';
import { CombatDirector } from './CombatDirector';

class TilePool implements ITilePool {
  private pool: Tile[] = [];

  get(type: TileType, color: string, worldX: number, worldY: number): Tile {
    const tile = this.pool.pop();
    if (tile) {
      tile.type = type;
      tile.color = color;
      tile.worldX = worldX;
      tile.worldY = worldY;
      return tile;
    }
    return { type, color, worldX, worldY };
  }

  release(tile: Tile) {
    this.pool.push(tile);
  }
}

export class World implements IWorld {
  chunks: Map<string, Chunk>;
  objects: WorldObject[];
  enemies: EnemyAI[];
  tilePool: TilePool;
  spawnPosition: Position;
  
  // Spatial Hash for Static Object Collision (Optimization)
  // Key: "x,y" integer coordinates
  private staticCollisionMap: Map<string, WorldObject>;

  // Generators
  overworldGen: OverworldGenerator;
  currentMap: 'overworld' = 'overworld';

  // Systems
  particleSystem: ParticleSystem;
  cameraShake: CameraShake;
  combatDirector: CombatDirector;
  hitStopTimer: number = 0;

  constructor() {
    this.chunks = new Map();
    this.objects = [];
    this.enemies = [];
    this.staticCollisionMap = new Map();
    this.tilePool = new TilePool();
    this.overworldGen = new OverworldGenerator();
    
    this.particleSystem = new ParticleSystem();
    this.cameraShake = new CameraShake();
    this.combatDirector = new CombatDirector();
    
    // Generate Overworld
    this.initWorld();
  }

  initWorld() {
    this.chunks.clear();
    this.objects = [];
    this.enemies = [];
    this.staticCollisionMap.clear();

    const data = this.overworldGen.generateOverworld(this.tilePool);

    this.chunks = data.chunks;
    this.objects = data.objects;
    this.spawnPosition = data.spawnPosition;
    
    // Build Spatial Hash
    this.buildCollisionMap();
  }

  private buildCollisionMap() {
      for (const obj of this.objects) {
          // Map object to its integer tile coordinate
          const key = `${Math.round(obj.x)},${Math.round(obj.y)}`;
          this.staticCollisionMap.set(key, obj);
      }
  }

  spawnEnemy(x: number, y: number, type: 'basic' | 'shooter' | 'swarmer' | 'sniper' | 'tank' = 'basic') {
      const enemy = new EnemyAI(Math.random(), x, y, type);
      this.enemies.push(enemy);
  }

  // --- Interface Impl ---
  spawnParticle(x: number, y: number, type: Particle['type']) {
    this.particleSystem.spawn(x, y, type);
  }

  triggerHitStop(duration: number) {
    this.hitStopTimer = duration;
  }

  addTrauma(amount: number) {
    this.cameraShake.addTrauma(amount);
  }

  getChunkKey(x: number, y: number): string {
    return `${x},${y}`;
  }

  getTileAt(x: number, y: number): Tile | null {
    const chunkX = Math.floor(x / CHUNK_SIZE);
    const chunkY = Math.floor(y / CHUNK_SIZE);
    const chunk = this.chunks.get(this.getChunkKey(chunkX, chunkY));
    
    if (!chunk) return null;

    const localX = Math.floor(x) % CHUNK_SIZE;
    const localY = Math.floor(y) % CHUNK_SIZE;

    // Handle negative coordinates modulo
    const lx = localX < 0 ? localX + CHUNK_SIZE : localX;
    const ly = localY < 0 ? localY + CHUNK_SIZE : localY;

    if (lx >= 0 && lx < CHUNK_SIZE && ly >= 0 && ly < CHUNK_SIZE) {
        return chunk.tiles[lx][ly];
    }
    return null;
  }

  isWalkable(x: number, y: number): boolean {
    // 1. Check Tile Type
    const tile = this.getTileAt(x, y);
    if (!tile) return false;
    
    // Overworld Impassables
    // Added Gap here
    if (tile.type === TileType.Water || tile.type === TileType.Stone || tile.type === TileType.Gap) return false;

    // 2. Check Static Objects (O(1) Lookup)
    const key = `${Math.round(x)},${Math.round(y)}`;
    const obj = this.staticCollisionMap.get(key);
    
    if (obj) {
        // Simple circle collision for objects found at this tile
        const dx = x - obj.x;
        const dy = y - obj.y;
        const distSq = dx*dx + dy*dy;
        const radius = (obj.width || 1) * 0.4;
        if (distSq < radius * radius) return false;
    }

    return true;
  }

  isProjectilePassable(x: number, y: number): boolean {
    // 1. Check Tile Type
    const tile = this.getTileAt(x, y);
    if (!tile) return false;
    
    // Projectiles BLOCKED by Stone (Mountains)
    // Projectiles PASS over Gap/Water
    if (tile.type === TileType.Stone) return false;
    
    // 2. Check Static Objects (O(1) Lookup)
    const key = `${Math.round(x)},${Math.round(y)}`;
    const obj = this.staticCollisionMap.get(key);

    if (obj) {
        const dx = x - obj.x;
        const dy = y - obj.y;
        const distSq = dx*dx + dy*dy;
        const radius = (obj.width || 1) * 0.4;
        if (distSq < radius * radius) return false;
    }

    return true;
  }

  update(playerPos: Position, deltaTime: number) {
    this.particleSystem.update(deltaTime);

    // Nature Fader (Distance Check Optimization)
    // Only iterate objects if they are interactive or need fading
    // For now, iterating all objects is okay as N is usually < 1000
    for (const obj of this.objects) {
        if (obj.type === 'tree' || obj.type === 'giant_tree' || obj.type === 'cliff') {
            const dx = playerPos.x - obj.x;
            const dy = playerPos.y - obj.y;
            // Quick AABB check before sqrt
            if (Math.abs(dx) < 2 && Math.abs(dy) < 2) {
                const distSq = dx*dx + dy*dy;
                // Fade if close and player is "behind" (y < obj.y)
                if (distSq < 2.25 && playerPos.y < obj.y + 0.5) { 
                     obj.opacity = 0.5;
                } else {
                     obj.opacity = 1.0;
                }
            } else {
                obj.opacity = 1.0;
            }
        }
    }

    // Update Enemies
    for (const enemy of this.enemies) {
        enemy.update(deltaTime, playerPos, this);
    }
  }

  getVisibleChunks(): Chunk[] {
      return Array.from(this.chunks.values());
  }
}
