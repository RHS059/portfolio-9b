/** Deterministic visual motion only: no timers, visits, dispatch or throughput facts. */
export function illustrativePosition(snapshot, points, periodSeconds = 40, offset = 0) {
  if (!Array.isArray(points) || points.length < 2) throw new TypeError('A visual path needs two points');
  if (!Number.isFinite(periodSeconds) || periodSeconds <= 0) throw new RangeError('A visual period must be positive');
  const time = Number.isFinite(snapshot?.timeSeconds) ? Math.max(0, snapshot.timeSeconds) : 0;
  const phase = (((time / periodSeconds + offset) % 1) + 1) % 1;
  const segment = phase * (points.length - 1), index = Math.min(points.length - 2, Math.floor(segment)), t = segment - index;
  const from = points[index], to = points[index + 1];
  return Object.freeze({ x: from[0] + (to[0] - from[0]) * t, y: from[1] + (to[1] - from[1]) * t,
    heading: Math.atan2(-(to[0] - from[0]), to[1] - from[1]) });
}

export function bindIllustrativeMotion(group, movingObjects) {
  let disposed = false;
  group.userData.update = snapshot => {
    if (disposed) return;
    for (const { object, points, period, offset } of movingObjects) {
      const pose = illustrativePosition(snapshot, points, period, offset);
      object.position.x = pose.x; object.position.y = pose.y; object.rotation.z = pose.heading;
    }
  };
  group.userData.dispose = () => { disposed = true; };
  group.userData.update({ timeSeconds: 0 });
}
