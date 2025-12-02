
import { Chunk, TileType, WorldObject, Tile, ITilePool } from './types';
import { 
  MAP_WIDTH, MAP_HEIGHT, CHUNK_SIZE, COLORS,
  ROOFTOP_PLATFORM_COUNT, ROOFTOP_MIN_SIZE, ROOFTOP_MAX_SIZE, BRIDGE_MIN_LEN, BRIDGE_MAX_LEN
} from './constants';

export interface MapData {
  chunks: Map<string, Chunk>;
  objects: WorldObject[];
  spawnPosition: { x: number, y: number };
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export class RooftopGenerator {
  public generateMap(tilePool: ITilePool): MapData {
    const grid: TileType[][] = [];
    const objects: WorldObject[] = [];

    // 1. Initialize Grid to Gap (Void)
    for (let x = 0; x < MAP_WIDTH; x++) {
      grid[x] = [];
      for (let y = 0; y < MAP_HEIGHT; y++) {
        grid[x][y] = TileType.Gap;
      }
    }

    // 2. Spawn Platform (Center)
    const spawnRect: Rect = {
      x: Math.floor(MAP_WIDTH / 2) - 3,
      y: Math.floor(MAP_HEIGHT / 2) - 3,
      w: 6,
      h: 6
    };
    this.fillRect(grid, spawnRect, TileType.Rooftop);
    const platforms: Rect[] = [spawnRect];

    // 3. Generate Branching Platforms
    let attempts = 0;
    while (platforms.length < ROOFTOP_PLATFORM_COUNT && attempts < 1000) {
      attempts++;
      
      // Pick random existing platform
      const source = platforms[Math.floor(Math.random() * platforms.length)];
      
      // Pick direction
      const dir = Math.floor(Math.random() * 4); // 0: N, 1: E, 2: S, 3: W
      
      // Bridge Params
      const bridgeLen = BRIDGE_MIN_LEN + Math.floor(Math.random() * (BRIDGE_MAX_LEN - BRIDGE_MIN_LEN));
      const newW = ROOFTOP_MIN_SIZE + Math.floor(Math.random() * (ROOFTOP_MAX_SIZE - ROOFTOP_MIN_SIZE));
      const newH = ROOFTOP_MIN_SIZE + Math.floor(Math.random() * (ROOFTOP_MAX_SIZE - ROOFTOP_MIN_SIZE));

      // Calculate new Rect pos based on bridge + source edge
      let bridgeRect: Rect | null = null;
      let newRect: Rect | null = null;

      // Simple logic: extend from center of edge
      if (dir === 0) { // North (Up Y-)
        const startX = source.x + Math.floor(source.w / 2);
        const startY = source.y;
        newRect = { x: startX - Math.floor(newW/2), y: startY - bridgeLen - newH, w: newW, h: newH };
        bridgeRect = { x: startX, y: startY - bridgeLen, w: 1, h: bridgeLen };
      } else if (dir === 2) { // South (Down Y+)
        const startX = source.x + Math.floor(source.w / 2);
        const startY = source.y + source.h;
        newRect = { x: startX - Math.floor(newW/2), y: startY + bridgeLen, w: newW, h: newH };
        bridgeRect = { x: startX, y: startY, w: 1, h: bridgeLen };
      } else if (dir === 3) { // West (Left X-)
        const startX = source.x;
        const startY = source.y + Math.floor(source.h / 2);
        newRect = { x: startX - bridgeLen - newW, y: startY - Math.floor(newH/2), w: newW, h: newH };
        bridgeRect = { x: startX - bridgeLen, y: startY, w: bridgeLen, h: 1 };
      } else { // East (Right X+)
        const startX = source.x + source.w;
        const startY = source.y + Math.floor(source.h / 2);
        newRect = { x: startX + bridgeLen, y: startY - Math.floor(newH/2), w: newW, h: newH };
        bridgeRect = { x: startX, y: startY, w: bridgeLen, h: 1 };
      }

      // Validate bounds and overlap
      if (this.isValid(grid, newRect) && this.isValid(grid, bridgeRect)) {
        this.fillRect(grid, newRect, TileType.Rooftop);
        this.fillRect(grid, bridgeRect, TileType.Bridge);
        platforms.push(newRect);
      }
    }

    // 4. Create Chunks
    const chunks = new Map<string, Chunk>();
    for (let cx = 0; cx < Math.ceil(MAP_WIDTH / CHUNK_SIZE); cx++) {
      for (let cy = 0; cy < Math.ceil(MAP_HEIGHT / CHUNK_SIZE); cy++) {
        const chunkTiles: Tile[][] = [];
        for (let i = 0; i < CHUNK_SIZE; i++) {
          chunkTiles[i] = [];
          for (let j = 0; j < CHUNK_SIZE; j++) {
            const wx = cx * CHUNK_SIZE + i;
            const wy = cy * CHUNK_SIZE + j;
            
            let tType = TileType.Gap;
            let tColor = COLORS.gap;
            
            if (wx < MAP_WIDTH && wy < MAP_HEIGHT) {
              tType = grid[wx][wy];
              if (tType === TileType.Rooftop) tColor = COLORS.rooftop;
              if (tType === TileType.Bridge) tColor = COLORS.bridge;
              if (tType === TileType.Gap) tColor = COLORS.gap;
            }

            chunkTiles[i][j] = tilePool.get(tType, tColor, wx, wy);
          }
        }
        chunks.set(`${cx},${cy}`, { x: cx, y: cy, tiles: chunkTiles, generated: true });
      }
    }

    // 5. Spawn Point
    const spawnPosition = {
      x: spawnRect.x + Math.floor(spawnRect.w / 2) + 0.5,
      y: spawnRect.y + Math.floor(spawnRect.h / 2) + 0.5
    };

    return { chunks, objects, spawnPosition };
  }

  private isValid(grid: TileType[][], r: Rect): boolean {
    // Check bounds
    if (r.x < 1 || r.y < 1 || r.x + r.w >= MAP_WIDTH - 1 || r.y + r.h >= MAP_HEIGHT - 1) return false;
    
    // Check overlap (must be Gap)
    // We allow a little overlap for bridges to connect, but platforms shouldn't smash into each other
    for (let x = r.x; x < r.x + r.w; x++) {
      for (let y = r.y; y < r.y + r.h; y++) {
        if (grid[x][y] !== TileType.Gap) return false;
      }
    }
    return true;
  }

  private fillRect(grid: TileType[][], r: Rect, type: TileType) {
    for (let x = r.x; x < r.x + r.w; x++) {
      for (let y = r.y; y < r.y + r.h; y++) {
        grid[x][y] = type;
      }
    }
  }
}
