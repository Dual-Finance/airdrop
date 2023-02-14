use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::State;
use crate::VAULT_SEED;

#[derive(Accounts)]
#[instruction(verifier_instruction_prefix: [u8; 8])]
pub struct Configure<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init,
        payer = payer,
        space = 8 + std::mem::size_of::<State>(),
    )]
    pub state: Account<'info, State>,

    /// Expects the caller to fill it.
    #[account(
        init,
        payer = payer,
        seeds = [VAULT_SEED.as_ref(), state.key().as_ref()],
        token::mint = mint,
        token::authority = vault,
        bump,
    )]
    pub vault: Account<'info, TokenAccount>,
    pub mint: Box<Account<'info, Mint>>,

    /// CHECK: we want this be permissionless
    pub verifier_program: UncheckedAccount<'info>,
    /// CHECK: we want this be permissionless
    pub verifier_state: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handle_configure(
    ctx: Context<Configure>,
    verifier_instruction_prefix: [u8; 8],
) -> Result<()> {
    ctx.accounts.state.verifier_program = ctx.accounts.verifier_program.key();
    ctx.accounts.state.verifier_state = ctx.accounts.verifier_state.key();
    ctx.accounts.state.verifier_instruction_prefix = verifier_instruction_prefix;
    ctx.accounts.state.vault = ctx.accounts.vault.key();
    ctx.accounts.state.vault_bump = *ctx.bumps.get("vault").unwrap();

    ctx.accounts.state.close_authority = ctx.accounts.payer.key();

    Ok(())
}
