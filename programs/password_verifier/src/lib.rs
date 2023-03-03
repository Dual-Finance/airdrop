use airdrop::program::Airdrop as AirdropProgram;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::keccak::*;
use anchor_spl::token::{Token, TokenAccount};

declare_id!("EmsREpwoUtHnmg8aSCqmTFyfp71vnnFCdZozohcrZPeL");

#[program]
pub mod password_verifier {
    use super::*;

    pub fn init(ctx: Context<Init>, _seed: [u8; 32], password_hash: [u8; 32]) -> Result<()> {
        ctx.accounts.verification_state.password_hash = password_hash;
        Ok(())
    }

    pub fn claim(ctx: Context<Claim>, amount: u64, password: Vec<u8>) -> Result<()> {
        // Do verification.
        let verification_data_slice: &[u8] = password.as_slice();
        assert_eq!(
            hashv(&[verification_data_slice]).as_ref(),
            ctx.accounts.verification_state.password_hash,
        );

        // Call the CPI to claim
        let claim_accounts = airdrop::cpi::accounts::Claim {
            authority: ctx.accounts.cpi_authority.to_account_info(),
            state: ctx.accounts.airdrop_state.to_account_info(),
            vault: ctx.accounts.vault.to_account_info(),
            recipient: ctx.accounts.recipient.to_account_info(),
            token_program: ctx.accounts.token_program.to_account_info(),
        };
        let cpi_program = ctx.accounts.airdrop_program.to_account_info();

        airdrop::cpi::claim(
            CpiContext::new_with_signer(
                cpi_program,
                claim_accounts,
                &[&[
                    &ctx.accounts.airdrop_state.key().to_bytes(),
                    &[*ctx.bumps.get("cpi_authority").unwrap()],
                ]],
            ),
            amount,
        )?;

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
pub struct Claim<'info> {
    pub authority: Signer<'info>,

    pub verification_state: Account<'info, VerificationState>,

    #[account(seeds = [&airdrop_state.key().to_bytes()], bump)]
    /// CHECK: Checked in the CPI
    pub cpi_authority: UncheckedAccount<'info>,
    /// CHECK: Checked in the CPI
    pub airdrop_state: UncheckedAccount<'info>,
    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub recipient: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,

    /// Program which actually calls for the token transfer.
    pub airdrop_program: Program<'info, AirdropProgram>,
}
