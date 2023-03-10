use anchor_lang::prelude::*;

pub fn verify_proof(proof: Vec<[u8; 32]>, root: [u8; 32], leaf: [u8; 32]) {
    let mut current_hash = leaf;
    for node in proof.into_iter() {
        msg!("Current Hash {:02X?}", current_hash);
        // Nodes are arranged so the smaller one is on the left.
        if current_hash <= node {
            current_hash = anchor_lang::solana_program::keccak::hashv(&[&current_hash, &node]).0;
        } else {
            current_hash = anchor_lang::solana_program::keccak::hashv(&[&node, &current_hash]).0;
        }
    }
    msg!("Last Hash {:02X?}", current_hash);
    msg!("Root {:02X?}", root);
    assert_eq!(current_hash, root)
}

/// State for the verifier
#[account]
pub struct VerifierState {
    pub root: [u8; 32],
    pub airdrop_state: Pubkey,
}

/// Receipt for claiming. This prevents multiple redemptions.
#[account]
pub struct Receipt {
    pub index: u64,
    pub recipient: Pubkey,
}
