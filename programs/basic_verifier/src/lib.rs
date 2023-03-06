use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};
use sol_airdrop::program::SolAirdrop as AirdropProgram;

declare_id!("FEdxZUg4BtWvMy7gy7pXEoj1isqBRYmbYdpyZfq5QZYr");

#[program]
pub mod basic_verifier {
    use super::*;

    pub fn claim(ctx: Context<Claim>, amount: u64) -> Result<()> {
        // No verification to do.

        // Call the CPI to claim
        let claim_accounts = sol_airdrop::cpi::accounts::Claim {
            authority: ctx.accounts.cpi_authority.to_account_info(),
            state: ctx.accounts.airdrop_state.to_account_info(),
            vault: ctx.accounts.vault.to_account_info(),
            recipient: ctx.accounts.recipient.to_account_info(),
            token_program: ctx.accounts.token_program.to_account_info(),
        };
        let cpi_program = ctx.accounts.airdrop_program.to_account_info();

        sol_airdrop::cpi::claim(
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

#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct Claim<'info> {
    pub authority: Signer<'info>,

    #[account(seeds = [&airdrop_state.key().to_bytes()], bump)]
    /// CHECK: Just an account info
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
