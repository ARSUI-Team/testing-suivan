export const DEFAULT_COLLATERAL_MULTIPLIER = 125;

export function getRemainingCommitmentCycles(maxParticipants: number): number {
  return Math.max(0, maxParticipants - 1);
}

export function getRequiredCollateralAmount(
  depositAmount: number,
  maxParticipants: number,
  collateralMultiplier = DEFAULT_COLLATERAL_MULTIPLIER,
): number {
  return Math.ceil(
    depositAmount * getRemainingCommitmentCycles(maxParticipants) * collateralMultiplier / 100,
  );
}
