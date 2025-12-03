
import { Particle } from './types';
import { COLORS } from './constants';

export class ParticleSystem {
  particles: Particle[] = [];
  
  public spawn(x: number, y: number, type: Particle['type']) {
    const count = type === 'blood' ? 5 : type === 'spark' ? 3 : 1;
    
    for (let i = 0; i < count; i++) {
      let vx = (Math.random() - 0.5) * 4;
      let vy = (Math.random() - 0.5) * 4;
      let life = 0.5;
      let color = COLORS.spark;
      let size = Math.random() * 2 + 1;

      if (type === 'muzzle') {
        vx *= 0.5;
        vy *= 0.5;
        life = 0.1;
        color = COLORS.muzzleFlash;
        size = Math.random() * 3 + 2;
      } else if (type === 'blood') {
        vx *= 2;
        vy *= 2;
        life = 0.6 + Math.random() * 0.4;
        color = COLORS.blood;
        size = Math.random() * 3 + 1;
      } else if (type === 'smoke') {
        vx *= 0.2;
        vy = -1 - Math.random(); // Upward drift
        life = 1.0;
        color = COLORS.smoke;
        size = Math.random() * 4 + 2;
      }

      this.particles.push({
        x, y, vx, vy, life, maxLife: life, type, color, size
      });
    }
  }

  public update(deltaTime: number) {
    // Iterate backwards to allow safe removal
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= deltaTime;
      
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;

      // Friction / Gravity
      if (p.type === 'blood') {
        p.vx *= 0.95; // Drag
        p.vy *= 0.95; 
      }

      if (p.life <= 0) {
        // Optimization: Swap with last element and pop (O(1)) instead of splice (O(N))
        // Order of particles does not matter for rendering
        const lastIndex = this.particles.length - 1;
        if (i !== lastIndex) {
            this.particles[i] = this.particles[lastIndex];
        }
        this.particles.pop();
      }
    }
  }
}
