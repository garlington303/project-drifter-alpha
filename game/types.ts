
export interface Position {
  x: number;
  y: number;
}

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
  interact: boolean;
  fireLeft: boolean;
  fireRight: boolean;
  dashDir: Position | null; // Direction vector for dash, or null
  mouseX: number;
  mouseY: number;
}

export interface Projectile {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  owner: 'player' | 'enemy';
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  type: 'muzzle' | 'blood' | 'spark' | 'smoke';
  color: string;
  size: number;
}

export interface IDamageable {
  health: number;
  maxHealth: number;
  takeDamage(amount: number, knockbackDir: Position): void;
  die(): void;
}

export interface Enemy extends IDamageable {
  id: number;
  type: 'basic' | 'shooter' | 'swarmer' | 'sniper' | 'tank';
  x: number;
  y: number;
  state: EnemyState;
  color: string;
  projectiles: Projectile[];
  hitboxRadius: number; // For collision detection
  
  // AI Specifics
  hasAttackToken: boolean;
  aimTimer?: number; // For Snipers
  aimTarget?: Position; // For Snipers
  shieldActive?: boolean; // For Tanks
  shieldTimer?: number; // For Tanks
}

export enum EnemyState {
  Idle,
  Chase,
  Attack,
  Retreat, // For Snipers
  Aiming,  // For Snipers
  Shield,  // For Tanks
  Dead
}

export enum TileType {
  Water = 'water', // Deep water/Abyss
  Grass = 'grass',
  Dirt = 'dirt',
  Stone = 'stone', // Mountainous ground
  Floor = 'floor',
  Foundation = 'foundation',
  Extraction = 'extraction',
  Abyss = 'abyss',
  Wall = 'wall',
  Rooftop = 'rooftop', // Concrete platform
  Bridge = 'bridge',   // Connecting path
  Gap = 'gap'          // Impassable void/sand
}

export interface Tile {
  type: TileType;
  color: string;
  worldX: number;
  worldY: number;
}

export interface ITilePool {
  get(type: TileType, color: string, worldX: number, worldY: number): Tile;
  release(tile: Tile): void;
}

export interface Chunk {
  x: number;
  y: number;
  tiles: Tile[][];
  generated: boolean;
}

export interface WorldObject {
  id: string;
  type: 'crate' | 'rock' | 'terminal' | 'tree' | 'giant_tree' | 'cliff' | 'stairs_up' | 'stairs_down' | 'door';
  x: number;
  y: number;
  width: number; // For collision/rendering (base width)
  depth?: number; // Base depth
  height: number; // Visual height
  interactable: boolean;
  interacted?: boolean; // State
  
  // Visuals
  opacity?: number; // For occlusion
  sortOffset?: number; // Fine tune depth sorting
  
  // Nature specifics
  seed?: number; // For random variation
  
  // Building specifics
  tiers?: BuildingTier[];
  variant?: number;
}

export interface BuildingTier {
    width: number;
    depth: number;
    height: number;
    offsetY: number; // Vertical start position relative to base
}

export interface Camera {
  x: number;
  y: number;
}

export interface IWorld {
  enemies: Enemy[]; // Expose enemies for Flocking/Collision
  combatDirector: ICombatDirector;
  isWalkable(x: number, y: number): boolean;
  isProjectilePassable(x: number, y: number): boolean;
  triggerHitStop(duration: number): void;
  spawnParticle(x: number, y: number, type: Particle['type']): void;
  addTrauma(amount: number): void;
}

export interface ICombatDirector {
  requestToken(enemyId: number): boolean;
  releaseToken(enemyId: number): void;
}
