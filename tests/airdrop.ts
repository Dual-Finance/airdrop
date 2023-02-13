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
  const state = anchor.web3.Keypair.generate();
  const verifierState = anchor.web3.Keypair.generate();
  let mint: PublicKey;
  let [vault, _bump] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from(anchor.utils.bytes.utf8.encode("Vault")),
      state.publicKey.toBuffer(),
    ],
    program.programId,
  );

  const amount = new anchor.BN(1_000_000);
  const basicVerifier = new PublicKey('FEdxZUg4BtWvMy7gy7pXEoj1isqBRYmbYdpyZfq5QZYr');

  it("Configure", async () => {

    mint = await createMint(provider, provider.publicKey);

    // TODO: Programmatically figure out the instruction data.
    const tx = await program.methods.configure(
      [133, 161, 141, 48, 120, 198, 88, 150]
    )
    .accounts({
      payer: provider.publicKey,
      state: state.publicKey,
      verifierProgram: basicVerifier,
      vault: vault,
      mint: mint,
      verifierState: verifierState.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    })
    .signers([state])
    .rpc({ skipPreflight: true});

    console.log("Config signature", tx);
  });

  it("Claim", async () => {
    await mintToAccount(provider, mint, vault, amount, provider.publicKey);

    const recipient = await createTokenAccount(provider, mint, provider.publicKey);

    console.log("Making claim");
    const verifierData = Buffer.from("Optional payload data");
    const tx = await program.methods.claim(
      amount,
      verifierData
    )
    .accounts({
      authority: provider.publicKey,
      state: state.publicKey,
      vault: vault,
      recipient: recipient,
      verifierProgram: basicVerifier,
      verifierState: verifierState.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc({ skipPreflight: true});

    console.log("Claim signature", tx);
  });
});
