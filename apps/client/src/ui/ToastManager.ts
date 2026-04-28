import Phaser from 'phaser';

export class ToastManager {
  static mount() {
    const game = (window as any).__game;
    const worldScene = game.scene.getScene('WorldScene');
    worldScene.events.on('hud:toast', (msg: { text: string; kind?: string }) => {
      this.show(msg.text, msg.kind ?? 'info');
    });
  }

  static show(text: string, kind: string = 'info') {
    const div = document.createElement('div');
    div.className = `toast ${kind}`;
    div.textContent = text;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
  }
}
