use anchor_lang::prelude::*;

declare_id!("FEdxZUg4BtWvMy7gy7pXEoj1isqBRYmbYdpyZfq5QZYr");

#[program]
pub mod basic_verifier {
    use super::*;

    pub fn verify(_ctx: Context<Verify>, amount: u64, _verification_data: Vec<u8>) -> Result<()> {
        msg!("Verifying {}", amount);
        // Always returns true
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(amount: u64, verification_data: Vec<u8>)]
pub struct Verify<'info> {
    pub authority: Signer<'info>,

    /// CHECK: Not used
    pub unused_verification_state: UncheckedAccount<'info>,

    /// CHECK: Not used
    pub unused_recipient: UncheckedAccount<'info>,
}
