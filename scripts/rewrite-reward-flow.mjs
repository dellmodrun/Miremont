import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const bundlePath = fileURLToPath(new URL('../assets/index-BcWSe1v5.js', import.meta.url));
let bundle = readFileSync(bundlePath, 'utf8');
const start = bundle.indexOf('const M=[a("pc"');
const end = bundle.indexOf('h("cta"', start);
if (start < 0 || end < 0 || end <= start) throw new Error('Legacy reward cards were not found.');

const rewardFlow = `const M=[a("fee-flow",116,2850,1048,398,{r:14,fill:O.card,stroke:O.line})];return p("ff-label",144,2876,"CREATOR FEE ROUTER",lt(11,O.accent,500),{deps:M,snap:"g-plan"}),p("ff-epoch",936,2876,"24H EPOCH · SOL",lt(11,O.muted,500),{w:196,align:"right",deps:M}),u("ff-rule-top",[{x:144,y:2920},{x:1136,y:2920}],{stroke:O.line,deps:M}),u("ff-sep-1",[{x:380,y:2944},{x:380,y:3134}],{stroke:O.line,deps:M}),u("ff-sep-2",[{x:640,y:2944},{x:640,y:3134}],{stroke:O.line,deps:M}),u("ff-sep-3",[{x:900,y:2944},{x:900,y:3134}],{stroke:O.line,deps:M}),p("ff-1-k",144,2952,"01 / TRADE",lt(11,O.accent,500),{deps:M}),p("ff-1-t",144,2982,"Creator fees",R.h3,{deps:M}),p("ff-1-b",144,3024,"Trading activity accumulates SOL creator fees.",R.body,{w:202,deps:M}),p("ff-2-k",404,2952,"02 / ROUTE",lt(11,O.accent,500),{deps:M}),p("ff-2-t",404,2982,"Builder Vault",R.h3,{deps:M}),p("ff-2-b",404,3024,"Fees move into one transparent reward vault.",R.body,{w:202,deps:M}),p("ff-3-k",664,2952,"03 / VERIFY",lt(11,O.accent,500),{deps:M}),p("ff-3-t",664,2982,"Build Receipts",R.h3,{deps:M}),p("ff-3-b",664,3024,"Only accepted contributions enter the epoch.",R.body,{w:202,deps:M}),p("ff-4-k",924,2952,"04 / CLAIM",lt(11,O.accent,500),{deps:M}),p("ff-4-t",924,2982,"Builders earn",R.h3,{deps:M}),p("ff-4-b",924,3024,"Verified builders claim their share in SOL.",R.body,{w:202,deps:M}),p("ff-a1",366,2982,"→",R.h3,{deps:M}),p("ff-a2",626,2982,"→",R.h3,{deps:M}),p("ff-a3",886,2982,"→",R.h3,{deps:M}),u("ff-rule-bottom",[{x:144,y:3134},{x:1136,y:3134}],{stroke:O.line,deps:M}),p("ff-formula-k",144,3160,"DISTRIBUTION RULE",lt(11,O.accent,500),{deps:M}),p("ff-formula",144,3190,"receipt points / total accepted points × epoch SOL balance",lt(14,O.ink,500),{deps:M}),p("ff-note",760,3160,"Rejected work receives zero rewards. Every payout remains verifiable.",R.small,{w:376,align:"right",deps:M}),`;

bundle = bundle.slice(0, start) + rewardFlow + bundle.slice(end);
writeFileSync(bundlePath, bundle);
console.log('Reward cards replaced with the creator-fee flow.');
