use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};

use crate::State;
use crate::VAULT_SEED;

#[derive(Accounts)]
#[instruction()]
pub struct Close<'info> {
    #[account(mut,
        constraint = *authority.key == state.close_authority
    )]
    pub authority: Signer<'info>,

    #[account(mut)]
    pub state: Account<'info, State>,

    #[account(
        mut,
        seeds = [VAULT_SEED.as_ref(), state.key().as_ref()],
        bump,
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub recipient: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handle_close(
    ctx: Context<Close>,
) -> Result<()> {
    // Transfer the tokens.
    anchor_spl::token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            anchor_spl::token::Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.recipient.to_account_info(),
                authority: ctx.accounts.vault.to_account_info(),
            },
            &[&[
                VAULT_SEED.as_ref(),
                &ctx.accounts.state.key().as_ref(),
                &[ctx.accounts.state.vault_bump],
            ]],
        ),
        ctx.accounts.vault.amount,
    )?;
    

    Ok(())
}