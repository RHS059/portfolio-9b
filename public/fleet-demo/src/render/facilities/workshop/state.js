/** Presentation facts only. No odometer, source-policy or scheduling decisions. */
const IN_BAY = /^(workshop|in-service|maintenance|in-bay)$/i;
export function workshopPresentation(snapshot = {}) {
  const unique = new Map();
  for (const vehicle of Array.isArray(snapshot?.vehicles) ? snapshot.vehicles : []) {
    if (typeof vehicle?.id === 'string' && IN_BAY.test(vehicle.status || '')) unique.set(vehicle.id, vehicle.id);
  }
  const occupants = [...unique.keys()].sort();
  return Object.freeze({
    occupants: Object.freeze(occupants.slice(0, 2)), occupied: Math.min(2, occupants.length),
    overflow: Math.max(0, occupants.length - 2),
    selectedId: typeof snapshot?.selectedId === 'string' ? snapshot.selectedId : null,
    issueActive: snapshot?.issueActive === true, authorityResolved: snapshot?.authorityResolved === true,
    label: 'Fictional interior · service reconstruction',
  });
}
