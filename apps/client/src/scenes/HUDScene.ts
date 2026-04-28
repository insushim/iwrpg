import Phaser from 'phaser';
import { QuizModal } from '../ui/QuizModal.js';
import { HUDPanels } from '../ui/HUDPanels.js';
import { InventoryModal } from '../ui/InventoryModal.js';
import { GachaModal } from '../ui/GachaModal.js';
import { ToastManager } from '../ui/ToastManager.js';
import { NPCDialogModal } from '../ui/NPCDialogModal.js';
import { WordbookModal } from '../ui/WordbookModal.js';
import { MinimapModal } from '../ui/MinimapModal.js';
import { AudioManager, ensureGlobalUnlockHook } from '../systems/AudioManager.js';
import { NetClient } from '../network/ColyseusClient.js';

export class HUDScene extends Phaser.Scene {
  private bgmTickHandle?: Phaser.Time.TimerEvent;

  constructor() { super({ key: 'HUDScene', active: false }); }

  create() {
    const worldScene = this.scene.get('WorldScene');

    HUDPanels.mount();
    ToastManager.mount();
    QuizModal.init(worldScene);
    InventoryModal.init(worldScene);
    GachaModal.init(worldScene);
    NPCDialogModal.init(worldScene);
    WordbookModal.init(worldScene);
    MinimapModal.init(worldScene);

    ensureGlobalUnlockHook();

    this.time.addEvent({ delay: 200, loop: true, callback: () => HUDPanels.refresh() });

    // BGM: switch track when current map changes
    this.bgmTickHandle = this.time.addEvent({
      delay: 1500, loop: true,
      callback: () => this.maybeUpdateBgm(),
    });

    // Toggle modals only when no input field is focused (so chat typing works)
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (this.isTypingInInput()) return;
      const key = e.key.toLowerCase();
      switch (key) {
        case 'i': InventoryModal.toggle(); e.preventDefault(); break;
        case 'g': GachaModal.toggle(); e.preventDefault(); break;
        case 'w': WordbookModal.toggle(); e.preventDefault(); break;
        case 'm': MinimapModal.toggle(); e.preventDefault(); break;
        case 'b': {
          const muted = AudioManager.toggleMute();
          this.events.emit('hud:toast', { text: muted ? '🔇 음소거' : '🔊 음소거 해제', kind: 'info' });
          e.preventDefault();
          break;
        }
        case 'escape':
          InventoryModal.hide();
          GachaModal.hide();
          NPCDialogModal.hide();
          WordbookModal.hide();
          MinimapModal.hide();
          break;
      }
    });

    // Quickbar buttons (HUDPanels rendered them, we wire clicks here)
    document.getElementById('hud-quickbar')?.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('button[data-modal]') as HTMLElement | null;
      if (!btn) return;
      AudioManager.playSfx('click');
      switch (btn.dataset.modal) {
        case 'inventory': InventoryModal.toggle(); break;
        case 'gacha': GachaModal.toggle(); break;
        case 'map': MinimapModal.toggle(); break;
        case 'wordbook': WordbookModal.toggle(); break;
        case 'character': this.events.emit('hud:toast', { text: '캐릭터 창은 인벤토리에서 장비 탭으로 확인하세요.', kind: 'info' }); break;
      }
    });
  }

  private isTypingInInput(): boolean {
    const ae = document.activeElement as HTMLElement | null;
    if (!ae) return false;
    const tag = ae.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || ae.isContentEditable;
  }

  private async maybeUpdateBgm(): Promise<void> {
    const state: any = NetClient.inst.worldRoom?.state;
    if (!state || !state.mapId) return;
    const target = AudioManager.contextToTrack(state.mapId, !!state.isSafeZone);
    if (target !== AudioManager.currentTrackId()) {
      try { await AudioManager.playBgm(target); } catch {}
    }
  }
}
