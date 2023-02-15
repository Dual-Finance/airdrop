import * as anchor from '@coral-xyz/anchor';
import assert from 'assert';
import { Provider, Program } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Airdrop } from '../target/types/airdrop';
import {
  createMint, createTokenAccount, mintToAccount, toBytes32Array,
} from './utils/utils';
import { PasswordVerifier } from '../target/types/password_verifier';
import { MerkleVerifier } from '../target/types/merkle_verifier';
import { BalanceTree } from './utils/balance_tree';

describe('airdrop', () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider: Provider = anchor.AnchorProvider.env();
  const program = anchor.workspace.Airdrop as Program<Airdrop>;
  const passwordVerifierProgram = anchor.workspace.PasswordVerifier as Program<PasswordVerifier>;
  const merkleVerifierProgram = anchor.workspace.MerkleVerifier as Program<MerkleVerifier>;
  const amount = new anchor.BN(1_000_000);
  let mint: PublicKey;

  const basicState = anchor.web3.Keypair.generate();
  const basicVerifierState = anchor.web3.Keypair.generate();
  const [basicVault, _bump] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from(anchor.utils.bytes.utf8.encode('Vault')),
      basicState.publicKey.toBuffer(),
    ],
    program.programId,
  );

  const basicVerifier = new PublicKey('FEdxZUg4BtWvMy7gy7pXEoj1isqBRYmbYdpyZfq5QZYr');
  // TODO: Programmatically figure out the instruction data.
  const basicVerifierInstruction = [133, 161, 141, 48, 120, 198, 88, 150];

  it('BasicConfigure', async () => {
    mint = await createMint(provider, provider.publicKey);

    console.log('Basic configure');
    const tx = await program.methods.configure(
      basicVerifierInstruction,
    )
      .accounts({
        payer: provider.publicKey,
        state: basicState.publicKey,
        verifierProgram: basicVerifier,
        vault: basicVault,
        mint,
        verifierState: basicVerifierState.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([basicState])
      .rpc({ skipPreflight: true });

    console.log('Config signature', tx);
  });

  it('BasicClaim', async () => {
    await mintToAccount(provider, mint, basicVault, amount, provider.publicKey);

    const recipient = await createTokenAccount(provider, mint, provider.publicKey);

    console.log('Basic claim');
    const verifierData = Buffer.from('Optional payload data');
    const tx = await program.methods.claim(
      amount,
      verifierData,
    )
      .accounts({
        authority: provider.publicKey,
        state: basicState.publicKey,
        vault: basicVault,
        recipient,
        verifierProgram: basicVerifier,
        verifierState: basicVerifierState.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc({ skipPreflight: true });

    console.log('Claim signature', tx);
  });

  it('BasicClose', async () => {
    await mintToAccount(provider, mint, basicVault, amount, provider.publicKey);

    const recipient = await createTokenAccount(provider, mint, provider.publicKey);

    console.log('Basic close');
    const tx = await program.methods.close()
      .accounts({
        authority: provider.publicKey,
        state: basicState.publicKey,
        vault: basicVault,
        recipient,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc({ skipPreflight: true });

    console.log('Close signature', tx);
  });

  const passwordState = anchor.web3.Keypair.generate();
  const passwordVerifierState = anchor.web3.Keypair.generate();
  const [passwordVault, _passwordBump] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from(anchor.utils.bytes.utf8.encode('Vault')),
      passwordState.publicKey.toBuffer(),
    ],
    program.programId,
  );

  const passwordVerifier = new PublicKey('EmsREpwoUtHnmg8aSCqmTFyfp71vnnFCdZozohcrZPeL');
  const passwordVerifierInstruction = [133, 161, 141, 48, 120, 198, 88, 150];
  const PASSWORD = 'PASSWORD';

  it('PasswordConfigure', async () => {
    mint = await createMint(provider, provider.publicKey);

    console.log('Password configure');
    const tx = await program.methods.configure(
      passwordVerifierInstruction,
    )
      .accounts({
        payer: provider.publicKey,
        state: passwordState.publicKey,
        verifierProgram: passwordVerifier,
        vault: passwordVault,
        mint,
        verifierState: passwordVerifierState.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([passwordState])
      .rpc({ skipPreflight: true });

    console.log('Config signature', tx);

    console.log('Password init');
    const tx2 = await passwordVerifierProgram.methods.init(
      PASSWORD,
    )
      .accounts({
        authority: provider.publicKey,
        verificationState: passwordVerifierState.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([passwordVerifierState])
      .rpc({ skipPreflight: true });

    console.log('Password init', tx2);
  });

  it('PasswordClaim', async () => {
    await mintToAccount(provider, mint, passwordVault, amount, provider.publicKey);

    const recipient = await createTokenAccount(provider, mint, provider.publicKey);

    console.log('Password claim');
    const verifierData = Buffer.from(PASSWORD);
    const tx = await program.methods.claim(
      amount,
      verifierData,
    )
      .accounts({
        authority: provider.publicKey,
        state: passwordState.publicKey,
        vault: passwordVault,
        recipient,
        verifierProgram: passwordVerifier,
        verifierState: passwordVerifierState.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc({ skipPreflight: true });

    console.log('Claim signature', tx);
  });

  const merkleVerifier = new PublicKey('4ibGmfZ6WU9qDc231sTRsTTHoDjQ1L6wxkrEAiEvKfLm');
  const merkleVerifierInstruction = [133, 161, 141, 48, 120, 198, 88, 150];
  const merkleVerifierStateKeypair = anchor.web3.Keypair.generate();

  const merkleState = anchor.web3.Keypair.generate();
  const [merkleVault, _merkleBump] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from(anchor.utils.bytes.utf8.encode('Vault')),
      merkleState.publicKey.toBuffer(),
    ],
    program.programId,
  );
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

  it('MerkleConfigure', async () => {
    console.log('Merkle configure');
    const tx = await merkleVerifierProgram.methods.init(
      toBytes32Array(tree.getRoot()),
    )
      .accounts({
        payer: provider.publicKey,
        state: merkleVerifierStateKeypair.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([merkleVerifierStateKeypair])
      .rpc({ skipPreflight: true });
    console.log('Merkle init', tx);

    const tx2 = await program.methods.configure(
      merkleVerifierInstruction,
    )
      .accounts({
        payer: provider.publicKey,
        state: merkleState.publicKey,
        verifierProgram: merkleVerifier,
        vault: merkleVault,
        mint,
        verifierState: merkleVerifierStateKeypair.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([merkleState])
      .rpc({ skipPreflight: true });

    console.log('Merkle config signature', tx2);
  });

  it('MerkleClaim', async () => {
    await mintToAccount(provider, mint, merkleVault, amount, provider.publicKey);

    const recipient = await createTokenAccount(provider, mint, kpTwo.publicKey);

    const index = 1;
    const proofStrings: Buffer[] = tree.getProof(index, kpTwo.publicKey, claimAmountTwo);
    const proofBytes: number[][] = proofStrings.map((p) => toBytes32Array(p));

    let verificationData: Buffer = Buffer.allocUnsafe(8);
    verificationData.writeBigUInt64LE(BigInt(index));

    const [receipt, _receiptBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('Receipt')),
        merkleVerifierStateKeypair.publicKey.toBuffer(),
        verificationData,
      ],
      merkleVerifierProgram.programId,
    );

    for (const proofElem of proofBytes) {
      verificationData = Buffer.concat([verificationData, Buffer.from(proofElem)]);
    }

    console.log('Merkle claim');
    const tx = await program.methods.claim(
      claimAmountTwo,
      verificationData,
    )
      .accounts({
        authority: provider.publicKey,
        state: merkleState.publicKey,
        vault: merkleVault,
        recipient,
        verifierProgram: merkleVerifier,
        verifierState: merkleVerifierStateKeypair.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .remainingAccounts([
        {
          pubkey: receipt,
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: anchor.web3.SystemProgram.programId,
          isWritable: false,
          isSigner: false,
        },
      ])
      .rpc({ skipPreflight: true });

    console.log('Merkle claim signature', tx);
  });

  it('AnotherMerkleClaim', async () => {
    const recipient = await createTokenAccount(provider, mint, kpThree.publicKey);

    const index = 2;
    const proofStrings: Buffer[] = tree.getProof(index, kpThree.publicKey, claimAmountThree);
    const proofBytes: number[][] = proofStrings.map((p) => toBytes32Array(p));

    let verificationData: Buffer = Buffer.allocUnsafe(8);
    verificationData.writeBigUInt64LE(BigInt(index));

    const [receipt, _receiptBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('Receipt')),
        merkleVerifierStateKeypair.publicKey.toBuffer(),
        verificationData,
      ],
      merkleVerifierProgram.programId,
    );

    for (const proofElem of proofBytes) {
      verificationData = Buffer.concat([verificationData, Buffer.from(proofElem)]);
    }

    console.log('Merkle claim');
    const tx = await program.methods.claim(
      claimAmountThree,
      verificationData,
    )
      .accounts({
        authority: provider.publicKey,
        state: merkleState.publicKey,
        vault: merkleVault,
        recipient,
        verifierProgram: merkleVerifier,
        verifierState: merkleVerifierStateKeypair.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .remainingAccounts([
        {
          pubkey: receipt,
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: anchor.web3.SystemProgram.programId,
          isWritable: false,
          isSigner: false,
        },
      ])
      .rpc({ skipPreflight: true });

    console.log('Merkle claim signature', tx);
  });

  it('MerkleReclaimFail', async () => {
    const recipient = await createTokenAccount(provider, mint, kpThree.publicKey);

    const index = 2;
    const proofStrings: Buffer[] = tree.getProof(index, kpThree.publicKey, claimAmountThree);
    const proofBytes: number[][] = proofStrings.map((p) => toBytes32Array(p));

    let verificationData: Buffer = Buffer.allocUnsafe(8);
    verificationData.writeBigUInt64LE(BigInt(index));

    const [receipt, _receiptBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('Receipt')),
        merkleVerifierStateKeypair.publicKey.toBuffer(),
        verificationData,
      ],
      merkleVerifierProgram.programId,
    );

    for (const proofElem of proofBytes) {
      verificationData = Buffer.concat([verificationData, Buffer.from(proofElem)]);
    }

    try {
      console.log('Merkle claim');
      await program.methods.claim(
        claimAmountThree,
        verificationData,
      )
        .accounts({
          authority: provider.publicKey,
          state: merkleState.publicKey,
          vault: merkleVault,
          recipient,
          verifierProgram: merkleVerifier,
          verifierState: merkleVerifierStateKeypair.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .remainingAccounts([
          {
            pubkey: receipt,
            isWritable: true,
            isSigner: false,
          },
          {
            pubkey: anchor.web3.SystemProgram.programId,
            isWritable: false,
            isSigner: false,
          },
        ])
        .rpc({ skipPreflight: true });
      assert(false);
    } catch (err) {
      assert(true);
    }
  });
});
