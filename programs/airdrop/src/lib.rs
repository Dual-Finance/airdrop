use anchor_lang::prelude::*;

mod common;
mod instructions;

pub use crate::common::*;
pub use crate::instructions::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod airdrop {
    use super::*;

    pub fn configure(ctx: Context<Configure>, verifier_instruction_prefix: u64) -> Result<()> {
        handle_configure(ctx, verifier_instruction_prefix)
    }

    pub fn claim(
        ctx: Context<Claim>,
        amount: u64,
        verifier_data: Vec<[u8; 32]>) -> Result<()> {
        handle_claim(ctx, amount, verifier_data)
    }

    pub fn close(ctx: Context<Close>) -> Result<()> {
        handle_close(ctx)
    }
}
