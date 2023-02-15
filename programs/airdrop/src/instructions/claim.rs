use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};

use crate::ErrorCode;
use crate::State;
use crate::VAULT_SEED;

#[derive(Accounts)]
#[instruction(amount: u64, verifier_data: Vec<u8>)]
pub struct Claim<'info> {
    /// Mutable because might need to pay rent in verifier.
    #[account(mut)]
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

    #[account(constraint = verifier_program.key.as_ref() == state.verifier_program.key().as_ref() @ ErrorCode::IncorrectVerifierProgram)]
    /// CHECK: Verified in the verifier.
    pub verifier_program: UncheckedAccount<'info>,

    #[account(mut, constraint = verifier_state.key.as_ref() == state.verifier_state.key().as_ref() @ ErrorCode::IncorrectVerifierState)]
    /// CHECK: Verified in the verifier.
    pub verifier_state: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
}

pub fn handle_claim<'info>(
    ctx: Context<'_, '_, '_, 'info, Claim<'info>>,
    amount: u64,
    verifier_data: Vec<u8>,
) -> Result<()> {
    msg!("Handling claim");

    let mut verifier_accounts: Vec<AccountMeta> = Vec::new();
    // Authority is a signer, the other accounts are not. All inherit mutability.
    verifier_accounts.push(AccountMeta::new(*ctx.accounts.authority.key, true));
    verifier_accounts.push(AccountMeta::new(*ctx.accounts.verifier_state.key, false));
    verifier_accounts.push(AccountMeta::new(ctx.accounts.recipient.key(), false));

    // For the remaining_accounts, pass through is_signer and is_mutable.
    for acct in ctx.remaining_accounts {
        let signer = acct.is_signer;
        if acct.is_writable {
            verifier_accounts.push(AccountMeta::new(acct.key(), signer));
        } else {
            verifier_accounts.push(AccountMeta::new_readonly(acct.key(), signer));
        }
    }

    let mut verifier_data_with_prefix: Vec<u8> = Vec::new();
    verifier_data_with_prefix.extend_from_slice(&ctx.accounts.state.verifier_instruction_prefix);
    verifier_data_with_prefix.extend_from_slice(&mut amount.to_le_bytes());

    // Put in the vec length prefix.
    verifier_data_with_prefix.append(&mut verifier_data.try_to_vec().unwrap());

    let ix = solana_program::instruction::Instruction::new_with_bytes(
        *ctx.accounts.verifier_program.key,
        &verifier_data_with_prefix,
        verifier_accounts,
    );

    let mut account_infos: Vec<AccountInfo> = vec![
        ctx.accounts.authority.clone().to_account_info(),
        ctx.accounts.verifier_state.clone().to_account_info(),
        ctx.accounts.recipient.clone().to_account_info(),
    ];
    for remaining_acct in ctx.remaining_accounts {
        account_infos.push(remaining_acct.clone().to_account_info());
    }

    // This is the actual verification. If it fails, then do not proceed.
    solana_program::program::invoke(&ix, &account_infos)?;

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
