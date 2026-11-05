import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const idl = JSON.parse(fs.readFileSync(path.join(here, "..", "target", "idl", "miremont_protocol.json"), "utf8"));
const local = JSON.parse(fs.readFileSync(path.join(here, "..", "target", "local-config.json"), "utf8"));
const payerBytes = JSON.parse(fs.readFileSync(path.join(here, "..", "target", "test-payer.json"), "utf8"));
const payer = Keypair.fromSecretKey(Uint8Array.from(payerBytes));
const connection = new Connection("http://127.0.0.1:8899", "confirmed");
const programId = new PublicKey(idl.address);
const cursor = new PublicKey(local.cursor);
const hash = (value) => Array(32).fill(value);
const le64 = (value) => new anchor.BN(value.toString()).toArrayLike(Buffer, "le", 8);

function programFor(signer) {
  const wallet = new anchor.Wallet(signer);
  return new anchor.Program(idl, new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" }));
}

async function fund(signer) {
  const signature = await connection.requestAirdrop(signer.publicKey, 2 * LAMPORTS_PER_SOL);
  const latest = await connection.getLatestBlockhash("confirmed");
  await connection.confirmTransaction({ signature, ...latest }, "confirmed");
}

const ownerProgram = programFor(payer);
const reviewers = [Keypair.generate(), Keypair.generate(), Keypair.generate()];
await Promise.all(reviewers.map(fund));

for (let index = 0; index < reviewers.length; index += 1) {
  const reviewer = reviewers[index];
  const reviewProgram = programFor(reviewer);
  const [review] = PublicKey.findProgramAddressSync(
    [Buffer.from("review"), cursor.toBuffer(), reviewer.publicKey.toBuffer()],
    programId,
  );
  await reviewProgram.methods
    .reviewBuild(true, index === 1 ? 2 : 1, hash(20 + index))
    .accounts({ reviewer: reviewer.publicKey, cursor, review, systemProgram: SystemProgram.programId })
    .rpc();
}

let cursorState = await ownerProgram.account.cursorAccount.fetch(cursor);
assert.ok("pendingChallenge" in cursorState.status);
assert.equal(cursorState.approvals, 3);

const challenger = reviewers[0];
const challengeProgram = programFor(challenger);
const [challenge] = PublicKey.findProgramAddressSync([Buffer.from("challenge"), cursor.toBuffer()], programId);
await challengeProgram.methods
  .challengeBuild(hash(31))
  .accounts({ challenger: challenger.publicKey, cursor, challenge, systemProgram: SystemProgram.programId })
  .rpc();

const [config] = PublicKey.findProgramAddressSync([Buffer.from("config")], programId);
await ownerProgram.methods
  .resolveChallenge(false)
  .accounts({ verifier: payer.publicKey, config, cursor, challenge })
  .rpc();

const protocol = await ownerProgram.account.protocolConfig.fetch(config);
const epochId = BigInt(Math.floor(Date.now() / 1000 / Number(protocol.epochSeconds.toString())));
const [epoch] = PublicKey.findProgramAddressSync([Buffer.from("epoch"), le64(epochId)], programId);
await ownerProgram.methods
  .openEpoch(new anchor.BN(epochId.toString()))
  .accounts({ payer: payer.publicKey, config, epoch, systemProgram: SystemProgram.programId })
  .rpc();

cursorState = await ownerProgram.account.cursorAccount.fetch(cursor);
await ownerProgram.methods
  .finalizeBuild()
  .accounts({ config, task: cursorState.task, cursor, epoch })
  .rpc();

const [treasury] = PublicKey.findProgramAddressSync([Buffer.from("treasury")], programId);
await ownerProgram.methods
  .depositFees(new anchor.BN(LAMPORTS_PER_SOL))
  .accounts({ depositor: payer.publicKey, treasury, systemProgram: SystemProgram.programId })
  .rpc();

cursorState = await ownerProgram.account.cursorAccount.fetch(cursor);
const epochState = await ownerProgram.account.epoch.fetch(epoch);
const treasuryState = await ownerProgram.account.treasury.fetch(treasury);
assert.ok("finalized" in cursorState.status);
assert.equal(cursorState.points.toString(), "200");
assert.equal(epochState.totalBuilderPoints.toString(), "200");
assert.equal(epochState.totalReviewUnits.toString(), "3");
assert.equal(treasuryState.totalDeposited.toString(), String(LAMPORTS_PER_SOL));

const result = {
  ok: true,
  cursor: cursor.toBase58(),
  status: "finalized",
  approvals: cursorState.approvals,
  points: cursorState.points.toString(),
  epoch: epoch.toBase58(),
  epochId: epochId.toString(),
  epochBuilderPoints: epochState.totalBuilderPoints.toString(),
  epochReviewUnits: epochState.totalReviewUnits.toString(),
  treasury: treasury.toBase58(),
  depositedLamports: treasuryState.totalDeposited.toString(),
};
fs.writeFileSync(path.join(here, "..", "target", "lifecycle-result.json"), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
