use crate::*;

#[derive(Accounts)]
#[instruction(root: [u8; 8])]
pub struct Init<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init,
        space = 8 + std::mem::size_of::<MerkleDistributor>(),
        payer = payer
    )]
    pub distributor: Account<'info, MerkleDistributor>,

    pub system_program: Program<'info, System>,
}

pub fn handle_init(
    ctx: Context<Init>,
    root: [u8; 32]
) -> Result<()> {
    ctx.accounts.distributor.root = root;

    Ok(())
}