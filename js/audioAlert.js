/**
 * Audio Alert Synthesizer for Smart Desk Monitoring
 * Uses Web Audio API for zero-dependency sound notifications
 */

class AudioAlertSystem {
  constructor() {
    this.audioCtx = null;
    this.isMuted = false;
    this.lastHazardBeep = 0;
  }

  init() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  // High urgency dual-tone frequency beep for spill hazard or critical alert
  playHazardAlarm() {
    if (this.isMuted) return;
    const now = Date.now();
    // Throttle alert sounds to at most once every 1.5 seconds
    if (now - this.lastHazardBeep < 1500) return;
    this.lastHazardBeep = now;

    this.init();
    if (!this.audioCtx) return;

    try {
      const t = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sawtooth';
      // Pitch drop alert
      osc.frequency.setValueAtTime(880, t); // A5
      osc.frequency.exponentialRampToValueAtTime(440, t + 0.25);
      osc.frequency.setValueAtTime(880, t + 0.28);
      osc.frequency.exponentialRampToValueAtTime(440, t + 0.55);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.58);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(t);
      osc.stop(t + 0.6);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  // Soft warning chime for distraction (phone detected)
  playDistractionWarning() {
    if (this.isMuted) return;
    this.init();
    if (!this.audioCtx) return;

    try {
      const t = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, t); // C5
      osc.frequency.setValueAtTime(659.25, t + 0.15); // E5

      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(t);
      osc.stop(t + 0.42);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  // Pleasant notification chime for snapshot / status change
  playChime() {
    if (this.isMuted) return;
    this.init();
    if (!this.audioCtx) return;

    try {
      const t = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, t); // D5
      osc.frequency.exponentialRampToValueAtTime(880, t + 0.2); // A5

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(t);
      osc.stop(t + 0.38);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }
}

// Global singleton
window.audioAlertSystem = new AudioAlertSystem();
