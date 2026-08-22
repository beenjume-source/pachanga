import { useRef, useEffect, useCallback } from 'react';

export function useWebAudioSynth() {
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  useEffect(() => {
    const initAudio = () => {
      getAudioContext();
    };

    window.addEventListener('touchstart', initAudio, { once: true });
    window.addEventListener('click', initAudio, { once: true });

    return () => {
      window.removeEventListener('touchstart', initAudio);
      window.removeEventListener('click', initAudio);
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    };
  }, [getAudioContext]);

  // Output pipeline with dynamic volume & smooth band-pass / lowpass filter when accuracy is low
  const createOutputPipeline = (ctx: AudioContext, volumeScale: number) => {
    const masterGain = ctx.createGain();
    const finalVolume = Math.max(0.08, Math.min(1.0, volumeScale));

    if (volumeScale < 0.5) {
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 500; // Warm soft background sound
      masterGain.gain.setValueAtTime(finalVolume, ctx.currentTime);
      masterGain.connect(lowpass);
      lowpass.connect(ctx.destination);
      return masterGain;
    } else {
      masterGain.gain.setValueAtTime(finalVolume, ctx.currentTime);
      masterGain.connect(ctx.destination);
      return masterGain;
    }
  };

  // 1. ACOUSTIC BAND DRUMS (Acoustic Punch & Real Resonance)
  const playKick = (volumeScale = 1.0) => {
    const ctx = getAudioContext();
    if (!ctx) return;
    const dest = createOutputPipeline(ctx, volumeScale);
    const now = ctx.currentTime;

    // Beater Click (Attack punch transient)
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(1200, now);
    clickOsc.frequency.exponentialRampToValueAtTime(80, now + 0.02);
    clickGain.gain.setValueAtTime(0.8, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
    clickOsc.connect(clickGain);
    clickGain.connect(dest);
    clickOsc.start(now);
    clickOsc.stop(now + 0.025);

    // Deep Acoustic Body Sweep: 150Hz -> 42Hz with natural resonance over 0.38s
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.09);

    gain.gain.setValueAtTime(1.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(now);
    osc.stop(now + 0.38);
  };

  const playSnare = (volumeScale = 1.0) => {
    const ctx = getAudioContext();
    if (!ctx) return;
    const dest = createOutputPipeline(ctx, volumeScale);
    const now = ctx.currentTime;

    // 1. Snare Wire Rattle (White noise burst + HighPass 1600Hz)
    const noise = ctx.createBufferSource();
    const noiseBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.24), ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseBuffer.length; i++) output[i] = Math.random() * 2 - 1;
    noise.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.setValueAtTime(1600, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(1.2, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(dest);
    noise.start(now);

    // 2. Tuned Wooden Shell Fundamental Tone (185Hz pitch)
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(185, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.14);

    oscGain.gain.setValueAtTime(1.0, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.20);

    osc.connect(oscGain);
    oscGain.connect(dest);

    osc.start(now);
    osc.stop(now + 0.24);
  };

  const playHiHat = (volumeScale = 1.0) => {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    const dest = createOutputPipeline(ctx, volumeScale);
    const now = ctx.currentTime;
    const duration = 0.15;

    // Metallic Cymbal Sizzle
    const noise = ctx.createBufferSource();
    const noiseBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseBuffer.length; i++) output[i] = Math.random() * 2 - 1;
    noise.buffer = noiseBuffer;

    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.setValueAtTime(8000, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(1.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(highpass);
    highpass.connect(gain);
    gain.connect(dest);

    noise.start(now);

    // Square wave harmonics for bronze metallic shimmer
    [2, 3.2, 4.3].forEach((ratio) => {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(50 * ratio, now);
      const oscGain = ctx.createGain();
      oscGain.gain.setValueAtTime(0.12, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(highpass);
      osc.start(now);
      osc.stop(now + duration);
    });
  };

  const playTom = (pitch: 'high' | 'mid' | 'floor' = 'mid', volumeScale = 1.0) => {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    const dest = createOutputPipeline(ctx, volumeScale);
    const now = ctx.currentTime;

    const startFreq = pitch === 'high' ? 250 : pitch === 'mid' ? 210 : 145;
    const endFreq = pitch === 'high' ? 110 : pitch === 'mid' ? 85 : 48;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';

    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.1);

    gain.gain.setValueAtTime(1.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(now);
    osc.stop(now + 0.38);
  };

  const playCrash = (volumeScale = 1.0) => {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    const dest = createOutputPipeline(ctx, volumeScale);
    const now = ctx.currentTime;

    const duration = 1.5;
    const noise = ctx.createBufferSource();
    const noiseBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseBuffer.length; i++) output[i] = Math.random() * 2 - 1;
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7500, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(1.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    noise.start(now);
  };

  // 2. GUITAR / BASS
  const playGuitarStrum = (noteFreq = 220, isBass = false, volumeScale = 1.0) => {
    const ctx = getAudioContext();
    if (!ctx) return;
    const dest = createOutputPipeline(ctx, volumeScale);

    const osc = ctx.createOscillator();
    osc.type = isBass ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(noteFreq, ctx.currentTime);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isBass ? 1200 : 3500, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(isBass ? 200 : 400, ctx.currentTime + 0.6);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(1.0, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + (isBass ? 0.7 : 0.6));

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.7);
  };

  // 3. PIANO / KEYBOARD
  const playPianoNote = (freq: number, volumeScale = 1.0) => {
    const ctx = getAudioContext();
    if (!ctx) return;
    const dest = createOutputPipeline(ctx, volumeScale);

    const now = ctx.currentTime;
    const harmonics = [1, 2, 3, 4];
    const amplitudes = [0.8, 0.4, 0.2, 0.1];

    harmonics.forEach((h, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * h, now);

      gain.gain.setValueAtTime(amplitudes[idx], now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8 / h);

      osc.connect(gain);
      gain.connect(dest);

      osc.start(now);
      osc.stop(now + 0.8);
    });
  };

  // 4. TROMPETA DE BRONCE
  const playTrumpet = (freq = 440, volumeScale = 1.0) => {
    const ctx = getAudioContext();
    if (!ctx) return;
    const dest = createOutputPipeline(ctx, volumeScale);

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, now);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(3200, now + 0.08);
    filter.frequency.exponentialRampToValueAtTime(1200, now + 0.5);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.9, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(now);
    osc.stop(now + 0.6);
  };

  // 5. ACORDEÓN DE FIESTA
  const playAccordion = (freq = 329.63, volumeScale = 1.0) => {
    const ctx = getAudioContext();
    if (!ctx) return;
    const dest = createOutputPipeline(ctx, volumeScale);

    const now = ctx.currentTime;

    [freq, freq * 1.008].forEach((f) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, now);

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1800, now);
      filter.Q.value = 1.2;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.7);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);

      osc.start(now);
      osc.stop(now + 0.7);
    });
  };

  // 6. PARTY SFX PAD EFFECTS
  const playMariachiYell = () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(350, now);
    osc.frequency.exponentialRampToValueAtTime(750, now + 0.25);
    osc.frequency.exponentialRampToValueAtTime(500, now + 0.6);

    gain.gain.setValueAtTime(0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.6);
  };

  const playAirhorn = () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    [466.16, 622.25].forEach((f) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, now);

      gain.gain.setValueAtTime(0.9, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    });
  };

  const playApplause = () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const noise = ctx.createBufferSource();
    const duration = 1.5;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < buffer.length; i++) data[i] = Math.random() * 2 - 1;
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1400;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
  };

  const playDJScratch = () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(1400, now + 0.1);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.25);

    gain.gain.setValueAtTime(0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  };

  // 7. TIMBAL LATINO
  const playTimbalMacho = (volumeScale = 1.0) => {
    const ctx = getAudioContext();
    if (!ctx) return;
    const dest = createOutputPipeline(ctx, volumeScale);
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.2);

    gain.gain.setValueAtTime(1.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.Q.value = 3.0;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(now);
    osc.stop(now + 0.25);
  };

  const playTimbalHembra = (volumeScale = 1.0) => {
    const ctx = getAudioContext();
    if (!ctx) return;
    const dest = createOutputPipeline(ctx, volumeScale);
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.28);

    gain.gain.setValueAtTime(1.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(650, now);
    filter.Q.value = 2.5;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(now);
    osc.stop(now + 0.3);
  };

  const playCowbell = (volumeScale = 1.0) => {
    const ctx = getAudioContext();
    if (!ctx) return;
    const dest = createOutputPipeline(ctx, volumeScale);
    const now = ctx.currentTime;

    [540, 800].forEach((f) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(f, now);

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, now);
      filter.Q.value = 4.0;

      gain.gain.setValueAtTime(0.7, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);

      osc.start(now);
      osc.stop(now + 0.22);
    });
  };

  const playSplash = (volumeScale = 1.0) => {
    const ctx = getAudioContext();
    if (!ctx) return;
    const dest = createOutputPipeline(ctx, volumeScale);
    const now = ctx.currentTime;
    const duration = 0.45;

    const noise = ctx.createBufferSource();
    const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < buffer.length; i++) data[i] = Math.random() * 2 - 1;
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(6000, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(1.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    noise.start(now);
  };

  return {
    playKick,
    playSnare,
    playHiHat,
    playTom,
    playCrash,
    playGuitarStrum,
    playPianoNote,
    playTrumpet,
    playAccordion,
    playMariachiYell,
    playAirhorn,
    playApplause,
    playDJScratch,
    playTimbalMacho,
    playTimbalHembra,
    playCowbell,
    playSplash,
  };
}
