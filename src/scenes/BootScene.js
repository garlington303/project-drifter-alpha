import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Create loading bar
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

    const loadingText = this.make.text({
      x: width / 2,
      y: height / 2 - 50,
      text: 'Loading...',
      style: {
        font: '20px monospace',
        fill: '#ffffff'
      }
    });
    loadingText.setOrigin(0.5, 0.5);

    this.load.on('progress', (value) => {
      progressBar.clear();
      progressBar.fillStyle(0x00ff00, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });

    // Generate placeholder textures
    this.generatePlaceholderAssets();
  }

  generatePlaceholderAssets() {
    // Player texture (red square with direction indicator)
    const playerGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    playerGraphics.fillStyle(0xef4444, 1);
    playerGraphics.fillRect(0, 0, 32, 32);
    playerGraphics.fillStyle(0xffffff, 0.6);
    playerGraphics.fillRect(24, 8, 6, 16); // Direction indicator
    playerGraphics.generateTexture('player', 32, 32);
    playerGraphics.destroy();

    // Ground tile texture
    const groundGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    groundGraphics.fillStyle(0x10b981, 1);
    groundGraphics.fillRect(0, 0, 64, 64);
    groundGraphics.lineStyle(1, 0x059669, 0.3);
    groundGraphics.strokeRect(0, 0, 64, 64);
    groundGraphics.generateTexture('ground', 64, 64);
    groundGraphics.destroy();

    // Projectile texture
    const projectileGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    projectileGraphics.fillStyle(0xfbbf24, 1);
    projectileGraphics.fillCircle(4, 4, 4);
    projectileGraphics.generateTexture('projectile', 8, 8);
    projectileGraphics.destroy();
  }

  create() {
    // Transition to GameScene
    this.scene.start('GameScene');
  }
}
