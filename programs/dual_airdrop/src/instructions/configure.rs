use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::State;
use crate::VAULT_SEED;

#[derive(Accounts)]
#[instruction(state_seed: [u8; 32])]
pub struct Configure<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init,
        payer = payer,
        seeds = [&state_seed],
        bump,
        space = 8 + std::mem::size_of::<State>(),
    )]
    pub state: Account<'info, State>,

    /// Expects the caller to fill it after configure.
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

    /// CHECK: Will be verified in the verifier_program.
    pub verifier_signature: AccountInfo<'info>,

    /// CHECK: Just a public key saved for later to be matched as a signer of the close.
    pub close_authority: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handle_configure(ctx: Context<Configure>, state_seed: [u8; 32]) -> Result<()> {
    ctx.accounts.state.verifier_signature = ctx.accounts.verifier_signature.key();

    ctx.accounts.state.vault = ctx.accounts.vault.key();
    ctx.accounts.state.vault_bump = *ctx.bumps.get("vault").unwrap();
    ctx.accounts.state.close_authority = ctx.accounts.close_authority.key();

    ctx.accounts.state.state_seed = state_seed;
    ctx.accounts.state.state_bump = *ctx.bumps.get("state").unwrap();

    Ok(())
}
