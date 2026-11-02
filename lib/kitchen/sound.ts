/**
 * A short synthesized chime. Browsers block audio until a gesture, so the
 * board unlocks the context from the sound control. The mute choice is a
 * display preference in sessionStorage. It is not order data.
 */

const preferenceKey = "serve.kitchen.sound";

export type KitchenChime = {
  unlock(): Promise<void>;
  play(): void;
};

export function createKitchenChime(): KitchenChime {
  let context: AudioContext | null = null;

  function ensure() {
    context ??= new AudioContext();
    return context;
  }

  return {
    async unlock() {
      const ctx = ensure();
      if (ctx.state === "suspended") await ctx.resume();
      const buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
      const silent = ctx.createBufferSource();
      silent.buffer = buffer;
      silent.connect(ctx.destination);
      silent.start();
    },
    play() {
      if (!context || context.state !== "running") return;
      const start = context.currentTime + 0.02;
      [523.25, 659.25, 783.99].forEach((frequency, index) => {
        const osc = context!.createOscillator();
        const gain = context!.createGain();
        const at = start + index * 0.11;
        osc.type = "sine";
        osc.frequency.setValueAtTime(frequency, at);
        gain.gain.setValueAtTime(0.0001, at);
        gain.gain.exponentialRampToValueAtTime(0.12, at + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.42);
        osc.connect(gain);
        gain.connect(context!.destination);
        osc.start(at);
        osc.stop(at + 0.46);
      });
    },
  };
}

let chime: KitchenChime | null = null;
const preferenceListeners = new Set<() => void>();

export function getKitchenChime() {
  chime ??= createKitchenChime();
  return chime;
}

export function subscribeSoundPreference(listener: () => void) {
  preferenceListeners.add(listener);
  return () => preferenceListeners.delete(listener);
}

export function getSoundPreferenceSnapshot() {
  return readSoundPreference();
}

export function getSoundPreferenceServerSnapshot() {
  return false;
}

export function setSoundPreference(on: boolean) {
  writeSoundPreference(on);
  for (const listener of preferenceListeners) listener();
}

export function readSoundPreference() {
  try {
    return sessionStorage.getItem(preferenceKey) === "on";
  } catch {
    return false;
  }
}

export function writeSoundPreference(on: boolean) {
  try {
    sessionStorage.setItem(preferenceKey, on ? "on" : "off");
  } catch {
    // A private browser can refuse storage. The button still works this visit.
  }
}
