export {};

// Tipos mínimos para la YouTube IFrame API (el proyecto no incluye
// @types/youtube). Cubre sólo lo que usa SignSequencePlayer.tsx.
declare global {
  interface YTPlayerEvent {
    /** Elemento DOM donde se montó el player. */
    target: YTPlayer;
    /** Estado del player en onStateChange (0 = ENDED). */
    data?: number;
  }

  interface YTPlayerOptions {
    videoId?: string;
    playerVars?: Record<string, number | undefined>;
    events?: {
      onReady?: (event: YTPlayerEvent) => void;
      onStateChange?: (event: YTPlayerEvent) => void;
    };
  }

  interface YTPlayer {
    destroy(): void;
    playVideo(): void;
    pauseVideo(): void;
    stopVideo(): void;
  }

  interface Window {
    YT?: {
      Player: new (elementId: string, options?: YTPlayerOptions) => YTPlayer;
    };
  }
}
