use anchor_lang::prelude::*;

#[account]
pub struct State {
    /// Fields were used in a previous version. Eventually will remove on next
    /// major release.
    pub unused_verifier_program: Pubkey,
    pub unused_verifier_state: Pubkey,
    pub unused_verifier_instruction_prefix: [u8; 8],

    /// Tokens to be airdropped and the bump for the token account.
    pub vault: Pubkey,
    pub vault_bump: u8,

    /// Seed and bump for this account. Should not be needed, but saved for
    /// future use.
    pub state_seed: [u8; 32],
    pub state_bump: u8,

    /// Required signer when closing.
    pub close_authority: Pubkey,

    /// Verifier calls into this program with a CPI.
    pub verifier_signature: Pubkey,

    /// Reserved for any future upgrades.
    pub unused_padding: [u8; 32],
}
