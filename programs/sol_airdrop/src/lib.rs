use anchor_lang::prelude::*;

mod common;
mod constants;
mod errors;
mod instructions;

pub use crate::common::*;
pub use crate::constants::*;
pub use crate::errors::ErrorCode;
pub use crate::instructions::*;

declare_id!("tXmC2ARKqzPoX6wQAVmDj25XAQUN6JQe8iz19QR5Lo3");

#[program]
pub mod sol_airdrop {
    use super::*;

    pub fn configure(ctx: Context<Configure>, state_seed: [u8; 32]) -> Result<()> {
        handle_configure(ctx, state_seed)
    }

    pub fn claim<'info>(ctx: Context<Claim>, amount: u64) -> Result<()> {
        handle_claim(ctx, amount)
    }

    pub fn close(ctx: Context<Close>) -> Result<()> {
        handle_close(ctx)
    }
}