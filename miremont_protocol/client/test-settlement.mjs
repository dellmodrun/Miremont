import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const idl = JSON.parse(fs.readFileSync(path.join(here, "..", "target", "idl", "miremont_protocol.json"), "utf8"));
const lifecycle = JSON.parse(fs.readFileSync(path.join(here, "..", "target", "lifecycle-result.json"), "utf8"));
const payerBytes = JSON.parse(fs.readFileSync(path.join(here, "..", "target", "test-payer.json"), "utf8"));
const payer = Keypair.fromSecretKey(Uint8Array.from(payerBytes));
const connection = new Connection("http://127.0.0.1:8899", "confirmed");
const program = new anchor.Program(idl, new anchor.AnchorProvider(connection, new anchor.Wallet(payer), { commitment: "confirmed" }));
const programId = new PublicKey(idl.address);
const treasury = new PublicKey(lifecycle.treasury);
const epoch = new PublicKey(lifecycle.epoch);
const cursor = new PublicKey(lifecycle.cursor);

await program.methods.settleEpoch().accounts({ treasury, epoch }).rpc();

let epochState = await program.account.epoch.fetch(epoch);
assert.equal(epochState.settled, true);
assert.equal(epochState.builderPool.toString(), "700000000");
assert.equal(epochState.reviewerPool.toString(), "150000000");

const [claim] = PublicKey.findProgramAddressSync(
  [Buffer.from("builder_claim"), epoch.toBuffer(), cursor.toBuffer()],
  programId,
);
await program.methods
  .claimBuilderReward()
  .accounts({ owner: payer.publicKey, treasury, epoch, cursor, claim, systemProgram: SystemProgram.programId })
  .rpc();

const claimState = await program.account.rewardClaim.fetch(claim);
const treasuryState = await program.account.treasury.fetch(treasury);
assert.equal(claimState.amount.toString(), "700000000");
assert.equal(treasuryState.totalAllocated.toString(), "1000000000");
assert.equal(treasuryState.totalClaimed.toString(), "700000000");
assert.equal(treasuryState.operationsAccrued.toString(), "100000000");
assert.equal(treasuryState.reserveAccrued.toString(), "50000000");

const result = {
  ok: true,
  epoch: epoch.toBase58(),
  settled: epochState.settled,
  builderPool: epochState.builderPool.toString(),
  reviewerPool: epochState.reviewerPool.toString(),
  builderClaim: claim.toBase58(),
  claimedLamports: claimState.amount.toString(),
  operationsAccrued: treasuryState.operationsAccrued.toString(),
  reserveAccrued: treasuryState.reserveAccrued.toString(),
};
fs.writeFileSync(path.join(here, "..", "target", "settlement-result.json"), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
