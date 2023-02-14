import * as anchor from "@coral-xyz/anchor";
import { Program, Provider } from "@project-serum/anchor";
import { PasswordVerifier } from "../target/types/password_verifier";

describe("password_verifier", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const provider: Provider = anchor.AnchorProvider.env();
  const program = anchor.workspace.PasswordVerifier as Program<PasswordVerifier>;
  const passwordVerifierState = anchor.web3.Keypair.generate();
  const PASSWORD = 'PASSWORD';

  it("Verify", async () => {
    console.log("Password init");
    const tx = await program.methods.init(
      PASSWORD 
    )
    .accounts({
      authority: provider.publicKey,
      verificationState: passwordVerifierState.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    })
    .signers([passwordVerifierState])
    .rpc({ skipPreflight: true});
    console.log("Init signature", tx);

    const tx2 = await program.methods.verify(
        new anchor.BN(1_000_000),
        Buffer.from(PASSWORD)
    )
    .accounts({
        authority: provider.publicKey,
        verificationState: passwordVerifierState.publicKey,
        unusedRecipient: provider.publicKey,
      })
    .rpc();
    console.log("Verifiaction signature", tx2);
  });
});
