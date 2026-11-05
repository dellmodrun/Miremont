import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
const output = new URL('../dist/', import.meta.url);
const prefix = '/Miremont';
const pages = ['account', 'build-log', 'cursor', 'cursors', 'docs', 'live', 'mechanism', 'projects', 'rewards', 'tasks'];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(new URL('../assets/', import.meta.url), new URL('../dist/assets/', import.meta.url), { recursive: true });

const rewriteHtml = source => source
  .replaceAll('href="/', `href="${prefix}/`)
  .replaceAll('src="/', `src="${prefix}/`);

const home = await readFile(new URL('../index.html', import.meta.url), 'utf8');
await writeFile(new URL('../dist/index.html', import.meta.url), rewriteHtml(home));

for (const page of pages) {
  const pageOutput = new URL(`../dist/${page}/`, import.meta.url);
  await mkdir(pageOutput, { recursive: true });
  const html = await readFile(new URL(`../${page}/index.html`, import.meta.url), 'utf8');
  await writeFile(new URL('index.html', pageOutput), rewriteHtml(html));
}

const sitePath = new URL('../dist/assets/site.js', import.meta.url);
let site = await readFile(sitePath, 'utf8');
site = site
  .replaceAll("': '/'", `': '${prefix}/'`)
  .replaceAll(": '/", `: '${prefix}/`)
  .replaceAll("go('/", `go('${prefix}/`)
  .replaceAll('href="/account/', `href="${prefix}/account/`)
  .replaceAll('href="/cursors/', `href="${prefix}/cursors/`);
await writeFile(sitePath, site);

const clientPath = new URL('../dist/assets/protocol-client.js', import.meta.url);
let client = await readFile(clientPath, 'utf8');
client = client.replaceAll('fetch("/assets/', `fetch("${prefix}/assets/`);
await writeFile(clientPath, client);

await writeFile(new URL('../dist/.nojekyll', import.meta.url), '');

