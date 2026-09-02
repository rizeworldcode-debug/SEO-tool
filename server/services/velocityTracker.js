/**
 * Link Velocity Analysis & Spike Detection Service
 */

function analyzeLinkVelocity(backlinks = [], options = {}) {
  const minPace = options.minPace !== undefined ? options.minPace : parseInt(process.env.TARGET_VELOCITY_MIN || '5', 10);
  const maxPace = options.maxPace !== undefined ? options.maxPace : parseInt(process.env.TARGET_VELOCITY_MAX || '15', 10);
  const spikeMultiplier = 2.0;
  const spikeThreshold = maxPace * spikeMultiplier;

  // Group backlinks into 12 weekly buckets ending at current week
  const now = new Date();
  const weeks = [];
  for (let i = 11; i >= 0; i--) {
    const weekStart = new Date(now.getTime() - (i + 1) * 7 * 86400000);
    const weekEnd = new Date(now.getTime() - i * 7 * 86400000);
    const label = `Week -${i}`;

    const count = backlinks.filter(bl => {
      const date = new Date(bl.submissionDate || bl.createdAt);
      return date >= weekStart && date < weekEnd;
    }).length;

    weeks.push({
      weekIndex: i,
      label,
      startDate: weekStart.toISOString().split('T')[0],
      endDate: weekEnd.toISOString().split('T')[0],
      count,
      isSpike: count > spikeThreshold,
      isBelowPace: count < minPace,
      isAbovePace: count > maxPace
    });
  }

  const currentWeek = weeks[weeks.length - 1];
  const hasSpikeAlert = weeks.some(w => w.isSpike);
  const avgVelocityPerWeek = parseFloat((weeks.reduce((sum, w) => sum + w.count, 0) / weeks.length).toFixed(1));

  return {
    targetPaceBand: { minPace, maxPace, spikeThreshold },
    currentWeekVelocity: currentWeek.count,
    avgVelocityPerWeek,
    hasSpikeAlert,
    weeks
  };
}

module.exports = {
  analyzeLinkVelocity
};
