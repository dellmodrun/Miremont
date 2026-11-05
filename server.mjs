import { createServer } from 'node:http';
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { extname, isAbsolute, join, normalize, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import web3 from './miremont_protocol/client/node_modules/@solana/web3.js/lib/index.cjs.js';
import {
  createAssociatedTokenAccountIdempotent,
  mintTo,
} from './miremont_protocol/client/node_modules/@solana/spl-token/lib/esm/index.js';

const { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } = web3;

const root = fileURLToPath(new URL('.', import.meta.url));
const host = '127.0.0.1';
const port = Number(process.env.PORT || 4328);
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

const localRpc = new Connection('http://127.0.0.1:8899', 'confirmed');
const testPayerPath = join(root, 'miremont_protocol', 'target', 'test-payer.json');
const localConfigPath = join(root, 'miremont_protocol', 'target', 'local-config.json');

function json(response, status, body) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 2048) throw new Error('Request is too large.');
  }
  return JSON.parse(body || '{}');
}

async function fundDemoWallet(request, response) {
  if (request.method !== 'POST') return json(response, 405, { error: 'Method not allowed.' });
  try {
    const { address } = await readJson(request);
    const owner = new PublicKey(address);
    if (!existsSync(testPayerPath)) throw new Error('Local test payer is unavailable.');
    if (!existsSync(localConfigPath)) throw new Error('Local protocol configuration is unavailable.');
    const payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(testPayerPath, 'utf8'))));
    const localMint = new PublicKey(JSON.parse(readFileSync(localConfigPath, 'utf8')).mint);
    const airdrop = await localRpc.requestAirdrop(owner, 5 * LAMPORTS_PER_SOL);
    const latest = await localRpc.getLatestBlockhash('confirmed');
    await localRpc.confirmTransaction({ signature: airdrop, ...latest }, 'confirmed');
    const tokenAccount = await createAssociatedTokenAccountIdempotent(localRpc, payer, localMint, owner);
    await mintTo(localRpc, payer, localMint, tokenAccount, payer, 1_000_000_000_000_000n);
    return json(response, 200, { ok: true, sol: 5, tokens: 1_000_000, tokenAccount: tokenAccount.toBase58() });
  } catch (error) {
    return json(response, 400, { error: error?.message || 'Demo funding failed.' });
  }
}

async function proxySolana(request, response) {
  if (request.method !== 'POST') return json(response, 405, { error: 'Method not allowed.' });
  try {
    let body = '';
    for await (const chunk of request) {
      body += chunk;
      if (body.length > 1_000_000) throw new Error('RPC request is too large.');
    }
    const upstream = await fetch('http://127.0.0.1:8899', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
    });
    const payload = await upstream.text();
    response.writeHead(upstream.status, {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    });
    return response.end(payload);
  } catch (error) {
    return json(response, 502, { error: error?.message || 'Local Solana RPC is unavailable.' });
  }
}

function resolveFile(pathname) {
  const clean = normalize(decodeURIComponent(pathname)).replace(/^[/\\]+/, '');
  let candidate = resolve(root, clean || 'index.html');
  const rel = relative(root, candidate);
  if (rel.startsWith('..') || isAbsolute(rel)) return null;
  if (existsSync(candidate) && statSync(candidate).isDirectory()) candidate = join(candidate, 'index.html');
  if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  return resolve(root, 'index.html');
}

createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || `${host}:${port}`}`);
  if (url.pathname === '/api/demo-fund') return fundDemoWallet(request, response);
  if (url.pathname === '/api/solana') return proxySolana(request, response);
  const file = resolveFile(url.pathname);
  if (!file) {
    response.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
    return response.end('Forbidden');
  }
  response.writeHead(200, {
    'content-type': mime[extname(file).toLowerCase()] || 'application/octet-stream',
    'cache-control': 'no-cache',
    'x-content-type-options': 'nosniff',
  });
  if (request.method === 'HEAD') return response.end();
  createReadStream(file).pipe(response);
}).listen(port, host, () => {
  console.log(`miremont local frontend: http://${host}:${port}/`);
});
