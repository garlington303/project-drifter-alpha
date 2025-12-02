
import { Chunk, Position, Tile, TileType, ITilePool, WorldObject, IWorld, Particle, Enemy } from './types';
import { OverworldGenerator } from './OverworldGenerator';
import { RooftopGenerator } from './RooftopGenerator';
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
  
  // Generators
  overworldGen: OverworldGenerator;
  rooftopGen: RooftopGenerator;
  currentMap: 'overworld' | 'rooftop' = 'overworld';

  // Systems
  particleSystem: ParticleSystem;
  cameraShake: CameraShake;
  combatDirector: CombatDirector;
  hitStopTimer: number = 0;

  constructor() {
    this.chunks = new Map();
    this.objects = [];
    this.enemies = [];
    this.tilePool = new TilePool();
    this.overworldGen = new OverworldGenerator();
    this.rooftopGen = new RooftopGenerator();
    
    this.particleSystem = new ParticleSystem();
    this.cameraShake = new CameraShake();
    this.combatDirector = new CombatDirector();
    
    // Start with Overworld
    this.loadMap('overworld');
  }

  loadMap(type: 'overworld' | 'rooftop') {
    this.currentMap = type;
    this.chunks.clear();
    this.objects = [];
    this.enemies = []; // Clear enemies on switch

    let data;
    if (type === 'rooftop') {
      data = this.rooftopGen.generateMap(this.tilePool);
    } else {
      data = this.overworldGen.generateOverworld(this.tilePool);
    }

    this.chunks = data.chunks;
    this.objects = data.objects;
    this.spawnPosition = data.spawnPosition;
    
    // Spawn Test Enemies (Varied Squad)
    if (type === 'overworld') {
       this.spawnEnemy(this.spawnPosition.x + 5, this.spawnPosition.y + 5, 'tank');
       this.spawnEnemy(this.spawnPosition.x + 8, this.spawnPosition.y + 4, 'sniper');
       this.spawnEnemy(this.spawnPosition.x + 4, this.spawnPosition.y + 8, 'swarmer');
       this.spawnEnemy(this.spawnPosition.x + 3, this.spawnPosition.y + 8, 'swarmer');
       this.spawnEnemy(this.spawnPosition.x + 5, this.spawnPosition.y + 9, 'swarmer');
    }
  }

  spawnEnemy(x: number, y: number, type: 'basic' | 'shooter' | 'swarmer' | 'sniper' | 'tank' = 'basic') {
      const enemy = new EnemyAI(this.enemies.length + 1, x, y, type);
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
    if (tile.type === TileType.Water || tile.type === TileType.Stone) return false;
    
    // Rooftop Impassables
    if (tile.type === TileType.Gap) return false;

    // 2. Check Objects (Trees, Cliffs)
    for (const obj of this.objects) {
        // Door is walkable (triggers logic)
        if (obj.type === 'door') continue;

        // Simple circle collision for objects
        const dx = x - obj.x;
        const dy = y - obj.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        const radius = (obj.width || 1) * 0.4;
        if (dist < radius) return false;
    }

    return true;
  }

  isProjectilePassable(x: number, y: number): boolean {
    // 1. Check Tile Type
    const tile = this.getTileAt(x, y);
    if (!tile) return false;
    
    // Projectiles BLOCKED by Stone (Mountains)
    if (tile.type === TileType.Stone) return false;
    
    // Projectiles PASS over Water and Gap (Void)
    // So we don't return false for Water/Gap here.

    // 2. Check Objects (Trees, Cliffs should still block projectiles)
    for (const obj of this.objects) {
        if (obj.type === 'door') continue;

        const dx = x - obj.x;
        const dy = y - obj.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        const radius = (obj.width || 1) * 0.4;
        if (dist < radius) return false;
    }

    return true;
  }

  update(playerPos: Position, deltaTime: number) {
    this.particleSystem.update(deltaTime);

    // Check Interactions (like portals)
    for (const obj of this.objects) {
        if (obj.type === 'door' && obj.interacted) {
             obj.interacted = false; 
             if (this.currentMap === 'overworld') {
                 this.loadMap('rooftop');
                 playerPos.x = this.spawnPosition.x;
                 playerPos.y = this.spawnPosition.y;
             }
        }

        // Nature Fader
        if (obj.type === 'tree' || obj.type === 'giant_tree' || obj.type === 'cliff') {
            const dist = Math.sqrt((playerPos.x - obj.x)**2 + (playerPos.y - obj.y)**2);
            if (dist < 1.5 && playerPos.y < obj.y + 0.5) { 
                 obj.opacity = 0.5;
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
