use anchor_lang::prelude::*;
use anchor_spl::token::TokenAccount;

use crate::State;

#[derive(Accounts)]
#[instruction(verifier_instruction_prefix: u32)]
pub struct Configure<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init,
        payer = payer,
        space = 8 + std::mem::size_of::<State>(),
    )]
    pub state: AccountLoader<'info, State>,

    /// Expected to already be initialized and filled.
    #[account(
        seeds = [b"Vault".as_ref(), state.key().as_ref()],
        bump,
    )]
    pub vault: Account<'info, TokenAccount>,

    /// CHECK: we want this be permissionless
    pub verifier_program: UncheckedAccount<'info>,
    /// CHECK: we want this be permissionless
    pub verifier_state: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handle_configure(
    ctx: Context<Configure>,
    verifier_instruction_prefix: u64,
) -> Result<()> {
    let mut state = ctx.accounts.state.load_mut()?;
    state.verifier_program = ctx.accounts.verifier_program.key();
    state.verifier_state = ctx.accounts.verifier_state.key();
    state.verifier_instruction_prefix = verifier_instruction_prefix;
    state.vault = ctx.accounts.vault.key();
    state.vault_bump = *ctx.bumps.get("vault").unwrap();
    state.state_bump = *ctx.bumps.get("state").unwrap();

    state.close_authority = ctx.accounts.payer.key();

    Ok(())
}