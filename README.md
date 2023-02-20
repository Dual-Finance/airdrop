# Airdrop

This tool helps make airdrops easier. The DAO or whoever wants to issue the airdrop needs to
configure the airdrop, provide a verifier, and then anyone can call Claim in order to receive the
funds from the airdrop


# Programs

The main program is airdrop, but there are additional verifiers provided as examples

## airdrop

Main program. Three instructions are configure, claim, and close. Examples of
how to use them are in the tests.

## basic

This example verifier does not use the verification state, the verification data
passed in, the amount requested, or the recipient. It always approves. This is
the simplest example for testing.

## password

This example verifier uses the verification data and verification state to make
sure that the password provided passes verification. This demonstrates using the
input data and a state for the verifier.

## merkle

This example program verifies the amount as well as the recipient in addition to
the verification state and data. It also uses one of the remaining_accounts to
verify that the recipient only is not able to repeat a claim. This is likely how
projects will want to do an airdrop if they have a predetermined list of
recipients and amounts.

Modification of [merkle-distributor](https://github.com/saber-hq/merkle-distributor)

# Design
[Design doc](https://docs.google.com/document/d/1SYqRHrPhmiA2M0D2P7GGkqKktOQJX-3xw4BvMMr6Se8)