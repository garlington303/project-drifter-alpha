
import { ICombatDirector } from './types';
import { MAX_ATTACK_TOKENS } from './constants';

export class CombatDirector implements ICombatDirector {
  private currentTokens: number = 0;
  private tokenHolders: Set<number> = new Set();

  public requestToken(enemyId: number): boolean {
    if (this.tokenHolders.has(enemyId)) return true; // Already has one
    
    if (this.currentTokens < MAX_ATTACK_TOKENS) {
      this.currentTokens++;
      this.tokenHolders.add(enemyId);
      return true;
    }
    return false;
  }

  public releaseToken(enemyId: number): void {
    if (this.tokenHolders.has(enemyId)) {
      this.tokenHolders.delete(enemyId);
      this.currentTokens = Math.max(0, this.currentTokens - 1);
    }
  }
}
