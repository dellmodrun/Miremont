import * as anchor from "@coral-xyz/anchor";
import { Buffer } from "buffer";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";

globalThis.Buffer ||= Buffer;

const PROGRAM_ID = new PublicKey("HB1DSzqQFLRPAabjSoFGG7tbkNGya27enKfuAsXJND88");
const LOCAL_TASK = new PublicKey("8Ec68HgeCowqdmbV4m6m6bX2ToZFmHM6sJRhtyJPm8vQ");
const isLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
const connection = new Connection(isLocal ? `${window.location.origin}/api/solana` : "https://api.mainnet-beta.solana.com", "confirmed");

let idlPromise;
function loadIdl() {
  idlPromise ||= fetch("/assets/miremont_protocol.json").then((response) => {
    if (!response.ok) throw new Error("Protocol IDL is unavailable.");
    return response.json();
  });
  return idlPromise;
}

function walletAdapter(provider) {
  return {
    get publicKey() { return provider.publicKey; },
    signTransaction: (transaction) => provider.signTransaction(transaction),
    signAllTransactions: async (transactions) => {
      if (provider.signAllTransactions) return provider.signAllTransactions(transactions);
      const signed = [];
      for (const transaction of transactions) signed.push(await provider.signTransaction(transaction));
      return signed;
    },
  };
}

async function programFor(provider) {
  if (!provider?.publicKey || !provider?.signTransaction) throw new Error("Connect a compatible Solana wallet first.");
  const idl = await loadIdl();
  return new anchor.Program(idl, new anchor.AnchorProvider(connection, walletAdapter(provider), { commitment: "confirmed" }));
}

async function readProgram() {
  const idl = await loadIdl();
  const readOnlyWallet = {
    publicKey: PublicKey.default,
    signTransaction: async () => { throw new Error("Read only"); },
    signAllTransactions: async () => { throw new Error("Read only"); },
  };
  return new anchor.Program(idl, new anchor.AnchorProvider(connection, readOnlyWallet, { commitment: "confirmed" }));
}

function le64(value) {
  return new anchor.BN(value.toString()).toArrayLike(Buffer, "le", 8);
}

async function hashText(value) {
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)))];
}

async function protocolStatus() {
  if (!isLocal) return { ready: false, network: "mainnet-beta", reason: "Official token CA and mainnet program deployment are pending." };
  const program = await readProgram();
  const [config] = PublicKey.findProgramAddressSync([Buffer.from("config")], PROGRAM_ID);
  try {
    const account = await program.account.protocolConfig.fetch(config);
    return { ready: true, network: "localnet", mint: account.mint.toBase58(), program: PROGRAM_ID.toBase58(), task: LOCAL_TASK.toBase58() };
  } catch {
    return { ready: false, network: "localnet", reason: "Local validator or protocol account is unavailable." };
  }
}

function publicAccount(row) {
  return { address: row.publicKey.toBase58(), ...row.account };
}

async function listTasks() {
  if (!isLocal) return [];
  const program = await readProgram();
  return (await program.account.taskContract.all()).map(publicAccount);
}

async function listProjects() {
  if (!isLocal) return [];
  const program = await readProgram();
  return (await program.account.project.all()).map(publicAccount);
}

async function listCursors() {
  if (!isLocal) return [];
  const program = await readProgram();
  return (await program.account.cursorAccount.all()).map(publicAccount);
}

async function fetchCursor(address) {
  const program = await readProgram();
  const account = await program.account.cursorAccount.fetch(new PublicKey(address));
  return { address, ...account };
}

async function treasuryStatus() {
  const program = await readProgram();
  const [treasury] = PublicKey.findProgramAddressSync([Buffer.from("treasury")], PROGRAM_ID);
  const account = await program.account.treasury.fetch(treasury);
  const epochs = await program.account.epoch.all();
  return { treasury: treasury.toBase58(), account, epochs: epochs.map(publicAccount) };
}

async function registerProject(provider, artifactRoot, reviewPolicy) {
  if (!isLocal) throw new Error("Mainnet activation is waiting for the official token CA.");
  const program = await programFor(provider);
  const authority = provider.publicKey;
  const projectId = BigInt(Date.now());
  const [config] = PublicKey.findProgramAddressSync([Buffer.from("config")], PROGRAM_ID);
  const [project] = PublicKey.findProgramAddressSync(
    [Buffer.from("project"), authority.toBuffer(), le64(projectId)],
    PROGRAM_ID,
  );
  const signature = await program.methods
    .registerProject(new anchor.BN(projectId.toString()), await hashText(artifactRoot), await hashText(reviewPolicy))
    .accounts({ authority, config, project, systemProgram: SystemProgram.programId })
    .rpc();
  return { signature, project: project.toBase58(), projectId: projectId.toString() };
}

async function publishTask(provider, values) {
  if (!isLocal) throw new Error("Mainnet activation is waiting for the official token CA.");
  const program = await programFor(provider);
  const publisher = provider.publicKey;
  const project = new PublicKey(values.project);
  const taskId = BigInt(Date.now());
  const [task] = PublicKey.findProgramAddressSync([Buffer.from("task"), project.toBuffer(), le64(taskId)], PROGRAM_ID);
  const signature = await program.methods
    .publishTask(
      new anchor.BN(taskId.toString()),
      await hashText(values.scope),
      await hashText(values.destination),
      Number(values.role),
      Number(values.difficulty),
      Number(values.basePoints),
      new anchor.BN(Number(values.leaseSeconds || 259200)),
      Number(values.maxCursors || 10),
    )
    .accounts({ publisher, project, task, systemProgram: SystemProgram.programId })
    .rpc();
  return { signature, task: task.toBase58(), taskId: taskId.toString() };
}

async function submitBuild(provider, cursorAddress, output) {
  const program = await programFor(provider);
  const cursor = new PublicKey(cursorAddress);
  const signature = await program.methods
    .submitBuild(await hashText(output))
    .accounts({ owner: provider.publicKey, cursor })
    .rpc();
  return { signature, cursor: cursor.toBase58() };
}

async function reviewBuild(provider, cursorAddress, approve, qualityTier, evidence) {
  const program = await programFor(provider);
  const cursor = new PublicKey(cursorAddress);
  const reviewer = provider.publicKey;
  const [review] = PublicKey.findProgramAddressSync([Buffer.from("review"), cursor.toBuffer(), reviewer.toBuffer()], PROGRAM_ID);
  const signature = await program.methods
    .reviewBuild(Boolean(approve), Number(qualityTier), await hashText(evidence))
    .accounts({ reviewer, cursor, review, systemProgram: SystemProgram.programId })
    .rpc();
  return { signature, review: review.toBase58() };
}

async function challengeBuild(provider, cursorAddress, evidence) {
  const program = await programFor(provider);
  const cursor = new PublicKey(cursorAddress);
  const [challenge] = PublicKey.findProgramAddressSync([Buffer.from("challenge"), cursor.toBuffer()], PROGRAM_ID);
  const signature = await program.methods
    .challengeBuild(await hashText(evidence))
    .accounts({ challenger: provider.publicKey, cursor, challenge, systemProgram: SystemProgram.programId })
    .rpc();
  return { signature, challenge: challenge.toBase58() };
}

async function resolveChallenge(provider, cursorAddress, uphold) {
  const program = await programFor(provider);
  const cursor = new PublicKey(cursorAddress);
  const [config] = PublicKey.findProgramAddressSync([Buffer.from("config")], PROGRAM_ID);
  const [challenge] = PublicKey.findProgramAddressSync([Buffer.from("challenge"), cursor.toBuffer()], PROGRAM_ID);
  const signature = await program.methods
    .resolveChallenge(Boolean(uphold))
    .accounts({ verifier: provider.publicKey, config, cursor, challenge })
    .rpc();
  return { signature };
}

async function ensureCurrentEpoch(program, payer) {
  const [config] = PublicKey.findProgramAddressSync([Buffer.from("config")], PROGRAM_ID);
  const protocol = await program.account.protocolConfig.fetch(config);
  const epochId = BigInt(Math.floor(Date.now() / 1000 / Number(protocol.epochSeconds.toString())));
  const [epoch] = PublicKey.findProgramAddressSync([Buffer.from("epoch"), le64(epochId)], PROGRAM_ID);
  try {
    await program.account.epoch.fetch(epoch);
  } catch {
    await program.methods
      .openEpoch(new anchor.BN(epochId.toString()))
      .accounts({ payer, config, epoch, systemProgram: SystemProgram.programId })
      .rpc();
  }
  return { config, epoch, epochId };
}

async function finalizeBuild(provider, cursorAddress) {
  const program = await programFor(provider);
  const cursor = new PublicKey(cursorAddress);
  const cursorState = await program.account.cursorAccount.fetch(cursor);
  const { config, epoch, epochId } = await ensureCurrentEpoch(program, provider.publicKey);
  const signature = await program.methods
    .finalizeBuild()
    .accounts({ config, task: cursorState.task, cursor, epoch })
    .rpc();
  return { signature, epoch: epoch.toBase58(), epochId: epochId.toString() };
}

async function depositFees(provider, solAmount) {
  const program = await programFor(provider);
  const [treasury] = PublicKey.findProgramAddressSync([Buffer.from("treasury")], PROGRAM_ID);
  const lamports = BigInt(Math.round(Number(solAmount) * 1_000_000_000));
  if (lamports <= 0n) throw new Error("Enter a positive SOL amount.");
  const signature = await program.methods
    .depositFees(new anchor.BN(lamports.toString()))
    .accounts({ depositor: provider.publicKey, treasury, systemProgram: SystemProgram.programId })
    .rpc();
  return { signature, lamports: lamports.toString() };
}

async function settleEpoch(provider, epochValue) {
  const program = await programFor(provider);
  const epochId = BigInt(epochValue);
  const [treasury] = PublicKey.findProgramAddressSync([Buffer.from("treasury")], PROGRAM_ID);
  const [epoch] = PublicKey.findProgramAddressSync([Buffer.from("epoch"), le64(epochId)], PROGRAM_ID);
  const signature = await program.methods.settleEpoch().accounts({ treasury, epoch }).rpc();
  return { signature, epoch: epoch.toBase58() };
}

async function claimBuilderReward(provider, cursorAddress) {
  const program = await programFor(provider);
  const owner = provider.publicKey;
  const cursor = new PublicKey(cursorAddress);
  const cursorState = await program.account.cursorAccount.fetch(cursor);
  const epochId = BigInt(cursorState.epochId.toString());
  const [treasury] = PublicKey.findProgramAddressSync([Buffer.from("treasury")], PROGRAM_ID);
  const [epoch] = PublicKey.findProgramAddressSync([Buffer.from("epoch"), le64(epochId)], PROGRAM_ID);
  const [claim] = PublicKey.findProgramAddressSync([Buffer.from("builder_claim"), epoch.toBuffer(), cursor.toBuffer()], PROGRAM_ID);
  const signature = await program.methods
    .claimBuilderReward()
    .accounts({ owner, treasury, epoch, cursor, claim, systemProgram: SystemProgram.programId })
    .rpc();
  return { signature, claim: claim.toBase58() };
}

async function spawnCursor(provider, taskAddress = LOCAL_TASK.toBase58()) {
  if (!isLocal) throw new Error("Mainnet activation is waiting for the official token CA.");
  const program = await programFor(provider);
  const builder = provider.publicKey;
  const task = new PublicKey(taskAddress);
  const [config] = PublicKey.findProgramAddressSync([Buffer.from("config")], PROGRAM_ID);
  const protocol = await program.account.protocolConfig.fetch(config);
  const mint = protocol.mint;
  const builderTokenAccount = await getAssociatedTokenAddress(mint, builder);
  const nonce = BigInt(Date.now());
  const [cursor] = PublicKey.findProgramAddressSync(
    [Buffer.from("cursor"), task.toBuffer(), builder.toBuffer(), le64(nonce)],
    PROGRAM_ID,
  );
  const supply = await connection.getTokenSupply(mint, "confirmed");
  const burnAmount = (BigInt(supply.value.amount) + 99_999n) / 100_000n;
  const signature = await program.methods
    .burnAndSpawn(new anchor.BN(nonce.toString()))
    .accounts({
      builder,
      config,
      mint,
      builderTokenAccount,
      task,
      cursor,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  return { signature, cursor: cursor.toBase58(), burnAmount: burnAmount.toString() };
}

async function fundLocalDemo(address) {
  if (!isLocal) throw new Error("Demo funding is available only on localhost.");
  const response = await fetch("/api/demo-fund", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ address }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Demo funding failed.");
  return result;
}

window.MiremontProtocol = { isLocal, protocolStatus, listTasks, listProjects, listCursors, fetchCursor, treasuryStatus, registerProject, publishTask, spawnCursor, submitBuild, reviewBuild, challengeBuild, resolveChallenge, finalizeBuild, depositFees, settleEpoch, claimBuilderReward, fundLocalDemo };
