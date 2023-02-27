import * as anchor from '@coral-xyz/anchor';
import { Program, Provider } from '@project-serum/anchor';
import { keccak_256 } from 'js-sha3';
import { PasswordVerifier } from '../target/types/password_verifier';

const crypto = require('crypto');

describe('password_verifier', () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const provider: Provider = anchor.AnchorProvider.env();
  const program = anchor.workspace.PasswordVerifier as Program<PasswordVerifier>;
  const PASSWORD = 'PASSWORD';

  const verifierSeed = crypto.randomBytes(32);
  const [passwordVerifierState, _passwordVerifierBump] = (
    anchor.web3.PublicKey.findProgramAddressSync(
      [verifierSeed],
      program.programId,
    ));

  it('Verify', async () => {
    console.log('Password init');
    const initTx = await program.methods.init(
      // @ts-ignore
      verifierSeed,
      Buffer.from(keccak_256.digest(Buffer.from(PASSWORD))),
    )
      .accounts({
        authority: provider.publicKey,
        verificationState: passwordVerifierState,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc({ skipPreflight: true });
    console.log('Init signature', initTx);

    const verifyTx = await program.methods.verify(
      new anchor.BN(1_000_000),
      Buffer.from(PASSWORD),
    )
      .accounts({
        authority: provider.publicKey,
        verificationState: passwordVerifierState,
        unusedRecipient: provider.publicKey,
      })
      .rpc();
    console.log('Verification signature', verifyTx);
  });
});
