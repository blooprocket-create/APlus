export type SoundCue = 'attack' | 'hit' | 'critical' | 'dash' | 'heal' | 'hurt' | 'defeat' | 'victory' | 'level';

/** Small synthesized effects; no downloads, audio assets, or autoplay required. */
export class AudioSystem {
  private context: AudioContext | null = null;
  private lastHit = 0;
  private cinematicSources: AudioScheduledSourceNode[] = [];
  private scoreBuffer: AudioBuffer | null = null;
  private scoreLoading: Promise<void> | null = null;
  private cinematicEpoch = 0;
  public muted = false;

  constructor() {
    try { this.muted = localStorage.getItem('astral-audio-muted') === 'true'; } catch { /* optional preference */ }
    const unlock = () => {
      try {
        this.context ??= new AudioContext();
        void this.context.resume().catch(() => {});
        void this.loadScore();
      } catch { /* Audio is optional on unsupported devices. */ }
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
  }

  public toggle(): boolean {
    this.muted = !this.muted;
    try { localStorage.setItem('astral-audio-muted', String(this.muted)); } catch { /* optional preference */ }
    return this.muted;
  }

  public stopCinematic(): void {
    this.cinematicEpoch += 1;
    for (const source of this.cinematicSources) { try { source.stop(); } catch { /* Already ended. */ } }
    this.cinematicSources = [];
  }

  private loadScore(): Promise<void> {
    if (!this.scoreLoading && this.context) {
      const context = this.context;
      this.scoreLoading = fetch('/audio/guardian-execution.mp3')
        .then(response => { if (!response.ok) throw new Error('Score unavailable'); return response.arrayBuffer(); })
        .then(bytes => context.decodeAudioData(bytes))
        .then(buffer => { this.scoreBuffer = buffer; })
        .catch(() => { /* The timed synthesized cues remain available offline or after a failed download. */ });
    }
    return this.scoreLoading ?? Promise.resolve();
  }

  public startCinematic(): void {
    this.stopCinematic();
    const context = this.context;
    if (this.muted || !context || context.state !== 'running') return;
    const epoch = this.cinematicEpoch;
    const startedAt = context.currentTime;
    void this.loadScore().then(() => {
      if (!this.scoreBuffer || epoch !== this.cinematicEpoch || this.muted) return;
      const elapsed = context.currentTime - startedAt;
      if (elapsed >= 12.4) return;
      const source = context.createBufferSource(); const gain = context.createGain();
      source.buffer = this.scoreBuffer; source.playbackRate.value = this.scoreBuffer.duration / 12.4;
      gain.gain.value = 0.55;
      source.connect(gain).connect(context.destination);
      source.start(0, elapsed * source.playbackRate.value);
      this.cinematicSources.push(source);
      source.onended = () => { source.disconnect(); gain.disconnect(); this.cinematicSources = this.cinematicSources.filter(item => item !== source); };
    });
  }

  public cinematic(cue: 'charge' | 'strike' | 'requiem'): void {
    const ctx = this.context;
    if (this.muted || !ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const duration = cue === 'charge' ? 2.6 : cue === 'strike' ? 1.8 : 3.6;
    const frequencies = cue === 'charge' ? [55, 82.41, 110, 164.81] : cue === 'strike' ? [38, 55, 220, 880] : [146.83, 220, 293.66, 349.23];
    frequencies.forEach((frequency, i) => {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = cue === 'strike' && i < 2 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(frequency, now);
      osc.frequency.exponentialRampToValueAtTime(cue === 'charge' ? frequency * 2 : cue === 'strike' ? frequency * 0.3 : frequency, now + duration);
      gain.gain.setValueAtTime(cue === 'strike' ? 0.12 / (i + 1) : 0.001, now);
      gain.gain.exponentialRampToValueAtTime(cue === 'charge' ? 0.045 : 0.035, now + (cue === 'strike' ? 0.02 : 0.8));
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain).connect(ctx.destination); osc.start(now); osc.stop(now + duration);
      this.cinematicSources.push(osc);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); this.cinematicSources = this.cinematicSources.filter(source => source !== osc); };
    });
    if (cue === 'strike') {
      const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 3);
      const source = ctx.createBufferSource(); source.buffer = buffer;
      const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 1300;
      const gain = ctx.createGain(); gain.gain.value = 0.22;
      source.connect(filter).connect(gain).connect(ctx.destination); source.start();
      this.cinematicSources.push(source);
      source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); this.cinematicSources = this.cinematicSources.filter(item => item !== source); };
    }
  }

  public play(cue: SoundCue): void {
    const ctx = this.context;
    if (this.muted || !ctx || ctx.state !== 'running') return;
    if (cue === 'hit' || cue === 'critical') {
      if (ctx.currentTime - this.lastHit < 0.065) return;
      this.lastHit = ctx.currentTime;
    }
    const notes: Record<SoundCue, number[]> = {
      attack: [210], hit: [130], critical: [440, 660], dash: [600], heal: [392, 494, 587],
      hurt: [105], defeat: [220, 174, 130], victory: [330, 440, 554, 660], level: [392, 523, 659],
    };
    notes[cue].forEach((frequency, i) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + i * 0.09;
      const duration = cue === 'dash' ? 0.16 : 0.12;
      oscillator.type = cue === 'hurt' || cue === 'hit' ? 'triangle' : 'sine';
      oscillator.frequency.setValueAtTime(frequency, start);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, frequency * (cue === 'dash' ? 0.2 : 0.7)), start + duration);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.055, start + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.02);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    });
  }
}
