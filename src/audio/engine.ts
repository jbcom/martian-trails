import { Howl, Howler } from "howler";
import { MUSIC, type MusicId, SFX, type SfxId } from "@/audio/library";

/**
 * Audio engine — a thin howler wrapper with two channels (sfx + music), a
 * looping engine-hum, music crossfade/duck, and a browser gesture-unlock. UI
 * and sim never touch Howl directly; they call this. Base path comes from
 * import.meta.env.BASE_URL so it works under the Pages subpath and Capacitor.
 */
const base = import.meta.env.BASE_URL;
const url = (p: string) => `${base}${p}`;

class AudioEngine {
  private sfxCache = new Map<SfxId, Howl>();
  private music: Howl | null = null;
  private musicId: MusicId | null = null;
  private engineHum: Howl | null = null;
  private muted = false;
  private unlocked = false;

  /** Call from the first user gesture to satisfy autoplay policies. */
  unlock(): void {
    if (this.unlocked) return;
    this.unlocked = true;
    // Touching the Howler ctx inside a gesture resumes it.
    Howler.volume(this.muted ? 0 : 1);
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    Howler.volume(muted ? 0 : 1);
  }

  play(id: SfxId, volume = 1): void {
    let howl = this.sfxCache.get(id);
    if (!howl) {
      howl = new Howl({ src: [url(SFX[id])], preload: true });
      this.sfxCache.set(id, howl);
    }
    howl.volume(volume);
    howl.play();
  }

  /** Start (or crossfade to) a looping music track. */
  playMusic(id: MusicId, volume = 0.5, fadeMs = 800): void {
    if (this.musicId === id) return;
    const next = new Howl({ src: [url(MUSIC[id])], loop: true, volume: 0 });
    next.play();
    next.fade(0, volume, fadeMs);
    const prev = this.music;
    if (prev) {
      prev.fade(prev.volume(), 0, fadeMs);
      prev.once("fade", () => prev.unload());
    }
    this.music = next;
    this.musicId = id;
  }

  /** Duck music to a fraction of its volume (e.g. during an event modal). */
  duckMusic(to = 0.2, fadeMs = 300): void {
    if (this.music) this.music.fade(this.music.volume(), to, fadeMs);
  }

  setEngineHum(on: boolean): void {
    if (on) {
      if (!this.engineHum) {
        this.engineHum = new Howl({ src: [url(SFX.engineLoop)], loop: true, volume: 0.35 });
      }
      if (!this.engineHum.playing()) this.engineHum.play();
    } else if (this.engineHum?.playing()) {
      this.engineHum.stop();
    }
  }

  stopAll(): void {
    this.music?.stop();
    this.engineHum?.stop();
  }
}

export const audio = new AudioEngine();
