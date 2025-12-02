

import { InputState } from './types';
import { DOUBLE_TAP_WINDOW } from './constants';

export class InputManager {
  keys: Set<string>;
  mouseX: number = 0;
  mouseY: number = 0;
  isLeftMouseDown: boolean = false;
  isRightMouseDown: boolean = false;

  // Double tap detection
  private lastKeyTimes: Map<string, number> = new Map();
  private pendingDash: { x: number, y: number } | null = null;

  constructor() {
    this.keys = new Set();
    this.bindEvents();
  }

  private bindEvents() {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);

      // Double tap logic
      if (!e.repeat) {
        const now = Date.now();
        const lastTime = this.lastKeyTimes.get(e.code) || 0;
        
        if (now - lastTime < DOUBLE_TAP_WINDOW) {
          this.handleDoubleTap(e.code);
        }
        
        this.lastKeyTimes.set(e.code, now);
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });

    window.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    });

    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) { // Left click
        this.isLeftMouseDown = true;
      }
      if (e.button === 2) { // Right click
        this.isRightMouseDown = true;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isLeftMouseDown = false;
      }
      if (e.button === 2) {
        this.isRightMouseDown = false;
      }
    });

    // Prevent context menu on right click
    window.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  }

  private handleDoubleTap(code: string) {
    // Map keys to screen-relative world vectors
    // W/Up moves Screen Up -> World (-1, -1)
    if (code === 'KeyW' || code === 'ArrowUp') this.pendingDash = { x: -1, y: -1 };
    
    // S/Down moves Screen Down -> World (1, 1)
    if (code === 'KeyS' || code === 'ArrowDown') this.pendingDash = { x: 1, y: 1 };
    
    // A/Left moves Screen Left -> World (-1, 1)
    if (code === 'KeyA' || code === 'ArrowLeft') this.pendingDash = { x: -1, y: 1 };
    
    // D/Right moves Screen Right -> World (1, -1)
    if (code === 'KeyD' || code === 'ArrowRight') this.pendingDash = { x: 1, y: -1 };
  }

  public getState(): InputState {
    const state: InputState = {
      up: this.keys.has('KeyW') || this.keys.has('ArrowUp'),
      down: this.keys.has('KeyS') || this.keys.has('ArrowDown'),
      left: this.keys.has('KeyA') || this.keys.has('ArrowLeft'),
      right: this.keys.has('KeyD') || this.keys.has('ArrowRight'),
      sprint: this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'),
      interact: this.keys.has('KeyE'),
      fireLeft: this.isLeftMouseDown,
      fireRight: this.isRightMouseDown,
      dashDir: this.pendingDash,
      mouseX: this.mouseX,
      mouseY: this.mouseY
    };

    // Clear one-shot events
    this.pendingDash = null;

    return state;
  }

  public cleanup() {
    // Listeners are on window, generally persist for app life.
  }
}