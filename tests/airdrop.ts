import * as anchor from "@coral-xyz/anchor";
import { Provider, Program } from "@coral-xyz/anchor";
import { Airdrop } from "../target/types/airdrop";
import { PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { createMint, createTokenAccount, mintToAccount } from "./utils/utils";
import { PasswordVerifier } from "../target/types/password_verifier";

describe("airdrop", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider: Provider = anchor.AnchorProvider.env();
  const program = anchor.workspace.Airdrop as Program<Airdrop>;
  const passwordVerifierProgram = anchor.workspace.PasswordVerifier as Program<PasswordVerifier>;
  const amount = new anchor.BN(1_000_000);
  let mint: PublicKey;

  const basicState = anchor.web3.Keypair.generate();
  const basicVerifierState = anchor.web3.Keypair.generate();
  let [basicVault, _bump] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from(anchor.utils.bytes.utf8.encode("Vault")),
      basicState.publicKey.toBuffer(),
    ],
    program.programId,
  );

  const basicVerifier = new PublicKey('FEdxZUg4BtWvMy7gy7pXEoj1isqBRYmbYdpyZfq5QZYr');
  // TODO: Programmatically figure out the instruction data.
  const basicVerifierInstruction = [133, 161, 141, 48, 120, 198, 88, 150];

  it("BasicConfigure", async () => {
    mint = await createMint(provider, provider.publicKey);

    console.log("Basic configure");
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

  it("BasicClaim", async () => {
    await mintToAccount(provider, mint, basicVault, amount, provider.publicKey);

    const recipient = await createTokenAccount(provider, mint, provider.publicKey);

    console.log("Basic claim");
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

  it("BasicClose", async () => {
    await mintToAccount(provider, mint, basicVault, amount, provider.publicKey);

    const recipient = await createTokenAccount(provider, mint, provider.publicKey);

    console.log("Basic close");
    const tx = await program.methods.close()
    .accounts({
      authority: provider.publicKey,
      state: basicState.publicKey,
      vault: basicVault,
      recipient: recipient,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc({ skipPreflight: true});

    console.log("Close signature", tx);
  });

  const passwordState = anchor.web3.Keypair.generate();
  const passwordVerifierState = anchor.web3.Keypair.generate();
  let [passwordVault, _passwordBump] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from(anchor.utils.bytes.utf8.encode("Vault")),
      passwordState.publicKey.toBuffer(),
    ],
    program.programId,
  );

  const passwordVerifier = new PublicKey('EmsREpwoUtHnmg8aSCqmTFyfp71vnnFCdZozohcrZPeL');
  const passwordVerifierInstruction = [133, 161, 141, 48, 120, 198, 88, 150];
  const PASSWORD = 'PASSWORD';

  it("PasswordConfigure", async () => {
    mint = await createMint(provider, provider.publicKey);

    console.log("Password configure");
    const tx = await program.methods.configure(
      passwordVerifierInstruction
    )
    .accounts({
      payer: provider.publicKey,
      state: passwordState.publicKey,
      verifierProgram: passwordVerifier,
      vault: passwordVault,
      mint: mint,
      verifierState: passwordVerifierState.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    })
    .signers([passwordState])
    .rpc({ skipPreflight: true});

    console.log("Config signature", tx);

    console.log("Password init");
    const tx2 = await passwordVerifierProgram.methods.init(
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

    console.log("Password init", tx2);
  });

  it("PasswordClaim", async () => {
    await mintToAccount(provider, mint, passwordVault, amount, provider.publicKey);

    const recipient = await createTokenAccount(provider, mint, provider.publicKey);

    console.log("Password claim");
    const verifierData = Buffer.from(PASSWORD);
    const tx = await program.methods.claim(
      amount,
      verifierData
    )
    .accounts({
      authority: provider.publicKey,
      state: passwordState.publicKey,
      vault: passwordVault,
      recipient: recipient,
      verifierProgram: passwordVerifier,
      verifierState: passwordVerifierState.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc({ skipPreflight: true});

    console.log("Claim signature", tx);
  });

});
