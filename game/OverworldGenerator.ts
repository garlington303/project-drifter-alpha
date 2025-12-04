
import { Chunk, TileType, WorldObject, Tile, ITilePool } from './types';
import { 
  MAP_WIDTH, MAP_HEIGHT, CHUNK_SIZE, NOISE_SCALE, COLORS,
  THRESHOLD_WATER, THRESHOLD_GROUND, THRESHOLD_FOREST, THRESHOLD_DEEP_FOREST, THRESHOLD_MOUNTAIN,
  TREE_WIDTH, TREE_HEIGHT, GIANT_TREE_WIDTH, GIANT_TREE_HEIGHT, CLIFF_HEIGHT
} from './constants';
import { SimplexNoise } from './SimplexNoise';

export interface OverworldData {
  chunks: Map<string, Chunk>;
  objects: WorldObject[];
  spawnPosition: { x: number, y: number };
}

export class OverworldGenerator {
  private noise: SimplexNoise;
  private seed: number;

  constructor(seed: number = Math.random() * 10000) {
    this.seed = seed;
    this.noise = new SimplexNoise(seed);
  }

  public generateOverworld(tilePool: ITilePool): OverworldData {
    const chunks = new Map<string, Chunk>();
    const objects: WorldObject[] = [];
    
    // 1. Generate Terrain Grid
    const grid: TileType[][] = [];

    for (let x = 0; x < MAP_WIDTH; x++) {
      grid[x] = [];
      for (let y = 0; y < MAP_HEIGHT; y++) {
        // Simple circular mask to make an island shape
        const dx = x - MAP_WIDTH / 2;
        const dy = y - MAP_HEIGHT / 2;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const maxDist = MAP_WIDTH / 2;
        const mask = 1 - Math.min(dist / maxDist, 1); // 1 at center, 0 at edge

        // Get Noise Value
        let n = this.noise.noise2D(x * NOISE_SCALE, y * NOISE_SCALE) * 0.5 + 0.5; // 0-1
        n = n * 0.8 + mask * 0.2; // Blend with mask to force edges to water

        // Biome Logic
        let type = TileType.Water;
        if (n > THRESHOLD_MOUNTAIN) type = TileType.Stone;
        else if (n > THRESHOLD_DEEP_FOREST) type = TileType.Grass; // Deep forest floor
        else if (n > THRESHOLD_FOREST) type = TileType.Grass; // Forest floor
        else if (n > THRESHOLD_GROUND) type = TileType.Grass;
        else if (n > THRESHOLD_WATER) type = TileType.Dirt; // Shore/Ground
        else type = TileType.Water;

        grid[x][y] = type;

        // Object Placement Logic
        if (type !== TileType.Water && type !== TileType.Stone) {
          this.placeNatureObject(x, y, n, objects);
        } else if (type === TileType.Stone) {
            // Place cliffs on mountains
            if (Math.random() < 0.4) {
                 objects.push({
                    id: `cliff_${x}_${y}`,
                    type: 'cliff',
                    x: x + 0.5,
                    y: y + 0.5,
                    width: 1,
                    depth: 1,
                    height: CLIFF_HEIGHT,
                    interactable: false
                });
            }
        }
      }
    }

    // 2. Connectivity / Flood Fill (Simplified: Center is usually connected in this implementation)
    
    // 3. Convert Grid to Chunks
    for (let cx = 0; cx < Math.ceil(MAP_WIDTH / CHUNK_SIZE); cx++) {
      for (let cy = 0; cy < Math.ceil(MAP_HEIGHT / CHUNK_SIZE); cy++) {
        const chunkTiles: Tile[][] = [];
        for (let i = 0; i < CHUNK_SIZE; i++) {
          chunkTiles[i] = [];
          for (let j = 0; j < CHUNK_SIZE; j++) {
            const wx = cx * CHUNK_SIZE + i;
            const wy = cy * CHUNK_SIZE + j;
            
            let tType = TileType.Water;
            let tColor = COLORS.water;
            
            if (wx < MAP_WIDTH && wy < MAP_HEIGHT) {
              tType = grid[wx][wy];
              if (tType === TileType.Grass) tColor = COLORS.grass;
              if (tType === TileType.Dirt) tColor = COLORS.dirt;
              if (tType === TileType.Stone) tColor = COLORS.stone;
            }

            chunkTiles[i][j] = tilePool.get(tType, tColor, wx, wy);
          }
        }
        chunks.set(`${cx},${cy}`, { x: cx, y: cy, tiles: chunkTiles, generated: true });
      }
    }

    // 4. Determine Spawn Point (Center-most valid tile)
    const spawnPosition = { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 };

    return { chunks, objects, spawnPosition };
  }

  private placeNatureObject(x: number, y: number, noiseVal: number, objects: WorldObject[]) {
    // Random jitter for organic placement
    const offsetX = (Math.random() - 0.5) * 0.6;
    const offsetY = (Math.random() - 0.5) * 0.6;
    const wx = x + 0.5 + offsetX;
    const wy = y + 0.5 + offsetY;

    // Deep Forest -> Giant Trees
    if (noiseVal > THRESHOLD_DEEP_FOREST) {
      if (Math.random() < 0.35) { // Dense
        objects.push({
          id: `gtree_${x}_${y}`,
          type: 'giant_tree',
          x: wx,
          y: wy,
          width: 1,
          depth: 1,
          height: GIANT_TREE_HEIGHT,
          interactable: false,
          seed: Math.random()
        });
      }
    }
    // Forest -> Regular Trees
    else if (noiseVal > THRESHOLD_FOREST) {
      if (Math.random() < 0.25) { // Moderate
        objects.push({
          id: `tree_${x}_${y}`,
          type: 'tree',
          x: wx,
          y: wy,
          width: 0.5,
          depth: 0.5,
          height: TREE_HEIGHT,
          interactable: false,
          seed: Math.random()
        });
      }
    }
  }
}
