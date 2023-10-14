use crate::*;

#[derive(Accounts)]
#[instruction(seed: [u8; 32])]
pub struct Init<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        seeds = [&seed],
        bump,
        space = 8 + std::mem::size_of::<VerifierState>(),
        payer = authority
    )]
    pub state: Account<'info, VerifierState>,

    /// CHECK: Not used, only an account info.
    pub pool: AccountInfo<'info>,

    /// CHECK: Not used, only an account info.
    pub airdrop_state: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handle_init(ctx: Context<Init>, seed: [u8; 32], reward_index: u8) -> Result<()> {
    ctx.accounts.state.bump = *ctx.bumps.get("state").unwrap();
    ctx.accounts.state.seed = seed;
    ctx.accounts.state.reward_index = reward_index;
    ctx.accounts.state.pool = ctx.accounts.pool.key();
    ctx.accounts.state.airdrop_state = ctx.accounts.airdrop_state.key();

    Ok(())
}
