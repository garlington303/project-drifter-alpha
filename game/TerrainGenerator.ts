
import { Chunk, Tile, TileType, ITilePool } from './types';
import { CHUNK_SIZE, COLORS } from './constants';
import { SimplexNoise } from './SimplexNoise';

export class TerrainGenerator {
  seed: number;
  private noise: SimplexNoise;

  constructor(seed: number = 12345) {
    this.seed = seed;
    this.noise = new SimplexNoise(seed);
  }

  // Fractal Brownian Motion (FBM) to combine multiple layers of noise
  private getFBM(x: number, y: number, octaves: number, persistence: number, scale: number): number {
    let total = 0;
    let frequency = scale;
    let amplitude = 1;
    let maxValue = 0;  // Used for normalizing result to 0.0 - 1.0

    for(let i=0; i < octaves; i++) {
        total += this.noise.noise2D(x * frequency, y * frequency) * amplitude;
        maxValue += amplitude;
        amplitude *= persistence;
        frequency *= 2;
    }
    
    // Normalize to range [-1, 1] approximately, then shift to [0, 1] for easier logic
    return (total / maxValue) + 0.5; // Result roughly 0 to 1
  }

  public generateChunk(chunkX: number, chunkY: number, pool: ITilePool): Chunk {
    const tiles: Tile[][] = [];

    const startX = chunkX * CHUNK_SIZE;
    const startY = chunkY * CHUNK_SIZE;

    for (let x = 0; x < CHUNK_SIZE; x++) {
      tiles[x] = [];
      for (let y = 0; y < CHUNK_SIZE; y++) {
        const worldX = startX + x;
        const worldY = startY + y;
        
        const tile = this.generateTile(worldX, worldY, pool);
        tiles[x][y] = tile;
      }
    }

    return {
      x: chunkX,
      y: chunkY,
      tiles,
      generated: true
    };
  }

  public generateTile(worldX: number, worldY: number, pool: ITilePool): Tile {
    // FBM Parameters
    const scale = 0.03;      // Zoom level (lower = larger biomes)
    const octaves = 3;       // Detail level
    const persistence = 0.5; // Roughness

    const val = this.getFBM(worldX, worldY, octaves, persistence, scale);
    
    let type = TileType.Grass;
    let color = COLORS.grass;

    // Map noise values to terrain types
    // val is roughly 0.0 to 1.0
    if (val < 0.35) {
      type = TileType.Dirt;
      color = COLORS.dirt;
    } else if (val > 0.65) {
      type = TileType.Stone;
      color = COLORS.stone;
    } else {
      type = TileType.Grass;
      color = COLORS.grass;
    }

    // Optional: Add slight variation to color based on a high-frequency noise
    // This makes the ground look less like a solid block of color
    const variation = (this.noise.noise2D(worldX * 0.2, worldY * 0.2) * 0.05);
    // Note: To apply variation properly we'd need to parse hex to HSL/RGB, 
    // but for now we'll stick to base colors to avoid complex color util overhead.
    
    return pool.get(type, color, worldX, worldY);
  }
}
