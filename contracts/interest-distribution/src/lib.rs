#![no_std]
use soroban_sdk::{contract, contractimpl, Address, Env, Map};

// Interest distribution contract. Computes each member's share of repaid
// interest proportional to their contribution stake and pays it out on-chain
// (SRS FR-LR-06). Called from the app on every successful repayment.

#[contract]
pub struct InterestDistribution;

#[contractimpl]
impl InterestDistribution {
    pub fn distribute(
        _env: Env,
        _group: Address,
        _total_interest: i128,
        _stakes: Map<Address, i128>,
    ) {
        // TODO: implement per spec §7.4
    }
}
