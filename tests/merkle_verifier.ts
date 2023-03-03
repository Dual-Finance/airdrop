import * as anchor from '@coral-xyz/anchor';
import { Program, Provider } from '@project-serum/anchor';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import assert from 'assert';
import { Airdrop } from '../target/types/airdrop';
import { MerkleVerifier } from '../target/types/merkle_verifier';
import { BalanceTree } from './utils/balance_tree';
import {
  createMint, createTokenAccount, mintToAccount, toBeBytes, toBytes32Array,
} from './utils/utils';

const crypto = require('crypto');

describe('merkle_verifier', () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider: Provider = anchor.AnchorProvider.env();

  const airdropProgram = anchor.workspace.Airdrop as Program<Airdrop>;
  const verifierProgram = anchor.workspace.MerkleVerifier as Program<MerkleVerifier>;

  it('Merkle Claim', async () => {
    const verifierSeed = crypto.randomBytes(32);
    const [merkleVerifierState, _merkleVerifierBump] = (
      anchor.web3.PublicKey.findProgramAddressSync(
        [verifierSeed],
        verifierProgram.programId,
      ));

    const airdropAmount = new anchor.BN(1_000_000);
    const mint = await createMint(provider, provider.publicKey);

    const merkleSeed = crypto.randomBytes(32);
    const [merkleState, _stateBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [merkleSeed],
      airdropProgram.programId,
    );
    const [merkleVault, _bump] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('Vault')),
        merkleState.toBuffer(),
      ],
      airdropProgram.programId,
    );
    const [verifierSignature, _signatureBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [merkleState.toBuffer()],
      verifierProgram.programId,
    );

    await airdropProgram.methods.configure(
      merkleSeed,
    )
      .accounts({
        payer: provider.publicKey,
        state: merkleState,
        vault: merkleVault,
        mint,
        verifierSignature,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc({ skipPreflight: true });

    await mintToAccount(provider, mint, merkleVault, airdropAmount, provider.publicKey);

    const kpOne = anchor.web3.Keypair.generate();
    const kpTwo = anchor.web3.Keypair.generate();
    const kpThree = anchor.web3.Keypair.generate();

    const claimAmountOne = new anchor.BN(100);
    const claimAmountTwo = new anchor.BN(101);
    const claimAmountThree = new anchor.BN(102);
    const tree = new BalanceTree([
      { account: kpOne.publicKey, amount: claimAmountOne },
      { account: kpTwo.publicKey, amount: claimAmountTwo },
      { account: kpThree.publicKey, amount: claimAmountThree },
    ]);

    await verifierProgram.methods.init(
      verifierSeed,
      toBytes32Array(tree.getRoot()),
    )
      .accounts({
        payer: provider.publicKey,
        state: merkleVerifierState,
        airdropState: merkleState,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc({ skipPreflight: true });

    const index = 0;
    const proofStrings: Buffer[] = tree.getProof(index, kpOne.publicKey, claimAmountOne);
    const proofBytes: number[][] = proofStrings.map((p) => toBytes32Array(p));

    let verificationData = Buffer.allocUnsafe(8);
    verificationData.writeBigUInt64LE(BigInt(index));

    const [receipt, _receiptBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('Receipt')),
        merkleVerifierState.toBuffer(),
        toBeBytes(index),
      ],
      verifierProgram.programId,
    );

    for (const proofElem of proofBytes) {
      verificationData = Buffer.concat([verificationData, Buffer.from(proofElem)]);
    }

    const recipient = await createTokenAccount(provider, mint, kpOne.publicKey);
    await verifierProgram.methods.claim(
      claimAmountOne,
      verificationData,
    )
      .accounts({
        authority: provider.publicKey,
        verifierState: merkleVerifierState,
        cpiAuthority: verifierSignature,
        airdropState: merkleState,
        vault: merkleVault,
        recipient,
        receipt,
        tokenProgram: TOKEN_PROGRAM_ID,
        airdropProgram: airdropProgram.programId,
      })
      .rpc({ skipPreflight: true });
  });

  it('Merkle Claim fail repeat', async () => {
    const verifierSeed = crypto.randomBytes(32);
    const [merkleVerifierState, _merkleVerifierBump] = (
      anchor.web3.PublicKey.findProgramAddressSync(
        [verifierSeed],
        verifierProgram.programId,
      ));

    const airdropAmount = new anchor.BN(1_000_000);
    const mint = await createMint(provider, provider.publicKey);

    const merkleSeed = crypto.randomBytes(32);
    const [merkleState, _stateBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [merkleSeed],
      airdropProgram.programId,
    );
    const [merkleVault, _bump] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('Vault')),
        merkleState.toBuffer(),
      ],
      airdropProgram.programId,
    );
    const [verifierSignature, _signatureBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [merkleState.toBuffer()],
      verifierProgram.programId,
    );

    await airdropProgram.methods.configure(
      merkleSeed,
    )
      .accounts({
        payer: provider.publicKey,
        state: merkleState,
        vault: merkleVault,
        mint,
        verifierSignature,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc({ skipPreflight: true });

    await mintToAccount(provider, mint, merkleVault, airdropAmount, provider.publicKey);

    const kpOne = anchor.web3.Keypair.generate();
    const kpTwo = anchor.web3.Keypair.generate();
    const kpThree = anchor.web3.Keypair.generate();

    const claimAmountOne = new anchor.BN(100);
    const claimAmountTwo = new anchor.BN(101);
    const claimAmountThree = new anchor.BN(102);
    const tree = new BalanceTree([
      { account: kpOne.publicKey, amount: claimAmountOne },
      { account: kpTwo.publicKey, amount: claimAmountTwo },
      { account: kpThree.publicKey, amount: claimAmountThree },
    ]);

    await verifierProgram.methods.init(
      verifierSeed,
      toBytes32Array(tree.getRoot()),
    )
      .accounts({
        payer: provider.publicKey,
        state: merkleVerifierState,
        airdropState: merkleState,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc({ skipPreflight: true });

    const index = 0;
    const proofStrings: Buffer[] = tree.getProof(index, kpOne.publicKey, claimAmountOne);
    const proofBytes: number[][] = proofStrings.map((p) => toBytes32Array(p));

    let verificationData = Buffer.allocUnsafe(8);
    verificationData.writeBigUInt64LE(BigInt(index));

    const [receipt, _receiptBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('Receipt')),
        merkleVerifierState.toBuffer(),
        toBeBytes(index),
      ],
      verifierProgram.programId,
    );

    for (const proofElem of proofBytes) {
      verificationData = Buffer.concat([verificationData, Buffer.from(proofElem)]);
    }

    const recipient = await createTokenAccount(provider, mint, kpOne.publicKey);
    await verifierProgram.methods.claim(
      claimAmountOne,
      verificationData,
    )
      .accounts({
        authority: provider.publicKey,
        verifierState: merkleVerifierState,
        cpiAuthority: verifierSignature,
        airdropState: merkleState,
        vault: merkleVault,
        recipient,
        receipt,
        tokenProgram: TOKEN_PROGRAM_ID,
        airdropProgram: airdropProgram.programId,
      })
      .rpc({ skipPreflight: true });

    try {
      await verifierProgram.methods.claim(
        claimAmountOne,
        verificationData,
      )
        .accounts({
          authority: provider.publicKey,
          verifierState: merkleVerifierState,
          cpiAuthority: verifierSignature,
          airdropState: merkleState,
          vault: merkleVault,
          recipient,
          receipt,
          tokenProgram: TOKEN_PROGRAM_ID,
          airdropProgram: airdropProgram.programId,
        })
        .rpc({ skipPreflight: true });
      assert(false);
    } catch (err) {
      assert(true);
    }
  });

  it('Merkle Claim fail wrong amount', async () => {
    const verifierSeed = crypto.randomBytes(32);
    const [merkleVerifierState, _merkleVerifierBump] = (
      anchor.web3.PublicKey.findProgramAddressSync(
        [verifierSeed],
        verifierProgram.programId,
      ));

    const airdropAmount = new anchor.BN(1_000_000);
    const mint = await createMint(provider, provider.publicKey);

    const merkleSeed = crypto.randomBytes(32);
    const [merkleState, _stateBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [merkleSeed],
      airdropProgram.programId,
    );
    const [merkleVault, _bump] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('Vault')),
        merkleState.toBuffer(),
      ],
      airdropProgram.programId,
    );
    const [verifierSignature, _signatureBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [merkleState.toBuffer()],
      verifierProgram.programId,
    );

    await airdropProgram.methods.configure(
      merkleSeed,
    )
      .accounts({
        payer: provider.publicKey,
        state: merkleState,
        vault: merkleVault,
        mint,
        verifierSignature,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc({ skipPreflight: true });

    await mintToAccount(provider, mint, merkleVault, airdropAmount, provider.publicKey);

    const kpOne = anchor.web3.Keypair.generate();
    const kpTwo = anchor.web3.Keypair.generate();
    const kpThree = anchor.web3.Keypair.generate();

    const claimAmountOne = new anchor.BN(100);
    const claimAmountTwo = new anchor.BN(101);
    const claimAmountThree = new anchor.BN(102);
    const tree = new BalanceTree([
      { account: kpOne.publicKey, amount: claimAmountOne },
      { account: kpTwo.publicKey, amount: claimAmountTwo },
      { account: kpThree.publicKey, amount: claimAmountThree },
    ]);

    await verifierProgram.methods.init(
      verifierSeed,
      toBytes32Array(tree.getRoot()),
    )
      .accounts({
        payer: provider.publicKey,
        state: merkleVerifierState,
        airdropState: merkleState,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc({ skipPreflight: true });

    const index = 0;
    const proofStrings: Buffer[] = tree.getProof(index, kpOne.publicKey, claimAmountOne);
    const proofBytes: number[][] = proofStrings.map((p) => toBytes32Array(p));

    let verificationData = Buffer.allocUnsafe(8);
    verificationData.writeBigUInt64LE(BigInt(index));

    const [receipt, _receiptBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('Receipt')),
        merkleVerifierState.toBuffer(),
        toBeBytes(index),
      ],
      verifierProgram.programId,
    );

    for (const proofElem of proofBytes) {
      verificationData = Buffer.concat([verificationData, Buffer.from(proofElem)]);
    }

    const recipient = await createTokenAccount(provider, mint, kpOne.publicKey);
    try {
      await verifierProgram.methods.claim(
        claimAmountTwo,
        verificationData,
      )
        .accounts({
          authority: provider.publicKey,
          verifierState: merkleVerifierState,
          cpiAuthority: verifierSignature,
          airdropState: merkleState,
          vault: merkleVault,
          recipient,
          receipt,
          tokenProgram: TOKEN_PROGRAM_ID,
          airdropProgram: airdropProgram.programId,
        })
        .rpc({ skipPreflight: true });
      assert(false);
    } catch (err) {
      assert(true);
    }
  });
});
