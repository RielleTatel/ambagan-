// Credit score calculator per FR-CR-01. Output 0..1000. Letter grade per FR-CR-03.

export type CreditInputs = {
  onTimeContributions: number;
  lateContributions: number;
  missedContributions: number;
  loansRepaidOnSchedule: number;
  activeDefaults: number;
  monthsAsMember: number;
};

const BASE_SCORE = 500;

export function computeCreditScore(inputs: CreditInputs): number {
  const onTimeBonus = capped(inputs.onTimeContributions * 5, 200);
  const repaidBonus = capped(inputs.loansRepaidOnSchedule * 30, 150);
  const tenureBonus = capped(inputs.monthsAsMember * 5, 100);

  const latePenalty = capped(inputs.lateContributions * 10, 100);
  const missedPenalty = capped(inputs.missedContributions * 30, 200);
  const defaultPenalty = capped(inputs.activeDefaults * 100, 300);

  const raw =
    BASE_SCORE +
    onTimeBonus +
    repaidBonus +
    tenureBonus -
    latePenalty -
    missedPenalty -
    defaultPenalty;

  return clamp(raw, 0, 1000);
}

export function creditLetterGrade(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 800) return "A";
  if (score >= 700) return "B";
  if (score >= 600) return "C";
  if (score >= 500) return "D";
  return "F";
}

function capped(value: number, cap: number): number {
  return Math.min(Math.max(value, 0), cap);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
