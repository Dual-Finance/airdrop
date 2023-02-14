# Airdrop

This tool helps simplify airdrops by no longer relying on a set of bulk transactions. The DAO or whoever wants to issue the airdrop needs to configure the airdrop and provide a verifier. Anytime afterwards anyone can call Claim in order to receive the funds from the airdrop.


# Programs

The main program is airdrop, but there are additional verifiers provided as examples

## airdrop

Main program which conducts the airdrop of tokens. Three instructions are configure, claim, and close. Verifier states are used to allow any on-chain activity to allow users to qualify for airdrops. Example verifiers and how to use them are in the tests.

## basic_verifier

This example verifier does not use the verification state, the verification data passed in, the amount requested, or the recipient. It always approves. This is the simplest example for testing.

## password_verifier

This example verifier uses the verification data and verification state to make sure that the password provided passes verification. This demonstrates using the input data and a state for the verifier.

## merkle_distributor

This example program verifies the amount and the recipient, in addition to the verification state and data. It also uses one of the remaining_accounts to verify that the recipient only receives the airdrop once. This is likely how projects will want to do airdrops if they have a predetermined list of recipients and amounts. 
