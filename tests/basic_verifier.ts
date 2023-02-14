import * as anchor from '@coral-xyz/anchor';
import { Program, Provider } from '@project-serum/anchor';
import { BasicVerifier } from '../target/types/basic_verifier';

describe('basic_verifier', () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const provider: Provider = anchor.AnchorProvider.env();
  const program = anchor.workspace.BasicVerifier as Program<BasicVerifier>;

  it('Verify', async () => {
    const tx = await program.methods.verify(
      new anchor.BN(1_000_000),
      Buffer.from('Optional payload data'),
    )
      .accounts({
        authority: provider.publicKey,
        unusedVerificationState: provider.publicKey,
        unusedRecipient: provider.publicKey,
      })
      .rpc();
    console.log('Verifiaction signature', tx);
  });
});
