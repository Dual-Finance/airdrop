use anchor_lang::prelude::*;

mod common;
mod instructions;

pub use crate::common::*;
pub use crate::instructions::*;

declare_id!("9X1uDdEsKpc7s1WdZzmfzLG5nhnf2KuE5WpaDaGjGyiG");

#[program]
pub mod orca_verifier {
    use super::*;

    pub fn init(ctx: Context<Init>, seed: [u8; 32], reward_index: u8) -> Result<()> {
        handle_init(ctx, seed, reward_index)
    }

    pub fn init_receipt(ctx: Context<InitReceipt>) -> Result<()> {
        handle_init_receipt(ctx)
    }

    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        handle_claim(ctx)
    }
}
