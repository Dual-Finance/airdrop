import * as anchor from '@coral-xyz/anchor';
import { Program, Provider } from '@project-serum/anchor';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Airdrop } from '../target/types/airdrop';
import { BasicVerifier } from '../target/types/basic_verifier';
import { createMint, createTokenAccount, mintToAccount } from './utils/utils';

const crypto = require('crypto');

describe('basic_verifier', () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider: Provider = anchor.AnchorProvider.env();

  const airdropProgram = anchor.workspace.Airdrop as Program<Airdrop>;
  const verifierProgram = anchor.workspace.BasicVerifier as Program<BasicVerifier>;

  it('Basic Claim', async () => {
    const airdropAmount = new anchor.BN(1_000_000);
    const mint = await createMint(provider, provider.publicKey);

    const basicSeed = crypto.randomBytes(32);
    const [basicState, _stateBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [basicSeed],
      airdropProgram.programId,
    );
    const [basicVault, _bump] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('Vault')),
        basicState.toBuffer(),
      ],
      airdropProgram.programId,
    );
    const [verifierSignature, _signatureBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [basicState.toBuffer()],
      verifierProgram.programId,
    );

    await airdropProgram.methods.configure(
      basicSeed,
    )
      .accounts({
        payer: provider.publicKey,
        state: basicState,
        vault: basicVault,
        mint,
        verifierSignature,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc({ skipPreflight: true });

    await mintToAccount(provider, mint, basicVault, airdropAmount, provider.publicKey);
    const recipient = await createTokenAccount(provider, mint, provider.publicKey);
    await verifierProgram.methods.claim(
      airdropAmount,
    )
      .accounts({
        authority: provider.publicKey,
        cpiAuthority: verifierSignature,
        airdropState: basicState,
        vault: basicVault,
        recipient,
        tokenProgram: TOKEN_PROGRAM_ID,
        airdropProgram: airdropProgram.programId,
      })
      .rpc({ skipPreflight: true });
  });
});
