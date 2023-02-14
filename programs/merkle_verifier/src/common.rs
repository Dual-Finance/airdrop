use anchor_lang::prelude::*;

pub fn verify_proof(proof: Vec<[u8; 32]>, root: [u8; 32], leaf: [u8; 32]) {
    let mut current_hash = leaf;
    for node in proof.into_iter() {
        // Nodes are arranged so the smaller one is on the left.
        if current_hash <= node {
            current_hash = anchor_lang::solana_program::keccak::hashv(&[&current_hash, &node]).0;
        } else {
            current_hash = anchor_lang::solana_program::keccak::hashv(&[&node, &current_hash]).0;
        }
    }
    assert_eq!(current_hash, root)
}

/// State for the account which distributes tokens.
#[account]
pub struct MerkleDistributor {
    /// The 256-bit merkle root.
    pub root: [u8; 32],
}