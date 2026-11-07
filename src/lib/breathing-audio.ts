export const BREATH_PHASE_SECONDS = 7;

/** Quiet, locally synthesized surf; no network request or autoplay. */
export function createBreathingAudio(muted: boolean) {
  const context = new AudioContext();
  const buffer = context.createBuffer(2, context.sampleRate * 8, context.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const samples = buffer.getChannelData(channel);
    let previous = 0;
    for (let i = 0; i < samples.length; i++) {
      previous = (previous + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      samples[i] = previous * 3.5;
    }
    // Crossfade the loop join so there is no click every eight seconds.
    const blend = Math.floor(context.sampleRate * 0.25);
    for (let i = 0; i < blend; i++) {
      const amount = i / (blend - 1);
      const at = samples.length - blend + i;
      samples[at] = samples[at] * (1 - amount) + samples[i] * amount;
    }
  }
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.loopStart = 0.25;
  const highpass = context.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = 100;
  const lowpass = context.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = 650;
  lowpass.Q.value = 0.4;
  const swell = context.createGain();
  swell.gain.value = 0.65;
  const volume = context.createGain();
  volume.gain.value = 0;
  source.connect(highpass).connect(lowpass).connect(swell).connect(volume).connect(context.destination);
  source.start();
  // Called directly from the visitor's click to satisfy audio gesture rules.
  void context.resume().catch(() => undefined);
  volume.gain.setTargetAtTime(muted ? 0 : 0.22, context.currentTime, 0.35);
  let stopped = false;
  return {
    setMuted(value: boolean) {
      if (stopped) return;
      volume.gain.cancelScheduledValues(context.currentTime);
      volume.gain.setTargetAtTime(value ? 0 : 0.22, context.currentTime, 0.2);
    },
    setBreath(inhaling: boolean) {
      if (stopped) return;
      const now = context.currentTime;
      swell.gain.cancelScheduledValues(now);
      swell.gain.setValueAtTime(swell.gain.value, now);
      swell.gain.linearRampToValueAtTime(inhaling ? 1 : 0.5, now + BREATH_PHASE_SECONDS);
      lowpass.frequency.cancelScheduledValues(now);
      lowpass.frequency.setValueAtTime(lowpass.frequency.value, now);
      lowpass.frequency.linearRampToValueAtTime(inhaling ? 850 : 450, now + BREATH_PHASE_SECONDS);
    },
    stop() {
      if (stopped) return;
      stopped = true;
      volume.gain.cancelScheduledValues(context.currentTime);
      volume.gain.setValueAtTime(volume.gain.value, context.currentTime);
      volume.gain.linearRampToValueAtTime(0, context.currentTime + 0.18);
      window.setTimeout(() => { source.stop(); void context.close(); }, 220);
    },
  };
}
