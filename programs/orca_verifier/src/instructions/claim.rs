use crate::*;
use anchor_spl::token::{Token, TokenAccount};
use dual_airdrop::program::DualAirdrop as AirdropProgram;
use whirlpools::{Position, PositionRewardInfo};

// Goal is to mimic the logic here
// https://github.com/orca-so/whirlpools/blob/main/programs/whirlpool/src/instructions/collect_reward.rs
pub fn handle_claim(ctx: Context<Claim>) -> Result<()> {
    verify_position_authority(
        &ctx.accounts.position_token_account,
        ctx.accounts.recipient.owner,
    )?;

    let position_reward_info: PositionRewardInfo =
        ctx.accounts.position.reward_infos[ctx.accounts.verifier_state.reward_index as usize];
    let amount: u64 = position_reward_info.amount_owed;

    if ctx.accounts.position.fee_growth_checkpoint_a <= ctx.accounts.receipt.fee_checkpoint {
        msg!("Already claimed reward");
        return Ok(());
    }
    ctx.accounts.receipt.fee_checkpoint = ctx.accounts.position.fee_growth_checkpoint_a;

    // Call the CPI to claim
    let claim_accounts = dual_airdrop::cpi::accounts::Claim {
        authority: ctx.accounts.cpi_authority.to_account_info(),
        state: ctx.accounts.airdrop_state.to_account_info(),
        vault: ctx.accounts.vault.to_account_info(),
        recipient: ctx.accounts.recipient.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
    };
    let cpi_program = ctx.accounts.airdrop_program.to_account_info();

    // Requires the airdrop state as a key so you cannot just claim for a
    // different one.
    dual_airdrop::cpi::claim(
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

    // TODO: Force a claim on the orca rewards so that those rewards are synced
    // with these.
    
    Ok(())
}

#[derive(Accounts)]
#[instruction()]
pub struct Claim<'info> {
    /// Authority just needs to pay for gas. Does not actually have to be the
    /// recipient.
    pub authority: Signer<'info>,

    pub verifier_state: Account<'info, VerifierState>,

    #[account(
        constraint = position.whirlpool.as_ref() == verifier_state.pool.as_ref(),
        constraint = airdrop_state.key.as_ref() == verifier_state.airdrop_state.as_ref(),
    )]
    pub position: Account<'info, Position>,

    #[account(
        constraint = position_token_account.amount == 1,
        constraint = position_token_account.mint == position.position_mint
    )]
    pub position_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = ["Receipt".as_ref(), verifier_state.key().as_ref(), position.key().as_ref()],
        constraint = receipt.position.key().as_ref() == position.key().as_ref(),
        bump = receipt.bump,
    )]
    pub receipt: Account<'info, Receipt>,

    #[account(seeds = [&airdrop_state.key().to_bytes()], bump)]
    /// CHECK: Checked in the CPI
    pub cpi_authority: UncheckedAccount<'info>,
    #[account(constraint = airdrop_state.key.as_ref() == verifier_state.airdrop_state.as_ref())]
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

pub fn handle_init_receipt(ctx: Context<InitReceipt>) -> Result<()> {
    ctx.accounts.receipt.bump = *ctx.bumps.get("receipt").unwrap();
    ctx.accounts.receipt.position = ctx.accounts.position.key();
    ctx.accounts.receipt.fee_checkpoint = 0;
    Ok(())
}

#[derive(Accounts)]
#[instruction()]
pub struct InitReceipt<'info> {
    /// Authority just needs to pay for the receipt rent. Does not actually have
    /// to be the recipient.
    #[account(mut)]
    pub authority: Signer<'info>,

    pub verifier_state: Account<'info, VerifierState>,

    pub position: Account<'info, Position>,

    #[account(
        init,
        seeds = ["Receipt".as_ref(), verifier_state.key().as_ref(), position.key().as_ref()],
        bump,
        space = 8 + std::mem::size_of::<Receipt>(),
        payer = authority
    )]
    pub receipt: Account<'info, Receipt>,

    pub system_program: Program<'info, System>,
}
