use anchor_lang::prelude::*;
use anchor_spl::token::{TokenAccount, Token};

use crate::State;

#[derive(Accounts)]
#[instruction(amount: u64, verifier_data: Vec<u8>)]
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

    #[account(mut)]
    /// CHECK: we want this be permissionless
    pub verifier_state: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
}

pub fn handle_claim<'info>(
    ctx: Context<'_, '_, '_, 'info, Claim<'info>>,
    amount: u64,
    verifier_data: Vec<u8>
) -> Result<()> {
    let state = ctx.accounts.state.load()?;

    let mut verifier_accounts: Vec<AccountMeta> = Vec::new();
    // Assume they all are mutable and not signers.
    verifier_accounts.push(AccountMeta::new(*ctx.accounts.verifier_state.key, false));
    verifier_accounts.push(AccountMeta::new(ctx.accounts.recipient.key(), false));
    for acct in ctx.remaining_accounts {
        verifier_accounts.push(AccountMeta::new(acct.key(), false));
    }

    let mut verifier_data_with_prefix: Vec<u8> = Vec::new();
    verifier_data_with_prefix.extend_from_slice(&mut state.verifier_instruction_prefix.to_be_bytes());
    verifier_data_with_prefix.extend_from_slice(&mut amount.to_be_bytes());
    verifier_data_with_prefix.append(&mut verifier_data.clone());

    let ix = solana_program::instruction::Instruction::new_with_borsh(
        *ctx.accounts.verifier_program.key,
        &verifier_data_with_prefix,
        verifier_accounts,
    );

    let mut account_infos: Vec<AccountInfo> = vec![
        ctx.accounts.verifier_state.clone().to_account_info(),
        ctx.accounts.recipient.clone().to_account_info(),
    ];
    for remaining_acct in ctx.remaining_accounts.clone() {
        account_infos.push(remaining_acct.clone().to_account_info());
    }
    solana_program::program::invoke(
        &ix,
        &account_infos,
    )?;
    
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