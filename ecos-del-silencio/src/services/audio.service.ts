
export type MusicTrack = "home" | "radar" | "mission";

class AudioService {
  private music: HTMLAudioElement | null = null;
  private effect: HTMLAudioElement | null = null;
  private unlocked = false;
  private currentTrack: MusicTrack | null = null;
  private effectFinished: (() => void) | null = null;

  private readonly musicPaths: Record<MusicTrack, string> = {
    home: "/audio/background/home.mp3",
    radar: "/audio/background/radar.mp3",
    mission: "/audio/background/mission.mp3",
  };

  /**
   * Se llama después de la primera interacción del usuario.
   * Los navegadores pueden bloquear la reproducción automática
   * hasta que exista una interacción.
   */
  async unlock(): Promise<void> {
    this.unlocked = true;

    if (this.music) {
      await this.playMusic();
    }
  }

  /**
   * Cambia la música ambiental.
   * Si se solicita la misma pista, no reinicia la reproducción.
   */
  async setMusic(track: MusicTrack): Promise<void> {
    if (this.currentTrack === track && this.music) {
      if (this.unlocked && this.music.paused) {
        await this.playMusic();
      }
      return;
    }

    this.stopMusic();

    this.currentTrack = track;
    this.music = new Audio(this.musicPaths[track]);
    this.music.loop = true;
    this.music.volume = 0.28;
    this.music.preload = "auto";

    if (this.unlocked) {
      await this.playMusic();
    }
  }

  private async playMusic(): Promise<void> {
    if (!this.music || !this.unlocked) return;

    try {
      await this.music.play();
    } catch (error) {
      // El navegador puede bloquear la reproducción.
      // La siguiente interacción permitirá intentarlo de nuevo.
      console.warn("No se pudo iniciar la música ambiental:", error);
    }
  }

  stopMusic(): void {
    if (this.music) {
      this.music.pause();
      this.music.currentTime = 0;
      this.music = null;
    }

    this.currentTrack = null;
  }

  /**
   * Reproduce el efecto de apertura de una nota.
   * La promesa termina cuando acaba el efecto o si no puede reproducirse.
   */
  async playNoteOpen(): Promise<void> {
    this.stopEffect();

    if (!this.unlocked) return;

    return new Promise((resolve) => {
      const audio = new Audio("/audio/effects/note-open.mp3");

      audio.volume = 0.65;
      audio.preload = "auto";

      let finished = false;

      const finish = () => {
        if (finished) return;

        finished = true;

        audio.onended = null;
        audio.onerror = null;

        if (this.effect === audio) {
          this.effect = null;
          this.effectFinished = null;
        }

        resolve();
      };

      this.effect = audio;
      this.effectFinished = finish;

      audio.onended = finish;
      audio.onerror = finish;

      audio.play().catch(() => {
        finish();
      });
    });
  }

  stopEffect(): void {
    if (!this.effect) return;

    const audio = this.effect;

    audio.pause();
    audio.currentTime = 0;

    this.effect = null;

    const finish = this.effectFinished;
    this.effectFinished = null;

    finish?.();
  }

  stopAll(): void {
    this.stopEffect();
    this.stopMusic();
  }
}

export const audioService = new AudioService();
