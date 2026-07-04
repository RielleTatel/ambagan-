// Default-handling state machine helpers (spec §8). Owns: computing which
// stage a loan is in given days past due, transitioning between stages,
// evaluating whether an extension vote passed, and building the per-member
// loss share when Stage 4 is reached.

export type DefaultStage = 0 | 1 | 2 | 3 | 4;

export function stageForDaysPastDue(_daysPastDue: number): DefaultStage {
  throw new Error("not_implemented");
}

export function computeLossShares(
  _totalLoss: bigint,
  _memberContributions: Record<string, bigint>,
): Record<string, bigint> {
  throw new Error("not_implemented");
}
