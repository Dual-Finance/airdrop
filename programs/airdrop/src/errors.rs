use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Verifier signer did not match expected")]
    IncorrectVerifierSignature,
}
