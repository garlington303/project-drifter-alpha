
export const TILE_WIDTH = 32;
export const TILE_HEIGHT = 16; // Half height for 2:1 isometric ratio

export const CHUNK_SIZE = 16; // 16x16 tiles per chunk
export const LOAD_RADIUS = 2; // Keep 2 chunks loaded in every direction (5x5 grid)
export const MAX_CHUNKS = 49; // Safety limit (7x7)

export const CAMERA_ZOOM = 3.5; // Zoom level for the camera (3.5x)
export const CAMERA_LOOK_AHEAD = 0.10; // How much the camera follows the mouse (0 = none, 1 = locked to mouse)
export const MAX_CAMERA_OFFSET = 50; // Max pixels the camera can shift from center (screen space)

export const BASE_SPEED = 8; // Tiles per second (adjusted for tile-based movement)
export const SPRINT_MULTIPLIER = 1.8;
export const ROTATION_SPEED = 15; // Smooth rotation speed
export const AIM_DEADZONE = 10; // Pixels distance to ignore rotation updates (prevents jitter)

// Dash System
export const DASH_SPEED = 24; // Significantly faster than sprint (approx 3x base)
export const DASH_DURATION = 0.2; // Short burst (seconds)
export const DASH_COOLDOWN = 0.8; // Seconds before dashing again
export const DASH_STAMINA_COST = 20;
export const DOUBLE_TAP_WINDOW = 250; // ms to register a double tap

// Stamina System
export const STAMINA_MAX = 100;
export const STAMINA_DRAIN_RATE = 25; // Units per second while sprinting
export const STAMINA_REGEN_RATE = 15; // Units per second while regenerating
export const STAMINA_REGEN_DELAY = 1.5; // Seconds before regen starts after spending stamina
export const STAMINA_EXHAUST_RECOVERY = 15; // Amount needed to recover from 0 before sprinting again
export const STAMINA_COST_FIRE = 2.5; // Very small cost per shot

// Mana System
export const MANA_MAX = 100;
export const MANA_REGEN_RATE = 15; // Units per second
export const MANA_REGEN_DELAY = 1.0; // Seconds delay after firing
export const MANA_COST_FIRE = 8; // Cost per shot

// Interaction
export const INTERACTION_RADIUS = 1.5; // World units (tiles)

// Projectile Constants
export const PROJECTILE_SPEED = 25; // Tiles per second
export const PROJECTILE_LIFETIME = 0.78; // Seconds (Reduced by 35% from 1.2)
export const PROJECTILE_SIZE = 2; // Slightly smaller core, but renderer will add trail
export const PROJECTILE_COLOR = '#fbbf24'; // Amber/Gold

// Weapon Feel (New)
export const PLAYER_DAMAGE = 25; // Base damage per shot
export const RECOIL_DURATION = 0.1; // Seconds for visual kickback
export const MAX_SPREAD = 0.3; // Radians (approx 17 degrees)
export const SPREAD_PER_SHOT = 0.1;
export const SPREAD_RECOVERY = 0.8; // Radians per second
export const SHAKE_ON_FIRE = 0.05; // Very subtle shake per shot
export const SHAKE_ON_DAMAGE = 0.15; // Reduced from 0.3 for subtler impact
export const SHAKE_ON_WALL_HIT = 0.05; // Impact shake

// Sprite Constants
export const PLAYER_WIDTH = 32;
export const PLAYER_HEIGHT = 32;

// OVERWORLD GENERATION
export const MAP_WIDTH = 64; // Tiles
export const MAP_HEIGHT = 64; // Tiles
export const NOISE_SCALE = 0.05;

// Noise Thresholds (0.0 - 1.0)
export const THRESHOLD_WATER = 0.2;
export const THRESHOLD_GROUND = 0.45;
export const THRESHOLD_FOREST = 0.65;
export const THRESHOLD_DEEP_FOREST = 0.8;
export const THRESHOLD_MOUNTAIN = 0.85;

export const TREE_WIDTH = 24;
export const TREE_HEIGHT = 48; // Tall sprite
export const GIANT_TREE_WIDTH = 48;
export const GIANT_TREE_HEIGHT = 80;
export const CLIFF_HEIGHT = 32;

// ROOFTOP GENERATION (New)
export const ROOFTOP_PLATFORM_COUNT = 15;
export const ROOFTOP_MIN_SIZE = 6;
export const ROOFTOP_MAX_SIZE = 12;
export const BRIDGE_MIN_LEN = 4;
export const BRIDGE_MAX_LEN = 10;

// Visual Colors (Lush Fantasy Theme)
export const COLORS = {
  // Terrain
  water: '#3b82f6',      // Bright blue
  grass: '#10b981',      // Emerald Green
  dirt: '#b45309',       // Rich Earth
  stone: '#64748b',      // Slate Grey (Mountains)
  
  // Rooftop (New)
  gap: '#0f172a',        // Void (Slate 900)
  rooftop: '#475569',    // Concrete (Slate 600)
  bridge: '#64748b',     // Metal/Path (Slate 500)

  // Objects
  treeFoliage: '#059669',
  treeTrunk: '#78350f',
  giantTreeFoliage: '#064e3b',
  cliffFace: '#475569',
  cliffTop: '#64748b',

  // VFX
  muzzleFlash: '#fef3c7',
  spark: '#fbbf24',
  blood: '#dc2626',
  smoke: '#94a3b8',

  // Player & UI
  player: '#ef4444',
  highlight: 'rgba(255, 255, 255, 0.15)',
  shadow: 'rgba(0, 0, 0, 0.2)',
  border: 'rgba(0, 0, 0, 0.1)',
  reticle: '#10b981', 
  interactable: '#f59e0b', 
  
  // Enemy Colors
  enemyIdle: '#22c55e',
  enemyChase: '#eab308',
  enemyAttack: '#ef4444',
  enemySwarmer: '#84cc16', // Lime
  enemySniper: '#a855f7', // Purple
  enemyTank: '#475569',   // Slate
  enemyShield: '#3b82f6'  // Blue Shield
};

// --- ENEMY AI CONFIG ---

// Generic / Basic
export const ENEMY_SPEED = 3.5;
export const ENEMY_CHASE_RANGE = 12.0;
export const ENEMY_ATTACK_RANGE = 7.0;
export const ENEMY_ATTACK_COOLDOWN = 1.5;

// 1. Swarmer (Melee, Fast, Flocking)
export const SWARMER_HP = 40;
export const SWARMER_SPEED = 6.5;
export const SWARMER_DMG = 5;
export const FLOCK_SEPARATION_DIST = 1.2;
export const FLOCK_WEIGHT_SEPARATION = 2.0;
export const FLOCK_WEIGHT_COHESION = 0.5;

// 2. Sniper (Ranged, Fragile, Telegraphs)
export const SNIPER_HP = 30;
export const SNIPER_SPEED = 3.0;
export const SNIPER_RETREAT_DIST = 5.0; // Runs away if player gets this close
export const SNIPER_AIM_DIST = 10.0;
export const SNIPER_AIM_TIME = 1.0; // Seconds to lock on
export const SNIPER_PROJECTILE_SPEED = 40;
export const SNIPER_DMG = 30;

// 3. Tank (Heavy, Shielded)
export const TANK_HP = 150;
export const TANK_SPEED = 2.0;
export const TANK_DMG = 20;
export const TANK_SHIELD_DURATION = 3.0;
export const TANK_SHIELD_COOLDOWN = 5.0;
export const TANK_SHIELD_MITIGATION = 0.9; // 90% reduction

// Combat Director
export const MAX_ATTACK_TOKENS = 3; // Max enemies attacking at once
