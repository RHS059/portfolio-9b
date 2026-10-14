/** Fixed-step visual clock. It never changes records or authority. */
export function createSimulation({onTick, stepHz = 20, now = () => performance.now(), schedule = setInterval, cancel = clearInterval} = {}) {
  let timeSeconds = 0, paused = false, disposed = false, last = now(), accumulator = 0;
  const step = 1 / stepHz;
  const tick = () => {
    if (disposed) return;
    const current = now();
    const elapsed = Math.min(Math.max((current - last) / 1000, 0), .25);
    last = current;
    if (!paused) {
      accumulator += elapsed;
      while (accumulator >= step) { timeSeconds += step; accumulator -= step; }
    }
    onTick?.({timeSeconds, paused});
  };
  const timer = schedule(tick, 1000 / stepHz);
  return { getState: () => ({timeSeconds, paused}), setPaused(value) { paused = !!value; last = now(); }, reset() {timeSeconds = 0; accumulator = 0; last = now();}, dispose() {disposed = true; cancel(timer);}, tick };
}
