
import { SimplexNoise } from './SimplexNoise';

export class CameraShake {
  private trauma: number = 0;
  private noise: SimplexNoise;
  private time: number = 0;
  private maxOffset: number = 30; // Increased max offset
  private maxRoll: number = 5;    // Max degrees roll

  constructor() {
    this.noise = new SimplexNoise(123);
  }

  public addTrauma(amount: number) {
    this.trauma = Math.min(this.trauma + amount, 1.0);
  }

  public update(deltaTime: number): { x: number, y: number, angle: number } {
    if (this.trauma > 0) {
      this.trauma -= deltaTime; // Linear decay
      if (this.trauma < 0) this.trauma = 0;
    }

    this.time += deltaTime * 20; // Move through noise map
    
    // Shake = Trauma^2 (Non-linear falloff feels better)
    const shake = this.trauma * this.trauma;
    
    const noiseX = this.noise.noise2D(this.time, 0);
    const noiseY = this.noise.noise2D(0, this.time);
    const noiseA = this.noise.noise2D(this.time, this.time);

    return {
      x: this.maxOffset * shake * noiseX,
      y: this.maxOffset * shake * noiseY,
      angle: this.maxRoll * shake * noiseA * (Math.PI / 180)
    };
  }
}