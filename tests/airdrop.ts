import * as anchor from "@coral-xyz/anchor";
import { Provider, Program } from "@coral-xyz/anchor";
import { Airdrop } from "../target/types/airdrop";
import { PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { createMint, createTokenAccount, mintToAccount } from "./utils/utils";

describe("airdrop", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider: Provider = anchor.AnchorProvider.env();
  const program = anchor.workspace.Airdrop as Program<Airdrop>;

  const basicState = anchor.web3.Keypair.generate();
  const basicVerifierState = anchor.web3.Keypair.generate();
  let mint: PublicKey;
  let [basicVault, _bump] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from(anchor.utils.bytes.utf8.encode("Vault")),
      basicState.publicKey.toBuffer(),
    ],
    program.programId,
  );

  const amount = new anchor.BN(1_000_000);
  const basicVerifier = new PublicKey('FEdxZUg4BtWvMy7gy7pXEoj1isqBRYmbYdpyZfq5QZYr');

  // TODO: Programmatically figure out the instruction data.
  const basicVerifierInstruction = [133, 161, 141, 48, 120, 198, 88, 150];

  it("Configure", async () => {
    mint = await createMint(provider, provider.publicKey);

    const tx = await program.methods.configure(
      basicVerifierInstruction
    )
    .accounts({
      payer: provider.publicKey,
      state: basicState.publicKey,
      verifierProgram: basicVerifier,
      vault: basicVault,
      mint: mint,
      verifierState: basicVerifierState.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    })
    .signers([basicState])
    .rpc({ skipPreflight: true});

    console.log("Config signature", tx);
  });

  it("Claim", async () => {
    await mintToAccount(provider, mint, basicVault, amount, provider.publicKey);

    const recipient = await createTokenAccount(provider, mint, provider.publicKey);

    console.log("Making claim");
    const verifierData = Buffer.from("Optional payload data");
    const tx = await program.methods.claim(
      amount,
      verifierData
    )
    .accounts({
      authority: provider.publicKey,
      state: basicState.publicKey,
      vault: basicVault,
      recipient: recipient,
      verifierProgram: basicVerifier,
      verifierState: basicVerifierState.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc({ skipPreflight: true});

    console.log("Claim signature", tx);
  });
});
