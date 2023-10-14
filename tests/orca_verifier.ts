import * as anchor from '@coral-xyz/anchor';
import { Program, Provider } from '@project-serum/anchor';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { DualAirdrop } from '../target/types/dual_airdrop';
import { OrcaVerifier } from '../target/types/orca_verifier';
import { createMint, createTokenAccount, mintToAccount } from './utils/utils';
import { PublicKey } from '@solana/web3.js';

const crypto = require('crypto');

describe('orca_verifier', () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider: Provider = anchor.AnchorProvider.env();

  const airdropProgram = anchor.workspace.DualAirdrop as Program<DualAirdrop>;
  const verifierProgram = anchor.workspace.OrcaVerifier as Program<OrcaVerifier>;

  it('Orca Claim', async () => {
    const verifierSeed = crypto.randomBytes(32);
    const [orcaVerifierState, _orcaVerifierBump] = (
      anchor.web3.PublicKey.findProgramAddressSync(
        [verifierSeed],
        verifierProgram.programId,
      ));

    const airdropAmount = new anchor.BN(1_000_000);
    const mint = await createMint(provider, provider.publicKey);

    const orcaSeed = crypto.randomBytes(32);
    const [airdropState, _stateBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [orcaSeed],
      airdropProgram.programId,
    );
    const [orcaVault, _bump] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('Vault')),
        airdropState.toBuffer(),
      ],
      airdropProgram.programId,
    );
    const [verifierSignature, _signatureBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [airdropState.toBuffer()],
      verifierProgram.programId,
    );

    await airdropProgram.methods.configure(
      orcaSeed,
    )
      .accounts({
        payer: provider.publicKey,
        state: airdropState,
        vault: orcaVault,
        mint,
        verifierSignature,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc({ skipPreflight: true });

    await mintToAccount(provider, mint, orcaVault, airdropAmount, provider.publicKey);

    const rewardIndex = 0;
    const position = new PublicKey('HA1hk5mneoFcdwe9wC33eaofSeo9yVkXPsAonLm7jUCR');
    const pool = new PublicKey('HGw4exa5vdxhJHNVyyxhCc6ZwycwHQEVzpRXMDPDAmVP');
    const positionTokenAccount = new PublicKey('ByPiNz9jRbgY69jwux3rrs5FmQXFhnvT25Vw2U2D8PxT');
    // Configure the verifier first, then test a claim.
    await verifierProgram.methods.init(
      // @ts-ignore
      verifierSeed,
      rewardIndex
    )
      .accounts({
        authority: provider.publicKey,
        state: orcaVerifierState,
        airdropState: airdropState,
        pool,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc({ skipPreflight: true });

    const recipient = await createTokenAccount(provider, mint, new PublicKey('2qLWeNrV7QkHQvKBoEvXrKeLqEB2ZhscZd4ds7X2JUhn'));

    const [receipt, _receiptBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('Receipt')),
        orcaVerifierState.toBuffer(),
        position.toBuffer(),
      ],
      verifierProgram.programId,
    );
    await verifierProgram.methods.initReceipt()
      .accounts({
        authority: provider.publicKey,
        verifierState: orcaVerifierState,
        position,
        receipt: receipt,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc({ skipPreflight: true });

    await verifierProgram.methods.claim()
      .accounts({
        authority: provider.publicKey,
        verifierState: orcaVerifierState,
        position,
        positionTokenAccount,
        receipt,
        cpiAuthority: verifierSignature,
        airdropState: airdropState,
        vault: orcaVault,
        recipient,
        tokenProgram: TOKEN_PROGRAM_ID,
        airdropProgram: airdropProgram.programId,
      })
      .rpc({ skipPreflight: true });
  });
});
