use crate::*;
use sol_airdrop::program::SolAirdrop as AirdropProgram;
use anchor_spl::token::{Token, TokenAccount};

pub fn handle_claim(ctx: Context<Claim>, amount: u64, verification_data: Vec<u8>) -> Result<()> {
    // Do the verification
    let index_array: [u8; 8] = verification_data[0..8]
        .try_into()
        .expect("Invalid verification data");
    let index: u64 = u64::from_le_bytes(index_array);

    msg!("Verification Data {:02X?}", verification_data);
    msg!("Verification Data Length {}", verification_data.len());
    msg!("Amount {}", amount);
    msg!("Index {}", index);

    let leaf: [u8; 32] = anchor_lang::solana_program::keccak::hashv(&[
        &index.to_le_bytes(),
        &ctx.accounts.recipient.owner.key().to_bytes(),
        &amount.to_le_bytes(),
    ])
    .0;

    let mut proof: Vec<[u8; 32]> = Vec::new();
    // Convert the Vec<u8> into Vec<[u8; 32]> and call the verifier
    let mut iter = verification_data[8..].chunks(32);
    while iter.len() > 0 {
        let next_hash: [u8; 32] = iter
            .next()
            .unwrap()
            .try_into()
            .expect("Invalid verification data");
        proof.push(next_hash);
        msg!("Proof hash {:02X?}", next_hash);
    }

    // This is the actual verification.
    verify_proof(proof, ctx.accounts.verifier_state.root, leaf);

    // Fill in the receipt. Just the presence of this object makes another
    // attempt at verify fail.
    ctx.accounts.receipt.index = index;
    ctx.accounts.receipt.recipient = ctx.accounts.recipient.owner.key();

    // Call the CPI to claim
    let claim_accounts = sol_airdrop::cpi::accounts::Claim {
        authority: ctx.accounts.cpi_authority.to_account_info(),
        state: ctx.accounts.airdrop_state.to_account_info(),
        vault: ctx.accounts.vault.to_account_info(),
        recipient: ctx.accounts.recipient.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
    };
    let cpi_program = ctx.accounts.airdrop_program.to_account_info();

    // Requires the airdrop state as a key so you cannot just claim for a
    // different one.
    sol_airdrop::cpi::claim(
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
#[instruction(amount: u64, verification_data: Vec<u8>)]
pub struct Claim<'info> {
    /// Authority just needs to pay for the receipt rent. Does not actually have
    /// to be the recipient.
    #[account(mut)]
    pub authority: Signer<'info>,

    /// Used to get the root for validation.
    pub verifier_state: Account<'info, VerifierState>,

    #[account(
        init,
        seeds = ["Receipt".as_ref(), verifier_state.key().as_ref(), &verification_data[0..8]],
        bump,
        space = 8 + std::mem::size_of::<Receipt>(),
        payer = authority
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

    pub system_program: Program<'info, System>,
}
