import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { LoginScene } from './scenes/LoginScene.js';
import { CharCreateScene } from './scenes/CharCreateScene.js';
import { WorldScene } from './scenes/WorldScene.js';
import { HUDScene } from './scenes/HUDScene.js';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-root',
  backgroundColor: '#0B0E14',
  pixelArt: true,
  antialias: false,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720,
    min: { width: 960, height: 540 },
    max: { width: 1920, height: 1080 },
  },
  physics: {
    default: 'arcade',
    arcade: { debug: false, gravity: { x: 0, y: 0 } },
  },
  scene: [BootScene, LoginScene, CharCreateScene, WorldScene, HUDScene],
  fps: { target: 60, smoothStep: true },
  render: { pixelArt: true },
};

const game = new Phaser.Game(config);
(window as any).__game = game;

// Hide loading screen once Phaser boots
window.addEventListener('load', () => {
  setTimeout(() => {
    document.getElementById('loading-screen')?.classList.add('hidden');
  }, 800);
});

// Expose debug helpers for Visual QA
(window as any).debugTeleport = (mapId: string, x: number, y: number) => {
  game.events.emit('debug:teleport', { mapId, x, y });
};
(window as any).debugSetGameReady = () => { (window as any).gameReady = true; };
