# Miremont

Miremont turns a verified token burn into one task-bound Cursor. The repository contains the public website, an Anchor/Solana program, a browser transaction client and a local end-to-end test environment.

## Verified locally

- Wallet connection for Phantom, Solflare and Backpack
- Project registration and immutable task publication
- Supply-relative token burn (`0.001%`) and Cursor creation
- Build submission, three-account review quorum, challenge and verifier resolution
- Daily epochs, deterministic points, SOL deposits, settlement and wallet-bound claims
- Direct-RPC Tasks, Projects, Live, Build Log, Treasury, Cursor Inspector and wallet workspace

Program ID: `HB1DSzqQFLRPAabjSoFGG7tbkNGya27enKfuAsXJND88`

The official token CA is published. Mainnet transactions remain blocked until the program deployment is funded and the protocol is initialized against that mint. Localnet uses an isolated test mint and test SOL only.

## Run

Double-click `scripts/start-local.ps1`, or run it from PowerShell. It starts the existing local validator ledger and the frontend at `http://127.0.0.1:4328/`.

The program keypair, local payer and generated target files are ignored by Git. The public browser IDL lives at `assets/miremont_protocol.json`.

## Protocol source

The Anchor workspace is in `miremont_protocol/`. Its local chain test is `miremont_protocol/client/test-local.mjs`.
