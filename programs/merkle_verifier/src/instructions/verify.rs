use crate::*;

use anchor_spl::token::TokenAccount;

#[derive(Accounts)]
#[instruction(amount: u64, verification_data: Vec<u8>)]
pub struct Verify<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    /// Used to get the root for validation.
    pub verification_state: Account<'info, MerkleDistributor>,

    /// Recipient owner is part of the leaf node.
    pub recipient: Account<'info, TokenAccount>,

    #[account(
        init,
        seeds = ["Receipt".as_ref(), verification_state.key().as_ref(), verification_data[0..8].as_ref()],
        bump,
        space = 8 + std::mem::size_of::<Receipt>(),
        payer = authority
    )]
    pub receipt: Account<'info, Receipt>,

    pub system_program: Program<'info, System>,
}

pub fn handle_verify(ctx: Context<Verify>, amount: u64, verification_data: Vec<u8>) -> Result<()> {
    let index_array: [u8; 8] = verification_data[0..8].try_into().expect("Invalid verification data");
    let index: u64 = u64::from_le_bytes(index_array);

    msg!("Verification Data {:02X?}", verification_data);
    msg!("Verification Data Length {}", verification_data.len());
    msg!("Amount {}", amount);
    msg!("Index {}", index);

    let leaf: [u8; 32] = anchor_lang::solana_program::keccak::hashv(&[
        &index.to_le_bytes(),
        &ctx.accounts.recipient.owner.key().to_bytes(),
        &amount.to_le_bytes(),
    ]).0;

    let mut proof: Vec<[u8; 32]> = Vec::new();
    // Convert the rest of the Vec<u8> into Vec<[u8; 32]> and call the verifier
    let mut iter = verification_data[8..].chunks(32);
    while iter.len() > 0 {
        let next_hash: [u8; 32] = iter.next().unwrap().try_into().expect("Invalid verification data");
        proof.push(next_hash);
        msg!("Proof hash {:02X?}", next_hash);
    }

    verify_proof(proof, ctx.accounts.verification_state.root, leaf);

    // Fill in the receipt. Just the presences of this object makes another
    // attempt at verify fail.
    ctx.accounts.receipt.index = index;
    ctx.accounts.receipt.recipient = ctx.accounts.recipient.owner.key();

    Ok(())
}