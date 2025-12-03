import Phaser from 'phaser';
import Player from '../entities/Player.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    // Set world bounds (large playable area)
    const worldSize = 4000;
    this.physics.world.setBounds(0, 0, worldSize, worldSize);

    // Create tiled background
    this.createBackground(worldSize);

    // Create player at center
    this.player = new Player(this, worldSize / 2, worldSize / 2);

    // Camera setup with smooth follow
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setBounds(0, 0, worldSize, worldSize);
    this.cameras.main.setZoom(1.0);

    // Enable right-click for secondary fire
    this.input.mouse.disableContextMenu();

    // Debug display
    this.createDebugUI();

    // Space bar for dash
    this.input.keyboard.on('keydown-SPACE', () => {
      this.player.dash();
    });
  }

  createBackground(worldSize) {
    // Create a tiled ground using the ground texture
    const tileSize = 64;
    const tilesX = Math.ceil(worldSize / tileSize);
    const tilesY = Math.ceil(worldSize / tileSize);

    for (let y = 0; y < tilesY; y++) {
      for (let x = 0; x < tilesX; x++) {
        const tile = this.add.image(x * tileSize, y * tileSize, 'ground');
        tile.setOrigin(0, 0);
        tile.setAlpha(0.3);
      }
    }
  }

  createDebugUI() {
    // Position text (fixed to camera)
    this.posText = this.add.text(16, 16, '', {
      font: '14px monospace',
      fill: '#ffffff',
      backgroundColor: '#000000aa',
      padding: { x: 8, y: 8 }
    });
    this.posText.setScrollFactor(0);
    this.posText.setDepth(1000);

    // Stats text
    this.statsText = this.add.text(16, 60, '', {
      font: '14px monospace',
      fill: '#ffffff',
      backgroundColor: '#000000aa',
      padding: { x: 8, y: 8 }
    });
    this.statsText.setScrollFactor(0);
    this.statsText.setDepth(1000);

    // Instructions
    this.instructions = this.add.text(16, 140,
      'WASD - Move\nSHIFT - Sprint\nSPACE - Dash\nMouse - Aim\nLeft Click - Fire\nRight Click - Alt Fire',
      {
        font: '14px monospace',
        fill: '#10b981',
        backgroundColor: '#000000aa',
        padding: { x: 8, y: 8 }
      }
    );
    this.instructions.setScrollFactor(0);
    this.instructions.setDepth(1000);
  }

  update(time, delta) {
    // Update player
    if (this.player) {
      this.player.update(time, delta);

      // Update debug UI
      this.posText.setText([
        `Position: (${Math.round(this.player.x)}, ${Math.round(this.player.y)})`,
        `Velocity: (${Math.round(this.player.body.velocity.x)}, ${Math.round(this.player.body.velocity.y)})`,
        `Speed: ${Math.round(this.player.body.speed)}`
      ]);

      this.statsText.setText([
        `Health: ${Math.round(this.player.health)}/${this.player.maxHealth}`,
        `Stamina: ${Math.round(this.player.stamina)}/${this.player.maxStamina}`,
        `Mana: ${Math.round(this.player.mana)}/${this.player.maxMana}`,
        `Dash CD: ${Math.max(0, Math.round(this.player.dashCooldownTimer))}ms`
      ]);
    }
  }
}
