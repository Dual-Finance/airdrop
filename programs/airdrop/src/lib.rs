use anchor_lang::prelude::*;

mod common;
mod instructions;

pub use crate::common::*;
pub use crate::instructions::*;

declare_id!("tXmC2ARKqzPoX6wQAVmDj25XAQUN6JQe8iz19QR5Lo3");

#[program]
pub mod airdrop {
    use super::*;

    pub fn configure(ctx: Context<Configure>, verifier_instruction_prefix: u64) -> Result<()> {
        handle_configure(ctx, verifier_instruction_prefix)
    }

    pub fn claim<'info>(
        ctx: Context<'_, '_, '_, 'info, Claim<'info>>,
        amount: u64,
        verifier_data: Vec<u8>) -> Result<()> {
        handle_claim(ctx, amount, verifier_data)
    }

    pub fn close(ctx: Context<Close>) -> Result<()> {
        handle_close(ctx)
    }
}
