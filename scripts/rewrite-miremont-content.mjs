import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const bundlePath = fileURLToPath(new URL('../assets/index-BcWSe1v5.js', import.meta.url));
const htmlPath = fileURLToPath(new URL('../index.html', import.meta.url));
let bundle = readFileSync(bundlePath, 'utf8');

function replace(oldText, newText, expected = 1) {
  const variants = [oldText, oldText.replaceAll('\n', '\r\n')];
  let found = 0;
  for (const variant of new Set(variants)) {
    const count = bundle.split(variant).length - 1;
    if (count) {
      bundle = bundle.replaceAll(variant, newText);
      found += count;
    }
  }
  if (found !== expected) throw new Error(`Expected ${expected} match(es), found ${found}: ${oldText}`);
}

replace('p("nav0",540,46,"Product",R.nav),c("nav",["nav0"],[{dx:96,dy:0,edits:["Agents"]},{dx:192,dy:0,edits:["Docs"]},{dx:288,dy:0,edits:["Pricing"]}])',
  'p("nav0",540,46,"Mechanism",R.nav),c("nav",["nav0"],[{dx:96,dy:0,edits:["Cursors"]},{dx:192,dy:0,edits:["Build log"]},{dx:288,dy:0,edits:["Rewards"]}])');
replace('"Get access"', '"Connect wallet"');
replace('Run a thousand\nagents as one.', 'Burn tokens.\nSpawn a Cursor.');
replace('miremont schedules, routes and supervises AI agents across your stack, and runs their work in parallel.',
  'Burn Miremont tokens to spawn a Cursor. Each Cursor completes one verified build task and can earn SOL creator rewards.');
replace('"Start building"', '"Spawn a Cursor"', 2);
replace('"Read the docs"', '"View build log"');
replace('"swarm.dispatch(task)"', '"miremont.spawn(cursor)"');
replace('"orchestrator · 18 tasks queued"', '"burn confirmed · 18 tasks queued"');
replace('"agent/research"', '"cursor/research"');
replace('"agent/writer"', '"cursor/writer"');
replace('"agent/review"', '"cursor/review"');
replace('"agent/deploy"', '"cursor/deploy"');
replace('"● 12 replicas"', '"● 12 active"');
replace('"● 4 replicas"', '"● 4 active"');
replace('"● 2 replicas"', '"● 2 verifying"');
replace('"○ waiting"', '"○ queued"');
replace('"4 agents · 18 tasks in flight · 0 conflicts"', '"4 Cursors · 18 tasks building · 0 conflicts"');
replace('"Used by teams at"', '"Built on Solana with"');
replace('"Northwind"', '"Solana"');
replace('["Halcyon","Parallax","Meridian","Kestrel"]', '["SPL Token","Pump.fun","Build Vault","Build Receipts"]');

replace('Built for running agents\nin production.', 'Built for verifiable\nonchain construction.');
replace('Routing, memory, supervision, fan-out, tracing and guardrails all come with the orchestrator.',
  'Burning, task routing, verification, receipts and builder rewards are coordinated in one transparent workflow.');
replace('"Smart routing"', '"Burn to spawn"');
replace('Send every task to the agent best equipped for it, based on skills, cost and live load.',
  'Every verified token burn creates one active Cursor with one build task to complete.');
replace('"Shared memory"', '"Shared context"');
replace('Agents read and write one consistent context, so nobody does the same work twice.',
  'Every Cursor works from the same project state, preventing duplicated or conflicting work.');
replace('"Supervisors"', '"Verification"');
replace('Retry, escalate or hand off automatically when an agent gets stuck or drifts.',
  'Tests and reviewers decide whether a contribution becomes an accepted Build Receipt.');
replace('"Fan-out, fan-in"', '"Parallel building"');
replace('Split big jobs across hundreds of workers and merge the results deterministically.',
  'Large builds split across many Cursors and merge back into one coherent result.');
replace('"Live traces"', '"Onchain receipts"');
replace('Watch every decision as it happens, with replays down to a single tool call.',
  'Wallet, burn, task, verification and reward status remain visible for every build.');
replace('"Guardrails"', '"Builder rewards"');
replace('Budgets, approvals and policies that every agent in the swarm respects by default.',
  'Accepted contributions share the SOL creator fees accumulated in the Builder Vault.');

replace('One file describes\nthe whole swarm.', 'One receipt records\nevery contribution.');
replace('One declarative file sets your agents, how work is routed between them, and what they’re allowed to spend. Review it in a pull request like any other code.',
  'Each Build Receipt records the builder wallet, token burn, Cursor role, task output, verification result and reward status.');
replace('"Read the spec"', '"Read the protocol"');
replace('"swarm.yaml"', '"build-receipt.yaml"', 2);
replace('"# swarm.yaml"', '"# build receipt"');
replace('"swarm: launch-week"', '"protocol: miremont"');
replace('"agents:"', '"builder:"');
replace('"  research: { model: fast, replicas: 12 }"', '"  wallet: 7Kx...4Qp"');
replace('"  writer:   { model: smart, replicas: 4 }"', '"  burn: confirmed"');
replace('"  reviewer: { model: smart, replicas: 2 }"', '"cursor:"');
replace('"routing:"', '"  role: research"');
replace('"  strategy: skills-first"', '"  task: landing-page"');
replace('"  fallback: reviewer"', '"verification:"');
replace('"budget:"', '"  status: accepted"');
replace('"  max_spend: $40/day"', '"reward:"');
replace('"  on_exceed: pause"', '"  asset: SOL"');

replace('p("st-n",ue+36,1960,"10k+",R.stat,{snap:"g-stats"}),p("st-l",ue+36,2028,"agents in a single swarm",R.body,{w:220,snap:"g-stats-x"}),c("stats",["st-n","st-l"],[{dx:280,dy:0,edits:["38ms","median agent-to-agent handoff"]},{dx:560,dy:0,edits:["99.99%","orchestrator uptime, last 12 months"]},{dx:840,dy:0,edits:["0","tasks dropped last quarter"]}])',
  'p("st-n",ue+36,1960,"1",R.stat,{snap:"g-stats"}),p("st-l",ue+36,2028,"build task per active Cursor",R.body,{w:220,snap:"g-stats-x"}),c("stats",["st-n","st-l"],[{dx:280,dy:0,edits:["100%","token burns verifiable onchain"]},{dx:560,dy:0,edits:["24h","builder reward cycle"]},{dx:840,dy:0,edits:["0","rewards for rejected work"]}])');
replace('How a task moves\nthrough miremont.', 'How a build moves\nthrough miremont.');
replace('"Define"', '"Burn"');
replace('Declare agents, skills and budgets in one file, versioned right next to your code.',
  'Sign one token burn to create a wallet-linked Cursor and unlock one build task.');
replace('"Dispatch"', '"Build"');
replace('miremont fans tasks out to the best agents and keeps every handoff ordered and observable.',
  'Your Cursor joins the swarm, claims a role and contributes to the shared project state.');
replace('"Converge"', '"Verify"');
replace('Results stream back, get checked by supervisors, and land as one coherent change.',
  'Tests and reviewers accept the result, issue a Build Receipt and assign reward points.');

replace('Priced by the size\nof your swarm.', 'Creator fees flow\nback to builders.');
replace('Every plan includes the full orchestrator. You only pay more when your swarm gets bigger.',
  'Creator fees enter the Builder Vault and are distributed in SOL to accepted Build Receipts.');
replace('"Hive"', '"Cursor"');
replace('"$0"', '"1 burn unit"');
replace('"free forever"', '"per build task"');
replace('For tinkering with your first swarm on a weekend.', 'Burn Miremont tokens to create one wallet-linked Cursor.');
replace('Up to 10 agents', 'One active task');
replace('Community support', 'Onchain burn record');
replace('7-day trace history', 'Persistent Cursor identity');
replace('"Start free"', '"Spawn Cursor"');
replace('"Colony"', '"Build Receipt"');
replace('"$49"', '"Verified"');
replace('"per month, billed monthly"', '"tests + review"');
replace('For teams running agents in production, every day.', 'Complete a real task and submit its result for verification.');
replace('Up to 500 agents', 'Output hash recorded');
replace('Shared memory + supervisors', 'Accepted work only');
replace('30-day trace history', 'Contribution points');
replace('"Get Colony"', '"View tasks"');
replace('},{dx:710,dy:0,edits:["miremont",', '},{dx:710,dy:0,edits:["Builder Reward",');
{
  const pattern = /(\},\{dx:710,dy:0,edits:\["Builder Reward",")[^"]+("\s*,"annual contract")/;
  if (!pattern.test(bundle)) throw new Error('Third reward card price was not found.');
  bundle = bundle.replace(pattern, '$1SOL$2');
}
replace('"annual contract"', '"from creator fees"');
replace('For fleets that never sleep and never stop shipping.', 'Accepted receipts share the creator fees held in the Builder Vault.');
replace('Unlimited agents', 'Transparent reward cycle');
replace('SSO, audit logs, VPC', 'Permissionless claims');
replace('Dedicated orchestrator', 'Verifiable distribution');
replace('"Contact sales"', '"View vault"');

replace('Let the swarm\nbuild it.', 'Burn. Build.\nEarn together.');
replace('Start with ten agents for free. Scale to ten thousand when you’re ready.',
  'Connect a Solana wallet, burn one unit and send a Cursor into the next build.');
replace('This page was built by ${e()} agents while you scrolled.',
  'This page was assembled by ${e()} Cursors while you scrolled.');
replace('Every line, guide and word above was placed by a cursor working alongside the others.',
  'In Miremont, each Cursor can represent one wallet-funded, verifiable contribution.');
replace('"© 2026 miremont Labs, Inc."', '"© 2026 Miremont · Built on Solana"');
replace('p("fc-h",560,3738,"Product",he(14.5,600,1.4,O.ink),{snap:"g-foot"}),p("fc-1",560,3772,"Agents",R.item,{snap:"g-foot"}),p("fc-2",560,3802,"Routing",R.item),p("fc-3",560,3832,"Pricing",R.item),c("fcols",["fc-h","fc-1","fc-2","fc-3"],[{dx:200,dy:0,edits:["Company","About","Careers","Blog"]},{dx:400,dy:0,edits:["Developers","Docs","API reference","Status"]}])',
  'p("fc-h",560,3738,"Protocol",he(14.5,600,1.4,O.ink),{snap:"g-foot"}),p("fc-1",560,3772,"Cursors",R.item,{snap:"g-foot"}),p("fc-2",560,3802,"Build log",R.item),p("fc-3",560,3832,"Rewards",R.item),c("fcols",["fc-h","fc-1","fc-2","fc-3"],[{dx:200,dy:0,edits:["Mechanism","Burning","Verification","Treasury"]},{dx:400,dy:0,edits:["Developers","Docs","Build receipts","Status"]}])');

writeFileSync(bundlePath, bundle);

let html = readFileSync(htmlPath, 'utf8');
html = html.replace('<title>miremont: orchestrate thousands of agents</title>', '<title>miremont: burn to build on Solana</title>');
writeFileSync(htmlPath, html);

console.log('Miremont content rewrite complete.');
