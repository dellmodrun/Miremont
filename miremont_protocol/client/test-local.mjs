import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as anchor from "@coral-xyz/anchor";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const idl = JSON.parse(fs.readFileSync(path.join(here, "..", "target", "idl", "miremont_protocol.json"), "utf8"));
const payerBytes = JSON.parse(fs.readFileSync(path.join(here, "..", "target", "test-payer.json"), "utf8"));
const payer = Keypair.fromSecretKey(Uint8Array.from(payerBytes));
const connection = new Connection("http://127.0.0.1:8899", "confirmed");
const wallet = new anchor.Wallet(payer);
const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
const program = new anchor.Program(idl, provider);
const programId = new PublicKey(idl.address);
const u64 = (value) => new anchor.BN(value);
const le64 = (value) => u64(value).toArrayLike(Buffer, "le", 8);
const hash = (value) => Array(32).fill(value);

const mint = await createMint(connection, payer, payer.publicKey, null, 9);
const builderTokens = await getOrCreateAssociatedTokenAccount(connection, payer, mint, payer.publicKey);
await mintTo(connection, payer, mint, builderTokens.address, payer, 1_000_000_000_000_000n);

const [config] = PublicKey.findProgramAddressSync([Buffer.from("config")], programId);
const [treasury] = PublicKey.findProgramAddressSync([Buffer.from("treasury")], programId);

await program.methods
  .initializeProtocol({
    verifierAuthority: payer.publicKey,
    operationsWallet: payer.publicKey,
    reserveWallet: payer.publicKey,
  })
  .accounts({ authority: payer.publicKey, mint, config, treasury, systemProgram: SystemProgram.programId })
  .rpc();

const protocol = await program.account.protocolConfig.fetch(config);
assert.equal(protocol.authority.toBase58(), payer.publicKey.toBase58());
assert.equal(protocol.mint.toBase58(), mint.toBase58());
assert.equal(protocol.burnDenominator.toString(), "100000");

const projectId = 1;
const [project] = PublicKey.findProgramAddressSync(
  [Buffer.from("project"), payer.publicKey.toBuffer(), le64(projectId)],
  programId,
);
await program.methods
  .registerProject(u64(projectId), hash(1), hash(2))
  .accounts({ authority: payer.publicKey, config, project, systemProgram: SystemProgram.programId })
  .rpc();

const taskId = 1;
const [task] = PublicKey.findProgramAddressSync([Buffer.from("task"), project.toBuffer(), le64(taskId)], programId);
await program.methods
  .publishTask(u64(taskId), hash(3), hash(4), 1, 2, 100, u64(3600), 10)
  .accounts({ publisher: payer.publicKey, project, task, systemProgram: SystemProgram.programId })
  .rpc();

const nonce = 1;
const [cursor] = PublicKey.findProgramAddressSync(
  [Buffer.from("cursor"), task.toBuffer(), payer.publicKey.toBuffer(), le64(nonce)],
  programId,
);
await program.methods
  .burnAndSpawn(u64(nonce))
  .accounts({
    builder: payer.publicKey,
    config,
    mint,
    builderTokenAccount: builderTokens.address,
    task,
    cursor,
    tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  })
  .rpc();

let cursorState = await program.account.cursorAccount.fetch(cursor);
assert.equal(cursorState.owner.toBase58(), payer.publicKey.toBase58());
assert.equal(cursorState.burnAmount.toString(), "10000000000");
assert.ok("active" in cursorState.status);

await program.methods
  .submitBuild(hash(9))
  .accounts({ owner: payer.publicKey, cursor })
  .rpc();

cursorState = await program.account.cursorAccount.fetch(cursor);
assert.ok("submitted" in cursorState.status);
assert.deepEqual(cursorState.outputHash, hash(9));

const result = {
  ok: true,
  program: programId.toBase58(),
  mint: mint.toBase58(),
  config: config.toBase58(),
  treasury: treasury.toBase58(),
  project: project.toBase58(),
  task: task.toBase58(),
  cursor: cursor.toBase58(),
  burnAmount: cursorState.burnAmount.toString(),
};
fs.writeFileSync(path.join(here, "..", "target", "local-config.json"), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
