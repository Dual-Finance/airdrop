use anchor_lang::prelude::*;
use anchor_spl::token::{TokenAccount, Token};

use crate::State;

#[derive(Accounts)]
#[instruction(amount: u64, verifier_data: Vec<[u8; 32]>)]
pub struct Claim<'info> {
    /// Mutable because might need to pay rent in verifier.
    #[account(mut)]
    pub authority: Signer<'info>,

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

    /// CHECK: we want this be permissionless
    pub verifier_program: UncheckedAccount<'info>,
    /// CHECK: we want this be permissionless
    pub verifier_state: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
}

pub fn handle_claim(
    ctx: Context<Claim>,
    amount: u64,
    _verifier_data: Vec<[u8; 32]>
) -> Result<()> {
    // Run the verifier
    // Verifier takes in the recipient owner, the amount, verifier_data, the config account, and all remaining_accounts

    /*
    let ix = solana_program::instruction::Instruction::new(
            program_id: Pubkey,
            data: &T,
            accounts: Vec<AccountMeta>
    );

    solana_program::program::invoke(
        &ix,
        &[
            acct_infos
        ],
    )?;
    */
    
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
        amount,
    )?;
    

    Ok(())
}