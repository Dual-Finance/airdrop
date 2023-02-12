import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { Airdrop } from "../target/types/airdrop";

describe("airdrop", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Airdrop as Program<Airdrop>;

  it("Is initialized!", async () => {
    // Add your test here.
    // const tx = await program.methods.configure().rpc();
    // console.log("Your transaction signature", tx);
  });
});
