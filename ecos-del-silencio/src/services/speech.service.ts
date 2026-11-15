
import { audioService } from "./audio.service";

class SpeechService {
  private currentRequest = 0;

  /**
   * Abre la nota y después comienza a leer su contenido.
   */
  async read(text: string): Promise<void> {
    if (!text.trim()) return;

    const requestId = ++this.currentRequest;

    this.cancelSpeech();

    // Primero reproduce el efecto de apertura.
    await audioService.playNoteOpen();

    // Si apareció otra nota durante el efecto, no leer la anterior.
    if (requestId !== this.currentRequest) return;

    if (
      typeof window === "undefined" ||
      !("speechSynthesis" in window)
    ) {
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);

    utterance.lang = "es-MX";
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;

    window.speechSynthesis.speak(utterance);
  }

  /**
   * Cancela cualquier lectura y efecto de apertura pendiente.
   */
  stop(): void {
    this.currentRequest++;

    audioService.stopEffect();
    this.cancelSpeech();
  }

  private cancelSpeech(): void {
    if (
      typeof window !== "undefined" &&
      "speechSynthesis" in window
    ) {
      window.speechSynthesis.cancel();
    }
  }
}

export const speechService = new SpeechService();
