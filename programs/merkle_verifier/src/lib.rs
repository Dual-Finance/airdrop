use anchor_lang::prelude::*;

mod common;
mod instructions;

pub use crate::common::*;
pub use crate::instructions::*;

declare_id!("8tBcmZAMNm11DuGAS2r6PqSA3CKt72amoz8bVj14xRiT");

#[program]
pub mod merkle_verifier {
    use super::*;

    pub fn claim(ctx: Context<Claim>, amount: u64, verification_data: Vec<u8>) -> Result<()> {
        handle_claim(ctx, amount, verification_data)
    }

    pub fn init(ctx: Context<Init>, seed: [u8; 32], root: [u8; 32]) -> Result<()> {
        handle_init(ctx, seed, root)
    }
}
