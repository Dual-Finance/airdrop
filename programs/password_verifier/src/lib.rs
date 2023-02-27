use anchor_lang::prelude::*;
use anchor_lang::solana_program::keccak::*;

declare_id!("EmsREpwoUtHnmg8aSCqmTFyfp71vnnFCdZozohcrZPeL");

#[program]
pub mod password_verifier {
    use super::*;

    pub fn init(ctx: Context<Init>, _seed: [u8; 32], password_hash: [u8; 32]) -> Result<()> {
        ctx.accounts.verification_state.password_hash = password_hash;
        Ok(())
    }

    pub fn verify(ctx: Context<Verify>, _amount: u64, verification_data: Vec<u8>) -> Result<()> {
        let verification_data_slice: &[u8] = verification_data.as_slice();
        assert_eq!(
            hashv(&[verification_data_slice]).as_ref(),
            ctx.accounts.verification_state.password_hash,
        );
        Ok(())
    }
}

#[account]
pub struct VerificationState {
    pub password_hash: [u8; 32],
}

#[derive(Accounts)]
#[instruction(seed: [u8; 32], password_hash: [u8; 32])]
pub struct Init<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        seeds = [&seed],
        bump,
        space = 8 + std::mem::size_of::<VerificationState>(),
    )]
    pub verification_state: Account<'info, VerificationState>,

    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(amount: u64, verification_data: Vec<u8>)]
pub struct Verify<'info> {
    pub authority: Signer<'info>,

    pub verification_state: Account<'info, VerificationState>,

    /// CHECK: Not used
    pub unused_recipient: UncheckedAccount<'info>,
}
