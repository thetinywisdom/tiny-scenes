/**
 * Deterministic timeline.
 * Scene state is a pure function of the frame index: fixed seed, fixed
 * timestep, no wall clock. `sample(frameCount)` matches `sample(0)` for
 * every periodic channel, so a loop of `frameCount` frames is seamless.
 */
export function createTimeline({ fps = 30, seconds = 8, seed = 1 } = {}) {
  const frameCount = Math.max(1, Math.round(fps * seconds));
  return {
    fps,
    seconds,
    seed,
    frameCount,
    sample(frame) {
      const wrapped = ((frame % frameCount) + frameCount) % frameCount;
      const t = wrapped / frameCount;
      const turns = t * Math.PI * 2;
      return {
        frame: wrapped,
        frameCount,
        fps,
        seconds,
        seed,
        /** 0 at the first frame, 1 at the last, exclusive of the wrap. */
        t,
        /** One full turn over the loop. */
        turns,
        /** Smooth 0 → 1 → 0 rise, zero derivative at both ends. */
        rise: 0.5 - 0.5 * Math.cos(turns),
      };
    },
  };
}
