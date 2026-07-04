// Soroban contract client. Owns: contract deployment for new groups, invocation
// of interest-distribution, contribution-accounting, and default-state
// contracts. Contract IDs live on the `groups` row (spec §6.2).

export async function deployGroupContracts(_groupId: string): Promise<{
  interestContractId: string;
  contributionContractId: string;
  defaultContractId: string;
}> {
  throw new Error("not_implemented");
}

export async function invokeInterestDistribution(
  _groupId: string,
  _loanId: string,
  _amount: bigint,
): Promise<string> {
  throw new Error("not_implemented");
}
