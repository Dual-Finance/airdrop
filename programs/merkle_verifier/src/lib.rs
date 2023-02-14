use anchor_lang::prelude::*;

mod common;
mod instructions;

pub use crate::common::*;
pub use crate::instructions::*;

declare_id!("4ibGmfZ6WU9qDc231sTRsTTHoDjQ1L6wxkrEAiEvKfLm");

#[program]
pub mod merkle_verifier {
    use super::*;

    pub fn verify(ctx: Context<Verify>, amount: u64, verification_data: Vec<u8>) -> Result<()> {
        handle_verify(ctx, amount, verification_data)
    }

    pub fn init(ctx: Context<Init>, root: [u8; 32]) -> Result<()> {
        handle_init(ctx, root)
    }
}
