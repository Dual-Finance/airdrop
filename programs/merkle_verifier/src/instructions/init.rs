use crate::*;

#[derive(Accounts)]
#[instruction(seed: [u8; 32], root: [u8; 8])]
pub struct Init<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init,
        seeds = [&seed],
        bump,
        space = 8 + std::mem::size_of::<VerifierState>(),
        payer = payer
    )]
    pub state: Account<'info, VerifierState>,

    pub system_program: Program<'info, System>,
}

pub fn handle_init(ctx: Context<Init>, _seed: [u8; 32], root: [u8; 32]) -> Result<()> {
    ctx.accounts.state.root = root;

    Ok(())
}
