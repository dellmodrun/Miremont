import { readFile, writeFile } from 'node:fs/promises';

const ca = process.argv[2];
if (!ca || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(ca)) {
  throw new Error('Pass a valid Solana mint address.');
}

const bundlePath = new URL('../assets/index-BcWSe1v5.js', import.meta.url);
let bundle = await readFile(bundlePath, 'utf8');
bundle = bundle.replace(
  /c\("ca-value",132,592,"[^"]+",lt\(\d+,O\.ink,500\)/,
  `c("ca-value",132,592,"${ca}",lt(10,O.ink,500)`,
);
bundle = bundle.replace('"CA WILL APPEAR HERE"', '"OFFICIAL CA"');

if (!bundle.includes(`c("ca-value",132,592,"${ca}"`)) {
  throw new Error('Homepage CA field was not updated.');
}

await writeFile(bundlePath, bundle);
console.log(`Homepage CA set to ${ca}`);
