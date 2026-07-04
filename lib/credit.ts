// Credit score calculator. Inputs per FR-CR-01: contribution consistency,
// contribution timeliness, repayment history, current default status, time as
// a group member. Output is 0..1000 (integer). Also exposes the letter grade
// used on loan cards (FR-CR-03).

export type CreditInputs = {
  onTimeContributions: number;
  lateContributions: number;
  missedContributions: number;
  loansRepaidOnSchedule: number;
  activeDefaults: number;
  monthsAsMember: number;
};

export function computeCreditScore(_inputs: CreditInputs): number {
  throw new Error("not_implemented");
}

export function creditLetterGrade(_score: number): "A" | "B" | "C" | "D" | "F" {
  throw new Error("not_implemented");
}
