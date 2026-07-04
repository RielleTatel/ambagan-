#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env};

// Default-state contract. Records and manages the state of defaulted loans
// across the four escalation stages (SRS §8). Also records admin resolutions
// (waive, partial_settle, dispute) and per-member loss shares.

#[contracttype]
#[derive(Clone, Copy, PartialEq, Eq)]
pub enum Stage {
    None = 0,
    One = 1,
    Two = 2,
    Three = 3,
    Four = 4,
}

#[contract]
pub struct DefaultState;

#[contractimpl]
impl DefaultState {
    pub fn transition(_env: Env, _loan: Address, _to: Stage) {
        // TODO: implement per spec §8
    }

    pub fn record_resolution(
        _env: Env,
        _loan: Address,
        _action: soroban_sdk::Symbol,
        _loss_amount: i128,
    ) {
        // TODO: implement per spec §8.2
    }
}
