/**
 * Map UI start/end to program schedule: bidding_start < commit_end < reveal_end.
 */
export function computeCommitEndSec(
  startSec: number,
  endSec: number
): { ok: true; commitEndSec: number } | { ok: false; error: string } {
  if (!Number.isFinite(startSec) || !Number.isFinite(endSec)) {
    return { ok: false, error: "Invalid timestamps." };
  }
  if (endSec <= startSec + 2) {
    return {
      ok: false,
      error: "End time must be at least a few seconds after start.",
    };
  }
  const span = endSec - startSec;
  let commitEnd = startSec + Math.max(1, Math.floor(span * 0.5));
  if (commitEnd >= endSec) commitEnd = endSec - 1;
  if (commitEnd <= startSec) {
    return {
      ok: false,
      error: "Time window is too short for a commit phase before reveal.",
    };
  }
  return { ok: true, commitEndSec: commitEnd };
}
