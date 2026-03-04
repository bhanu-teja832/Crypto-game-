"use client";
import { useRef, useCallback, useEffect, useState } from "react";

type SoundName = "tick" | "crash" | "cashout" | "countdown";

/**
 * Sound effects hook.
 *
 * Drop your sound files into public/sounds/:
 *   - tick.mp3      — short tick played every few multiplier increments
 *   - crash.mp3     — explosion sound on crash
 *   - cashout.mp3   — success chime on cash-out
 *   - countdown.mp3 — countdown beep
 *
 * Sounds are lazy-loaded on first play to avoid blocking page load.
 */
export function useSound() {
  const audioRefs = useRef<Partial<Record<SoundName, HTMLAudioElement>>>({});
  const [muted, setMuted] = useState(false);
  // Preload tick frequency control
  const lastTickRef = useRef<number>(0);

  // Load (or retrieve cached) Audio element for a sound
  const getAudio = useCallback((name: SoundName): HTMLAudioElement | null => {
    if (typeof window === "undefined") return null;

    if (!audioRefs.current[name]) {
      const audio = new Audio(`/sounds/${name}.mp3`);
      audio.preload = "auto";
      audioRefs.current[name] = audio;
    }

    return audioRefs.current[name]!;
  }, []);

  const play = useCallback(
    (name: SoundName, volume = 0.6) => {
      if (muted) return;

      const audio = getAudio(name);
      if (!audio) return;

      // Reset and play (handles rapid successive plays)
      audio.currentTime = 0;
      audio.volume = volume;
      audio.play().catch(() => {
        // Browsers block autoplay until user interaction — ignore silently
      });
    },
    [muted, getAudio]
  );

  /**
   * Play the tick sound, but throttled to once every 250ms.
   * Called in the game tick handler to avoid audio spam.
   */
  const playTick = useCallback(() => {
    const now = Date.now();
    if (now - lastTickRef.current < 250) return;
    lastTickRef.current = now;
    play("tick", 0.3);
  }, [play]);

  const playCrash    = useCallback(() => play("crash", 0.8),    [play]);
  const playCashout  = useCallback(() => play("cashout", 0.7),  [play]);
  const playCountdown = useCallback(() => play("countdown", 0.5), [play]);

  const toggleMute = useCallback(() => setMuted((m) => !m), []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(audioRefs.current).forEach((a) => {
        a?.pause();
      });
    };
  }, []);

  return {
    playTick,
    playCrash,
    playCashout,
    playCountdown,
    muted,
    toggleMute,
  };
}
