// Procedural audio for Runeword Chronicle.
// BGM: Tone.js synth-only — no .mp3/.ogg files required, runs offline.
// SFX: short Web Audio bursts (also synthesised) so we never hit a network for sound.
// All public methods are no-throw: Audio* APIs are flaky on iOS Safari + Chrome autoplay policy.

import * as Tone from 'tone';

type BgmTrack = 'town' | 'hunt' | 'dungeon' | 'boss' | null;

interface SfxParams {
  freq: number;
  freqEnd?: number;
  durationMs: number;
  type?: OscillatorType;
  noise?: boolean;
  gain?: number;
  filterFreq?: number;
}

const SFX_RECIPES: Record<string, SfxParams> = {
  click:        { freq: 880, durationMs: 60,  type: 'square',   gain: 0.07 },
  attack:       { freq: 220, freqEnd: 110, durationMs: 130, type: 'sawtooth', gain: 0.10 },
  hit:          { freq: 180, freqEnd: 90,  durationMs: 150, type: 'square',   gain: 0.12, noise: true },
  monster_die:  { freq: 140, freqEnd: 60,  durationMs: 350, type: 'triangle', gain: 0.14, noise: true },
  level_up:     { freq: 440, freqEnd: 880, durationMs: 480, type: 'sine',     gain: 0.16 },
  correct:      { freq: 660, freqEnd: 990, durationMs: 220, type: 'sine',     gain: 0.13 },
  wrong:        { freq: 220, freqEnd: 130, durationMs: 280, type: 'sawtooth', gain: 0.10 },
  pickup:       { freq: 1320, durationMs: 100, type: 'triangle', gain: 0.10 },
  gacha_open:   { freq: 520, freqEnd: 880, durationMs: 600, type: 'sine',     gain: 0.14 },
  gacha_rare:   { freq: 880, freqEnd: 1320,durationMs: 800, type: 'sine',     gain: 0.16 },
  enchant_ok:   { freq: 880, freqEnd: 1760,durationMs: 600, type: 'sine',     gain: 0.16 },
  enchant_fail: { freq: 220, freqEnd: 60,  durationMs: 700, type: 'sawtooth', gain: 0.16, noise: true },
  ui_open:      { freq: 660, durationMs: 80,  type: 'triangle', gain: 0.06 },
  ui_close:     { freq: 440, durationMs: 80,  type: 'triangle', gain: 0.05 },
};

interface BgmRecipe {
  bpm: number;
  scale: number[];      // semitone offsets from root
  rootHz: number;
  pads?: boolean;
  pattern: number[];    // index into scale array per 8th-note step
  bassPattern?: number[];
  filterCutoff?: number;
  reverb?: boolean;
}

const BGM_RECIPES: Record<Exclude<BgmTrack, null>, BgmRecipe> = {
  // Aurora-themed town: warm major progression, slow 70 bpm
  town: {
    bpm: 70, rootHz: 220 /* A3 */,
    scale: [0, 2, 4, 5, 7, 9, 11], // major
    pattern: [0, 2, 4, 2, 5, 4, 2, 0,  4, 2, 0, 2, 4, 5, 4, 2],
    bassPattern: [0, 0, -7, -7, -5, -5, -7, -7],
    pads: true, reverb: true, filterCutoff: 2200,
  },
  // Hunting field: minor, faster 96 bpm, more rhythm
  hunt: {
    bpm: 96, rootHz: 220,
    scale: [0, 2, 3, 5, 7, 8, 10], // minor
    pattern: [0, 3, 5, 3, 0, 3, 5, 7,  5, 3, 0, 3, 5, 7, 5, 3],
    bassPattern: [0, 0, 0, 0, -7, -7, -5, -5],
    pads: false, reverb: true, filterCutoff: 1800,
  },
  // Dungeon: phrygian, dark 84 bpm
  dungeon: {
    bpm: 84, rootHz: 175 /* F3 */,
    scale: [0, 1, 3, 5, 7, 8, 10], // phrygian
    pattern: [0, 0, 3, 0, 5, 3, 0, 1,  3, 0, 5, 3, 1, 0, 3, 0],
    bassPattern: [0, 0, -12, -12, -7, -7, -10, -10],
    pads: true, reverb: true, filterCutoff: 1200,
  },
  // Boss: locrian-ish, dramatic 110 bpm
  boss: {
    bpm: 110, rootHz: 165 /* E3 */,
    scale: [0, 1, 3, 5, 6, 8, 10], // locrian
    pattern: [0, 3, 5, 8, 5, 3, 0, 1,  3, 5, 8, 10, 8, 5, 3, 0],
    bassPattern: [0, 0, -12, -12, -7, -7, -8, -8],
    pads: false, reverb: true, filterCutoff: 1500,
  },
};

class AudioManagerImpl {
  private started = false;
  private currentTrack: BgmTrack = null;
  private masterVol = 0.55;
  private muted = false;

  // Tone.js musical pieces
  private leadSynth?: Tone.PolySynth;
  private bassSynth?: Tone.MonoSynth;
  private padSynth?: Tone.PolySynth;
  private leadSeq?: Tone.Sequence;
  private bassSeq?: Tone.Sequence;
  private padSeq?: Tone.Sequence;
  private masterGain?: Tone.Volume;
  private reverb?: Tone.Reverb;

  // Web Audio for low-latency SFX (not via Tone scheduler)
  private sfxCtx?: AudioContext;
  private sfxGain?: GainNode;

  /** Must be called from a user gesture (click/keydown). Idempotent. */
  async unlock(): Promise<void> {
    if (this.started) return;
    try {
      await Tone.start();
      this.sfxCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.sfxGain = this.sfxCtx.createGain();
      this.sfxGain.gain.value = 0.7;
      this.sfxGain.connect(this.sfxCtx.destination);

      // Master chain
      this.reverb = new Tone.Reverb({ decay: 4.5, wet: 0.25 }).toDestination();
      this.masterGain = new Tone.Volume(this.gainToDb(this.masterVol)).connect(this.reverb);

      // Lead synth (melody)
      this.leadSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.04, decay: 0.2, sustain: 0.3, release: 0.6 },
      });
      this.leadSynth.volume.value = -8;
      this.leadSynth.connect(this.masterGain);

      // Bass synth
      this.bassSynth = new Tone.MonoSynth({
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.6, release: 0.3 },
        filterEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.4, baseFrequency: 200, octaves: 2 },
      });
      this.bassSynth.volume.value = -10;
      this.bassSynth.connect(this.masterGain);

      // Pad synth (long sustained)
      this.padSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sine' },
        envelope: { attack: 1.2, decay: 0.5, sustain: 0.6, release: 2.0 },
      });
      this.padSynth.volume.value = -16;
      this.padSynth.connect(this.masterGain);

      this.started = true;
      console.log('[AudioManager] unlocked');
    } catch (e) {
      console.warn('[AudioManager] unlock failed (continuing silent):', e);
    }
  }

  isMuted(): boolean { return this.muted; }
  isPlaying(): boolean { return this.currentTrack !== null && !this.muted; }
  currentTrackId(): BgmTrack { return this.currentTrack; }

  setMasterVolume(v01: number): void {
    this.masterVol = Math.max(0, Math.min(1, v01));
    if (this.masterGain) this.masterGain.volume.value = this.muted ? -Infinity : this.gainToDb(this.masterVol);
    if (this.sfxGain && this.sfxCtx) this.sfxGain.gain.setTargetAtTime(this.muted ? 0 : this.masterVol * 0.7, this.sfxCtx.currentTime, 0.05);
    try { localStorage.setItem('rwc-audio-vol', String(this.masterVol)); } catch {}
  }
  getMasterVolume(): number { return this.masterVol; }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.masterGain) this.masterGain.volume.value = this.muted ? -Infinity : this.gainToDb(this.masterVol);
    if (this.sfxGain && this.sfxCtx) this.sfxGain.gain.setTargetAtTime(this.muted ? 0 : this.masterVol * 0.7, this.sfxCtx.currentTime, 0.05);
    try { localStorage.setItem('rwc-audio-muted', String(this.muted)); } catch {}
    return this.muted;
  }

  /** Map a gameplay context to a track. Towns → town BGM, dungeons/boss → dungeon. */
  contextToTrack(mapId: string, isSafeZone: boolean): Exclude<BgmTrack, null> {
    if (mapId.includes('boss') || mapId.includes('rift') || mapId.includes('drake')) return 'boss';
    if (mapId.includes('cave') || mapId.includes('mine') || mapId.includes('temple') || mapId.includes('citadel') || mapId.includes('caverns')) return 'dungeon';
    if (isSafeZone || mapId.includes('town') || mapId.includes('haven')) return 'town';
    return 'hunt';
  }

  async playBgm(track: Exclude<BgmTrack, null>): Promise<void> {
    if (!this.started) return;
    if (this.currentTrack === track) return;
    this.stopBgm();

    const recipe = BGM_RECIPES[track];
    Tone.Transport.bpm.value = recipe.bpm;

    const noteAt = (semitone: number): string => {
      const hz = recipe.rootHz * Math.pow(2, semitone / 12);
      return Tone.Frequency(hz, 'hz').toNote();
    };

    // Lead — 16 eighth-notes, looped
    const leadNotes = recipe.pattern.map(scaleIdx => {
      if (scaleIdx < 0) return null;
      const semi = recipe.scale[scaleIdx % recipe.scale.length] + Math.floor(scaleIdx / recipe.scale.length) * 12;
      return noteAt(semi + 12); // 1 octave up
    });
    this.leadSeq = new Tone.Sequence((time, note) => {
      if (note && this.leadSynth) this.leadSynth.triggerAttackRelease(note, '8n', time, 0.6);
    }, leadNotes, '8n').start(0);

    // Bass — 8 quarter-notes
    if (recipe.bassPattern && this.bassSynth) {
      const bassNotes = recipe.bassPattern.map(s => noteAt(s));
      this.bassSeq = new Tone.Sequence((time, note) => {
        if (note && this.bassSynth) this.bassSynth.triggerAttackRelease(note, '4n', time, 0.5);
      }, bassNotes, '4n').start(0);
    }

    // Pads — chord progression every 2 bars
    if (recipe.pads && this.padSynth) {
      const padChords = [
        [recipe.scale[0], recipe.scale[2], recipe.scale[4]],
        [recipe.scale[3], recipe.scale[5], recipe.scale[0] + 12],
        [recipe.scale[4], recipe.scale[6], recipe.scale[1] + 12],
        [recipe.scale[0], recipe.scale[2], recipe.scale[4]],
      ].map(chord => chord.map(s => noteAt(s)));
      this.padSeq = new Tone.Sequence((time, chord: any) => {
        if (chord && this.padSynth) this.padSynth.triggerAttackRelease(chord, '1m', time, 0.4);
      }, padChords as any, '1m').start(0);
    }

    Tone.Transport.start('+0.05');
    this.currentTrack = track;
    console.log('[AudioManager] BGM →', track);
  }

  stopBgm(): void {
    if (!this.started) return;
    try {
      this.leadSeq?.stop(0); this.leadSeq?.dispose(); this.leadSeq = undefined;
      this.bassSeq?.stop(0); this.bassSeq?.dispose(); this.bassSeq = undefined;
      this.padSeq?.stop(0); this.padSeq?.dispose(); this.padSeq = undefined;
      Tone.Transport.stop();
      Tone.Transport.cancel();
    } catch (e) {
      console.warn('[AudioManager] stopBgm:', e);
    }
    this.currentTrack = null;
  }

  /** Fire-and-forget short SFX. Safe to call before unlock (silent). */
  playSfx(name: keyof typeof SFX_RECIPES | string): void {
    if (this.muted || !this.sfxCtx || !this.sfxGain) return;
    const recipe = SFX_RECIPES[name];
    if (!recipe) return;
    const ctx = this.sfxCtx;
    const now = ctx.currentTime;
    const dur = recipe.durationMs / 1000;
    const gain = ctx.createGain();
    const peak = (recipe.gain ?? 0.1);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    gain.connect(this.sfxGain);

    // Tone oscillator
    const osc = ctx.createOscillator();
    osc.type = recipe.type ?? 'sine';
    osc.frequency.setValueAtTime(recipe.freq, now);
    if (recipe.freqEnd !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, recipe.freqEnd), now + dur);
    }
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + dur + 0.02);

    // Optional noise layer for hits/deaths
    if (recipe.noise) {
      const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * dur));
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseGain = ctx.createGain();
      noiseGain.gain.value = peak * 0.4;
      noise.connect(noiseGain);
      noiseGain.connect(this.sfxGain);
      noise.start(now);
      noise.stop(now + dur);
    }
  }

  /** Convert linear 0..1 → dB. 0 → -Infinity, 1 → 0 dB. */
  private gainToDb(v: number): number {
    if (v <= 0.0001) return -60;
    return 20 * Math.log10(v);
  }

  /** Restore persisted user prefs. Call after unlock. */
  loadPrefs(): void {
    try {
      const v = parseFloat(localStorage.getItem('rwc-audio-vol') ?? '');
      if (!Number.isNaN(v) && v >= 0 && v <= 1) this.setMasterVolume(v);
      const m = localStorage.getItem('rwc-audio-muted');
      if (m === 'true' && !this.muted) this.toggleMute();
    } catch {}
  }
}

export const AudioManager = new AudioManagerImpl();

// One global listener: first user gesture anywhere unlocks audio.
let unlockBound = false;
export function ensureGlobalUnlockHook() {
  if (unlockBound) return;
  unlockBound = true;
  const handler = async () => {
    await AudioManager.unlock();
    AudioManager.loadPrefs();
    document.removeEventListener('pointerdown', handler);
    document.removeEventListener('keydown', handler);
  };
  document.addEventListener('pointerdown', handler, { once: false });
  document.addEventListener('keydown', handler, { once: false });
}
