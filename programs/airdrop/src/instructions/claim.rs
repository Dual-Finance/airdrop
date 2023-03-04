use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};

use crate::ErrorCode;
use crate::State;
use crate::VAULT_SEED;

#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct Claim<'info> {
    #[account(constraint = authority.key.as_ref() == state.verifier_signature.key().as_ref() @ ErrorCode::IncorrectVerifierSignature)]
    pub authority: Signer<'info>,

    pub state: Account<'info, State>,

    /// Expected to already be filled.
    #[account(
        mut,
        seeds = [VAULT_SEED.as_ref(), state.key().as_ref()],
        bump = state.vault_bump,
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub recipient: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handle_claim(
    ctx: Context<Claim>,
    amount: u64,
) -> Result<()> {
    msg!("Handling claim");

    // Transfer the tokens to the claimant.
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
        amount,
    )?;

    Ok(())
}
