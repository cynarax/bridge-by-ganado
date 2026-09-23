import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const read=n=>fs.readFileSync(path.join(root,n),'utf8');

test('README identifies Mac users, the Czech operator and both real connection routes',()=>{
 const s=read('README.md');
 for(const phrase of ['Let ChatGPT work on your Mac.','Ganado international s.r.o.','19322119','Developer Mode','0.2.0-preview.0','not approved or published']) assert.ok(s.includes(phrase),phrase);
 assert.doesNotMatch(s,/future managed connection remains an interest list|€19|€29/);
});
test('installation no longer denies the existing hosted preview',()=>{
 const s=read('INSTALL.md');
 for(const phrase of ['Route A: ChatGPT','Route B: a local','shasum -a 256 -c SHA256SUMS','node bin/bridge.mjs disconnect','not a notarized'])assert.ok(s.includes(phrase),phrase);
 assert.doesNotMatch(s,/No hosted relay or public ChatGPT connection is included/);
});
test('security discloses the actual relay, privileges and privacy limits',()=>{
 const s=read('SECURITY.md');
 for(const phrase of ['not a sandbox','public HTTPS MCP endpoint','not zero-knowledge','does not undo','info@ganado.cz'])assert.ok(s.includes(phrase),phrase);
 assert.doesNotMatch(s,/website does not expose an MCP command endpoint/);
});
test('a complete MIT licence is included for source users and future package builds',()=>{
 assert.equal(read('agent/LICENSE'),read('LICENSE'));
 const p=JSON.parse(read('agent/package.json'));
 assert.equal(p.license,'MIT');assert.ok(p.files.includes('LICENSE'));
 assert.match(read('scripts/build-preview.mjs'),/'EVALUATION.md','LICENSE'/);
});
test('local documentation links resolve, including agent licence links',()=>{
 const files=['README.md','INSTALL.md','SECURITY.md','ROADMAP.md','SUPPORT.md','CONTRIBUTING.md','RELEASE_STATUS.md','agent/EVALUATION.md'];
 for(const file of files)for(const m of read(file).matchAll(/\]\(([^)]+)\)/g)){
  const link=m[1].split('#')[0];if(!link||/^(https?:|mailto:)/.test(link))continue;
  assert.ok(fs.existsSync(path.resolve(root,path.dirname(file),decodeURIComponent(link))),file+': '+link);
 }
});
test('container recipe is local stdio, unprivileged and contains no identity or host mounts',()=>{
 const s=read('Dockerfile');assert.match(s,/USER node/);assert.match(s,/npm ci --ignore-scripts/);assert.match(s,/"serve", "--allow-local-access"/);
 assert.doesNotMatch(s,/\.ssh|\.env|relay\.json|"connect"|EXPOSE|docker\.sock/);
 assert.match(read('.dockerignore'),/^\*\*/);
});
test('source contribution and bug routes do not solicit credentials',()=>{
 assert.match(read('CONTRIBUTING.md'),/npm ci --ignore-scripts/);
 assert.match(read('.github/ISSUE_TEMPLATE/bug.yml'),/Never post pairing codes/);
 assert.match(read('.gitignore'),/relay\.json/);
});
test('release checksum and version were not replaced by documentation work',()=>{
 assert.match(read('SHA256SUMS'),/ce45aed48044e6f926658da621bb763b6dc898ec36a81001d7654cdcd9fd0429/);
 assert.equal(JSON.parse(read('agent/package.json')).version,'0.2.0-preview.0');
});
