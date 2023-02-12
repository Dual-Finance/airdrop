use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};

use crate::State;

#[derive(Accounts)]
#[instruction()]
pub struct Close<'info> {
    /// Mutable because might need to pay rent in verifier.
    #[account(mut,
        constraint = *authority.key == state.load()?.close_authority
    )]
    pub authority: Signer<'info>,

    #[account(mut, close=authority)]
    pub state: AccountLoader<'info, State>,

    /// Expected to already be initialized and filled.
    #[account(
        mut,
        seeds = [b"State".as_ref(), state.key().as_ref()],
        bump,
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub recipient: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handle_close(
    ctx: Context<Close>,
) -> Result<()> {
    let state = ctx.accounts.state.load()?;

    // Transfer the tokens
    anchor_spl::token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            anchor_spl::token::Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.recipient.to_account_info(),
                authority: ctx.accounts.vault.to_account_info(),
            },
            &[&[
                b"Vault".as_ref(),
                &ctx.accounts.state.key().as_ref(),
                &[state.state_bump],
            ]],
        ),
        ctx.accounts.vault.amount,
    )?;
    

    Ok(())
}