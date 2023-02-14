use anchor_lang::prelude::*;

#[account]
pub struct State {
    /// Program and config which will be passed into a CPI for verifying that
    /// the request is valid and for how much. The config is always passed into
    /// the verification as well as any additional accounts on claim. Only works
    /// with 8 byte instruction prefixes. That is the number of bytes that
    /// anchor uses.
    pub verifier_program: Pubkey,
    pub verifier_state: Pubkey,
    pub verifier_instruction_prefix: [u8; 8],

    /// Tokens to be airdropped and the bump for the account.
    pub vault: Pubkey,
    pub vault_bump: u8,

    /// Required signer when closing.
    pub close_authority: Pubkey,
}
