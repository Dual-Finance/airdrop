import * as anchor from '@coral-xyz/anchor';
import { Program, Provider } from '@project-serum/anchor';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';
import { keccak_256 } from 'js-sha3';
import { Airdrop } from '../target/types/airdrop';
import { PasswordVerifier } from '../target/types/password_verifier';
import { createMint, createTokenAccount, mintToAccount } from './utils/utils';

const crypto = require('crypto');

describe('password_verifier', () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider: Provider = anchor.AnchorProvider.env();

  const airdropProgram = anchor.workspace.Airdrop as Program<Airdrop>;
  const verifierProgram = anchor.workspace.PasswordVerifier as Program<PasswordVerifier>;

  it('Password Claim', async () => {
    const PASSWORD = 'PASSWORD';
  
    const verifierSeed = crypto.randomBytes(32);
    const [passwordVerifierState, _passwordVerifierBump] = (
      anchor.web3.PublicKey.findProgramAddressSync(
        [verifierSeed],
        verifierProgram.programId,
      ));

    const airdropAmount = new anchor.BN(1_000_000);
    const mint = await createMint(provider, provider.publicKey);

    const passwordSeed = crypto.randomBytes(32);
    const [passwordState, _stateBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [passwordSeed],
      airdropProgram.programId,
    );
    const [passwordVault, _bump] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('Vault')),
        passwordState.toBuffer(),
      ],
      airdropProgram.programId,
    );
    const [verifierSignature, _signatureBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [passwordState.toBuffer()],
      verifierProgram.programId,
    );

    await airdropProgram.methods.configure(
      passwordSeed,
    )
      .accounts({
        payer: provider.publicKey,
        state: passwordState,
        vault: passwordVault,
        mint,
        verifierSignature,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc({ skipPreflight: true });

    await mintToAccount(provider, mint, passwordVault, airdropAmount, provider.publicKey);

    // Configure the verifier first, then test a claim.
    await verifierProgram.methods.init(
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

    const recipient = await createTokenAccount(provider, mint, provider.publicKey);
    await verifierProgram.methods.claim(
      airdropAmount,
      Buffer.from(PASSWORD),
    )
      .accounts({
        authority: provider.publicKey,
        verificationState: passwordVerifierState,
        cpiAuthority: verifierSignature,
        airdropState: passwordState,
        vault: passwordVault,
        recipient,
        tokenProgram: TOKEN_PROGRAM_ID,
        airdropProgram: airdropProgram.programId,
      })
      .rpc({ skipPreflight: true });
  });
});
