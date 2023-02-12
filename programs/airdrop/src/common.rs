use std::mem::size_of;

use anchor_lang::prelude::*;
use static_assertions::const_assert_eq;

#[account(zero_copy)]
pub struct State {
    /// Bump for this state. Used in verification.
    pub state_bump: u8,

    /// Program and config which will be passed into a CPI for verifying that
    /// the request is valid and for how much. The config is always passed into
    /// the verification as well as any additional accounts on claim. Only works
    /// with 8 byte instruction prefixes. That is the number of bytes that
    /// anchor uses.
    pub verifier_program: Pubkey,
    pub verifier_state: Pubkey,
    pub verifier_instruction_prefix: u64,

    /// Tokens to be airdropped and the bump for it.
    pub vault: Pubkey,
    pub vault_bump: u8,

    /// Required signer when closing
    pub close_authority: Pubkey,

    /// Extra padding in case there are future needs to store data on State.
    pub unused_padding: [u8; 102],
}

const_assert_eq!(size_of::<State>(), 1 + 32 + 32 + 16 + 32 + 1 + 32 + 102);
const_assert_eq!(size_of::<State>() % 8, 0);

impl State{
    pub fn verify(&self) -> bool {
        return true;
    }
}