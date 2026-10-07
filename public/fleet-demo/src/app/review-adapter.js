/** Public Pages review boundary. No credentials, no live-model claim, no write capability. */
export async function reviewFixture({domain,scenario,vehicleId,provider}) {
  const result=await domain.reviewImports(scenario,provider||domain.createSimulatedReviewProvider());
  const ids=new Set(scenario.readings.filter(r=>r.vehicleId===vehicleId).map(r=>r.id));
  const findings=result.findings.filter(f=>f.evidenceReadingIds.some(id=>ids.has(id)));
  return Object.freeze({
    ...result,vehicleId,live:result.mode==='live',findings,
    summary:findings.length?findings.map(f=>f.summary).join(' '):'No attention findings were returned for this vehicle in the synthetic batch.',
    evidenceReadingIds:[...new Set(findings.flatMap(f=>f.evidenceReadingIds))],
    recommendation:findings.length?[...new Set(findings.map(f=>f.suggestedAction).filter(Boolean))].join(' '):'No recommendation was returned. Check the selected odometer source before deciding whether a change is needed.',
    notification:{recipient:'Fleet manager',channel:'in-app only',text:findings.length?`${vehicleId}: Check the flagged readings before changing its odometer source.`:`${vehicleId}: The review returned no findings.`},
    caveat:'This adapter is explicitly labeled above. Review findings cannot alter raw readings, service history or source policies. Unchanged readings alone do not prove a faulty device; an administrator must verify the migration.'
  });
}
