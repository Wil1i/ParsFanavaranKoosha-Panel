function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysBetween(a, b) {
  return Math.floor((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86400000);
}

/**
 * Computes the maturity/timer info for a batch, mirroring the frontend logic.
 * @param {{startDate: string|Date, readyDays: number}} batch
 */
function batchMeta(batch) {
  const start = new Date(batch.startDate);
  const readyDate = new Date(start);
  readyDate.setDate(readyDate.getDate() + Number(batch.readyDays || 0));

  const today = new Date();
  const daysElapsed = Math.max(0, daysBetween(start, today));
  const daysRemaining = Number(batch.readyDays || 0) - daysElapsed;
  const isReady = daysRemaining <= 0;
  const progressPct = Math.max(
    0,
    Math.min(100, (daysElapsed / Math.max(1, Number(batch.readyDays || 0))) * 100)
  );

  return { readyDate, daysElapsed, daysRemaining, isReady, progressPct };
}

module.exports = { batchMeta, daysBetween, startOfDay };
