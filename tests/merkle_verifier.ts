import * as anchor from '@coral-xyz/anchor';
import { Program, Provider } from '@project-serum/anchor';
import { MerkleVerifier } from '../target/types/merkle_verifier';
import { BalanceTree } from './utils/balance_tree';
import { createMint, createTokenAccount, toBytes32Array } from './utils/utils';

describe('merkle_verifier', () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const provider: Provider = anchor.AnchorProvider.env();
  const program = anchor.workspace.MerkleVerifier as Program<MerkleVerifier>;
  const stateKeypair = anchor.web3.Keypair.generate();

  it('Merkly Verify', async () => {
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

    const tx = await program.methods.init(
      toBytes32Array(tree.getRoot()),
    )
      .accounts({
        payer: provider.publicKey,
        state: stateKeypair.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([stateKeypair])
      .rpc({ skipPreflight: true });

    console.log('Init signature', tx);

    const index = 1;
    const proofStrings: Buffer[] = tree.getProof(index, kpTwo.publicKey, claimAmountTwo);
    const proofBytes: number[][] = proofStrings.map((p) => toBytes32Array(p));

    let verificationData = Buffer.allocUnsafe(8);
    verificationData.writeBigUInt64LE(BigInt(index));

    const [receipt, _receiptBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('Receipt')),
        stateKeypair.publicKey.toBuffer(),
        verificationData,
      ],
      program.programId,
    );

    for (const proofElem of proofBytes) {
      verificationData = Buffer.concat([verificationData, Buffer.from(proofElem)]);
    }

    const mint = await createMint(provider, provider.publicKey);
    // Do not actually need to mint to the account because that is handled in the airdropper.
    const recipientTokenAccount = await createTokenAccount(provider, mint, kpTwo.publicKey);

    const tx2 = await program.methods.verify(
      claimAmountTwo,
      verificationData,
    )
      .accounts({
        authority: provider.publicKey,
        verificationState: stateKeypair.publicKey,
        recipient: recipientTokenAccount,
        receipt,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc({ skipPreflight: true });
    console.log('Verification signature', tx2);
  });
});
