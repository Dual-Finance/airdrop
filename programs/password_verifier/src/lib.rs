use std::str;
use anchor_lang::prelude::*;

declare_id!("EmsREpwoUtHnmg8aSCqmTFyfp71vnnFCdZozohcrZPeL");

#[program]
pub mod password_verifier {
    use super::*;

    pub fn init(ctx: Context<Init>, password: String) -> Result<()> {
        ctx.accounts.verification_state.password = password;
        Ok(())
    }

    pub fn verify(ctx: Context<Verify>, _amount: u64, verification_data: Vec<u8>) -> Result<()> {
        assert_eq!(ctx.accounts.verification_state.password, str::from_utf8(&verification_data).unwrap());
        Ok(())
    }
}

#[account]
pub struct VerificationState {
    pub password: String,
}

#[derive(Accounts)]
#[instruction(password: String)]
pub struct Init<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
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
