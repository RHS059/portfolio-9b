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
  return { getState: () => ({timeSeconds, paused}), setPaused(value) { paused = !!value; last = now(); }, seek(value) {if(disposed)return;if(!Number.isFinite(value)||value<0)throw new RangeError('Scene time must be finite and nonnegative');timeSeconds=value;accumulator=0;last=now();onTick?.({timeSeconds,paused});}, reset() {timeSeconds = 0; accumulator = 0; last = now();}, dispose() {disposed = true; cancel(timer);}, tick };
}
