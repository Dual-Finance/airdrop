use crate::*;
use anchor_spl::token::{Token, TokenAccount};
use dual_airdrop::program::DualAirdrop as AirdropProgram;
use whirlpool::{
    state::{Position, PositionRewardInfo, TickArray, Whirlpool},
    program::Whirlpool as WhirlpoolProgram,
};

pub fn handle_claim(ctx: Context<Claim>) -> Result<()> {
    verify_position_authority(
        &ctx.accounts.position_token_account,
        ctx.accounts.recipient.owner,
    )?;

    let update_accounts = whirlpool::cpi::accounts::UpdateFeesAndRewards {
        whirlpool: ctx.accounts.whirlpool.to_account_info(),
        position: ctx.accounts.position.to_account_info(),
        tick_array_lower: ctx.accounts.tick_array_lower.to_account_info(),
        tick_array_upper: ctx.accounts.tick_array_upper.to_account_info(),
    };

    // Requires the airdrop state as a key so you cannot just claim for a
    // different one.
    whirlpool::cpi::update_fees_and_rewards(
        CpiContext::new(
            ctx.accounts.orca_program.to_account_info(),
            update_accounts,
        ),
    )?;
    ctx.accounts.position.reload()?;

    let position_reward_info: PositionRewardInfo =
        ctx.accounts.position.reward_infos[ctx.accounts.verifier_state.reward_index as usize];
    let amount: u64 = position_reward_info.amount_owed;

    // Resets the amount_owed on the Position.
    let collect_reward0 = whirlpool::cpi::accounts::CollectReward {
        whirlpool: ctx.accounts.whirlpool.to_account_info(),
        position: ctx.accounts.position.to_account_info(),
        position_token_account: ctx.accounts.position_token_account.to_account_info(),
        position_authority: ctx.accounts.position_authority.to_account_info(),
        reward_owner_account: ctx.accounts.reward_owner_account0.to_account_info(),
        reward_vault: ctx.accounts.reward_vault0.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
    };
    let collect_reward1 = whirlpool::cpi::accounts::CollectReward {
        whirlpool: ctx.accounts.whirlpool.to_account_info(),
        position: ctx.accounts.position.to_account_info(),
        position_token_account: ctx.accounts.position_token_account.to_account_info(),
        position_authority: ctx.accounts.position_authority.to_account_info(),
        reward_owner_account: ctx.accounts.reward_owner_account1.to_account_info(),
        reward_vault: ctx.accounts.reward_vault1.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
    };
    let collect_reward2 = whirlpool::cpi::accounts::CollectReward {
        whirlpool: ctx.accounts.whirlpool.to_account_info(),
        position: ctx.accounts.position.to_account_info(),
        position_token_account: ctx.accounts.position_token_account.to_account_info(),
        position_authority: ctx.accounts.position_authority.to_account_info(),
        reward_owner_account: ctx.accounts.reward_owner_account2.to_account_info(),
        reward_vault: ctx.accounts.reward_vault2.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
    };
    whirlpool::cpi::collect_reward(
        CpiContext::new(
            ctx.accounts.orca_program.to_account_info(),
            collect_reward0,
        ),
        0
    )?;
    whirlpool::cpi::collect_reward(
        CpiContext::new(
            ctx.accounts.orca_program.to_account_info(),
            collect_reward1,
        ),
        1
    )?;
    whirlpool::cpi::collect_reward(
        CpiContext::new(
            ctx.accounts.orca_program.to_account_info(),
            collect_reward2,
        ),
        2
    )?;

    // Call the CPI to claim from airdrop
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

    Ok(())
}

#[derive(Accounts)]
#[instruction()]
pub struct Claim<'info> {
    pub verifier_state: Account<'info, VerifierState>,

    #[account(
        has_one = whirlpool,
        constraint = position.whirlpool.as_ref() == verifier_state.pool.as_ref(),
        constraint = airdrop_state.key.as_ref() == verifier_state.airdrop_state.as_ref(),
    )]
    pub position: Account<'info, Position>,

    #[account(
        constraint = position_token_account.amount == 1,
        constraint = position_token_account.mint == position.position_mint
    )]
    pub position_token_account: Box<Account<'info, TokenAccount>>,

    pub whirlpool: Account<'info, Whirlpool>,

    #[account(has_one = whirlpool)]
    pub tick_array_lower: AccountLoader<'info, TickArray>,
    #[account(has_one = whirlpool)]
    pub tick_array_upper: AccountLoader<'info, TickArray>,

    pub position_authority: Signer<'info>,
    pub reward_owner_account0: Box<Account<'info, TokenAccount>>,
    pub reward_vault0: Box<Account<'info, TokenAccount>>,
    pub reward_owner_account1: Box<Account<'info, TokenAccount>>,
    pub reward_vault1: Box<Account<'info, TokenAccount>>,
    pub reward_owner_account2: Box<Account<'info, TokenAccount>>,
    pub reward_vault2: Box<Account<'info, TokenAccount>>,

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
    pub orca_program: Program<'info, WhirlpoolProgram>,
}
