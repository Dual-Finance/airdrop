use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Verifier program in claim does not match configure")]
    IncorrectVerifierProgram,
    #[msg("Verifier state in claim does not match configure")]
    IncorrectVerifierState,
}
