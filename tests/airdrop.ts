import * as anchor from '@coral-xyz/anchor';
import assert from 'assert';
import { Provider, Program } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Idl } from '@project-serum/anchor';
import { Airdrop } from '../target/types/airdrop';
import {
  createMint, createTokenAccount, mintToAccount, toBytes32Array,
} from './utils/utils';
import { PasswordVerifier } from '../target/types/password_verifier';
import { MerkleVerifier } from '../target/types/merkle_verifier';
// @ts-ignore
import * as governance_verifier_idl from './governance_verifier.json';
import { BalanceTree } from './utils/balance_tree';

describe('airdrop', () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider: Provider = anchor.AnchorProvider.env();
  const program = anchor.workspace.Airdrop as Program<Airdrop>;
  const passwordVerifierProgram = anchor.workspace.PasswordVerifier as Program<PasswordVerifier>;
  const merkleVerifierProgram = anchor.workspace.MerkleVerifier as Program<MerkleVerifier>;
  const governanceVerifierProgram = new Program(governance_verifier_idl as Idl, new PublicKey('ATCsJvzSbHaJj3a9uKTRHSoD8ZmWPfeC3sYxzcJJHTM5'), provider);
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
    const basicConfigureTx = await program.methods.configure(
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

    console.log('Config signature', basicConfigureTx);
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
    const passwordConfigureTx = await program.methods.configure(
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

    console.log('Config signature', passwordConfigureTx);

    console.log('Password init');
    const passwordInitTx = await passwordVerifierProgram.methods.init(
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

    console.log('Password init', passwordInitTx);
  });

  it('PasswordClaim', async () => {
    await mintToAccount(provider, mint, passwordVault, amount, provider.publicKey);

    const recipient = await createTokenAccount(provider, mint, provider.publicKey);

    console.log('Password claim');
    const verifierData = Buffer.from(PASSWORD);
    const passwordClaimTx = await program.methods.claim(
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

    console.log('Claim signature', passwordClaimTx);
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
    const merkleInitTx = await merkleVerifierProgram.methods.init(
      toBytes32Array(tree.getRoot()),
    )
      .accounts({
        payer: provider.publicKey,
        state: merkleVerifierStateKeypair.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([merkleVerifierStateKeypair])
      .rpc({ skipPreflight: true });
    console.log('Merkle init', merkleInitTx);

    const merkleConfigureTx = await program.methods.configure(
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

    console.log('Merkle config signature', merkleConfigureTx);
  });

  it('MerkleClaim', async () => {
    await mintToAccount(provider, mint, merkleVault, amount, provider.publicKey);

    const claimer = kpTwo.publicKey;
    const claimAmount = claimAmountTwo;
    const index = 1;

    const recipient = await createTokenAccount(provider, mint, claimer);

    const proofStrings: Buffer[] = tree.getProof(index, claimer, claimAmount);
    const proofBytes: number[][] = proofStrings.map((p) => toBytes32Array(p));

    let verificationData: Buffer = Buffer.allocUnsafe(8);
    verificationData.writeBigUInt64LE(BigInt(index));

    // Calculate the receipt here because the verification data conveniently is
    // a buffer with just index.
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
    const merkleClaimTx = await program.methods.claim(
      claimAmount,
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

    console.log('Merkle claim signature', merkleClaimTx);
  });

  it('AnotherMerkleClaim', async () => {
    const claimer = kpThree.publicKey;
    const claimAmount = claimAmountThree;
    const index = 2;

    const recipient = await createTokenAccount(provider, mint, claimer);
    const proofStrings: Buffer[] = tree.getProof(index, claimer, claimAmount);
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
    const merkleClaimTx = await program.methods.claim(
      claimAmount,
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

    console.log('Merkle claim signature', merkleClaimTx);
  });

  it('MerkleReclaimFail', async () => {
    const claimer = kpThree.publicKey;
    const claimAmount = claimAmountThree;
    const index = 2;

    const recipient = await createTokenAccount(provider, mint, claimer);
    const proofStrings: Buffer[] = tree.getProof(index, claimer, claimAmount);
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
        claimAmount,
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

  it('MerkleClaimWrongAmount', async () => {
    const claimer = kpOne.publicKey;
    const claimAmount = claimAmountOne;
    const index = 0;

    const recipient = await createTokenAccount(provider, mint, claimer);
    const proofStrings: Buffer[] = tree.getProof(index, claimer, claimAmount);
    const proofBytes: number[][] = proofStrings.map((p) => toBytes32Array(p));

    let verificationData: Buffer = Buffer.allocUnsafe(8);
    verificationData.writeBigUInt64LE(BigInt(index));

    // Calculate the receipt here because the verification data conveniently is
    // a buffer with just index.
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
      console.log('Merkle claim wrong amount');
      await program.methods.claim(
        new anchor.BN(1_000_000),
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

  const governanceVerifier = new PublicKey('ATCsJvzSbHaJj3a9uKTRHSoD8ZmWPfeC3sYxzcJJHTM5');
  const governanceVerifierInstruction = [133, 161, 141, 48, 120, 198, 88, 150];

  it('GovernanceClaim', async () => {
    const eligibilityStart = new anchor.BN(0);
    const eligibilityEnd = new anchor.BN(2_000_000_000);

    const stateKeypair = anchor.web3.Keypair.generate();
    const governanceStateKeypair = anchor.web3.Keypair.generate();
    const proposal = new PublicKey(
      '6ws4bv5CefMwVXi54fMc6c7VU1RrT3QxYYeGzQMiVp4Z',
    );
    const voteRecord = new PublicKey(
      'BsGL7UwBT9ojUTMgtYh6foZrbWVnJvBBpsprdjkswVA1',
    );
    const governance = new PublicKey(
      'Dg31swH4qLRzqgFsDZb3eME1QvwgAXnzA1Awtwgh3oc4',
    );
    const governanceRecipient = new PublicKey(
      '2qLWeNrV7QkHQvKBoEvXrKeLqEB2ZhscZd4ds7X2JUhn',
    );
    const [governanceVault, _governanceBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('Vault')),
        stateKeypair.publicKey.toBuffer(),
      ],
      program.programId,
    );

    console.log('Configuring');
    const configureTx = await governanceVerifierProgram.methods
      .configure(amount, eligibilityStart, eligibilityEnd)
      .accounts({
        payer: provider.publicKey,
        state: governanceStateKeypair.publicKey,
        governance,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([governanceStateKeypair])
      .rpc({ skipPreflight: true });

    console.log('Configure signature', configureTx);

    const governanceConfigureTx = await program.methods.configure(
      governanceVerifierInstruction,
    )
      .accounts({
        payer: provider.publicKey,
        state: stateKeypair.publicKey,
        verifierProgram: governanceVerifier,
        vault: governanceVault,
        mint,
        verifierState: governanceStateKeypair.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([stateKeypair])
      .rpc({ skipPreflight: true });

    console.log('Governance config signature', governanceConfigureTx);

    await mintToAccount(provider, mint, governanceVault, amount, provider.publicKey);
    const recipient = await createTokenAccount(provider, mint, governanceRecipient);

    try {
      const [receipt, _receiptBump] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from(anchor.utils.bytes.utf8.encode('Receipt')),
          governanceStateKeypair.publicKey.toBuffer(),
          voteRecord.toBuffer(),
        ],
        governanceVerifierProgram.programId,
      );
      const governanceClaimTx = await program.methods.claim(
        amount,
        Buffer.alloc(0),
      )
        .accounts({
          authority: provider.publicKey,
          state: stateKeypair.publicKey,
          vault: governanceVault,
          recipient,
          verifierProgram: governanceVerifier,
          verifierState: governanceStateKeypair.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .remainingAccounts([
          {
            pubkey: governance,
            isWritable: true,
            isSigner: false,
          },
          {
            pubkey: proposal,
            isWritable: true,
            isSigner: false,
          },
          {
            pubkey: voteRecord,
            isWritable: true,
            isSigner: false,
          },
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
      console.log('Governance claim signature', governanceClaimTx);
    } catch (err) {
      console.log(err);
      assert(false);
    }
  });
});
