use anchor_lang::prelude::*;
use anchor_spl::token::TokenAccount;
use solana_program::program_option::COption;

/// State for the verifier
#[account]
pub struct VerifierState {
    pub seed: [u8; 32],
    pub bump: u8,

    pub pool: Pubkey,
    pub reward_index: u8,

    pub airdrop_state: Pubkey,
}

// Similar except we do not require Signer, the position_authority here is the
// recipient of the airdrop. Name is kept to match.
// https://github.com/orca-so/whirlpools/blob/main/programs/whirlpool/src/util/util.rs#L19C1-L37C2
pub fn verify_position_authority<'info>(
    position_token_account: &TokenAccount,
    position_authority: Pubkey,
) -> Result<()> {
    // Check token authority using validate_owner method...
    match position_token_account.delegate {
        COption::Some(ref delegate) if position_authority == *delegate => {
            if *delegate != position_authority {
                return Err(ErrorCode::InvalidPositionAuthority.into());
            }
            if position_token_account.delegated_amount != 1 {
                return Err(ErrorCode::InvalidPositionAuthority.into());
            }
        }
        _ => {
            if position_token_account.owner != position_authority {
                return Err(ErrorCode::InvalidPositionAuthority.into());
            }
        }
    };
    Ok(())
}

#[error_code]
#[derive(PartialEq)]
pub enum ErrorCode {
    #[msg("Authority of position does not match authority of claim recipient")]
    InvalidPositionAuthority,
}
