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
}

pub fn handle_verify(ctx: Context<Verify>, amount: u64, verification_data: Vec<u8>) -> Result<()> {
    let index_array: [u8; 8] = verification_data[0..8].try_into().expect("Invalid verification data");
    let index: u64 = u64::from_le_bytes(index_array);

    let leaf: [u8; 32] = anchor_lang::solana_program::keccak::hashv(&[
        &index.to_le_bytes(),
        &ctx.accounts.recipient.owner.key().to_bytes(),
        &amount.to_le_bytes(),
    ]).0;

    let mut proof: Vec<[u8; 32]> = Vec::new();
    // Convert the rest of the Vec<u8> into Vec<[u8; 32]> and call the verifier
    let mut iter = verification_data[8..].chunks(32);
    while !iter.next().is_none() {
        let next_hash: [u8; 32] = iter.next().unwrap().try_into().expect("Invalid verification data");
        proof.push(next_hash);
    }

    verify_proof(proof, ctx.accounts.verification_state.root, leaf);

    Ok(())
}