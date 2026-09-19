import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {nativeSearch} from '../src/search-native.mjs';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
const exec=promisify(execFile),bundle=path.resolve(import.meta.dirname,'../bin/bundle.mjs');
async function fixture(t){const root=await fs.mkdtemp(path.join(os.tmpdir(),'bridge-onboarding-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));return root;}
test('native literal search works without external commands',async t=>{const dir=await fixture(t);await fs.writeFile(path.join(dir,'first.txt'),'hello\nBRIDGE_LITERAL.*\n');const r=await nativeSearch({directory:dir,query:'BRIDGE_LITERAL.*'});assert.equal(r.matches.length,1);assert.equal(r.matches[0].line,2);assert.equal(r.incomplete,false);});
test('native basename glob and filenames are supported',async t=>{const dir=await fixture(t);await fs.mkdir(path.join(dir,'nested'));await fs.writeFile(path.join(dir,'nested','target.txt'),'MATCH');await fs.writeFile(path.join(dir,'target.json'),'MATCH');const r=await nativeSearch({directory:dir,query:'target',glob:'*.txt',files_only:true});assert.equal(r.matches.length,1);assert.match(r.matches[0].path,/target.txt$/);});
test('native engine skips excluded trees and symlinks',async t=>{const dir=await fixture(t);for(const name of ['node_modules','.git','.build']){await fs.mkdir(path.join(dir,name));await fs.writeFile(path.join(dir,name,'x'),'HIDDEN');}await fs.symlink(path.join(dir,'.git'),path.join(dir,'alias'));const r=await nativeSearch({directory:dir,query:'HIDDEN'});assert.equal(r.matches.length,0);assert.equal(r.incomplete,false);});
test('byte and file size budgets never claim complete absence',async t=>{const dir=await fixture(t);await fs.writeFile(path.join(dir,'large'),'x'.repeat(200)+'MATCH');const r=await nativeSearch({directory:dir,query:'MATCH'},{maxFileBytes:32});assert.equal(r.matches.length,0);assert.equal(r.incomplete,true);});
test('result budget is explicit',async t=>{const dir=await fixture(t);await fs.writeFile(path.join(dir,'many'),'MATCH\nMATCH\nMATCH');const r=await nativeSearch({directory:dir,query:'MATCH',limit:1});assert.equal(r.matches.length,1);assert.equal(r.incomplete,true);assert.ok(r.reasons.includes('result_limit'));});
test('entry budget is explicit',async t=>{const dir=await fixture(t);await fs.writeFile(path.join(dir,'one'),'');const r=await nativeSearch({directory:dir,query:'none'},{maxEntries:0});assert.equal(r.incomplete,true);});
test('binary files are not decoded as text',async t=>{const dir=await fixture(t);await fs.writeFile(path.join(dir,'binary'),Buffer.from([0,1,2]));const r=await nativeSearch({directory:dir,query:''});assert.equal(r.matches.length,0);});
for(const consent of [undefined,'false','1','TRUE'])test('bundle refuses absent or ambiguous consent '+consent,async()=>{await assert.rejects(exec(process.execPath,[bundle],{env:{PATH:'/usr/bin:/bin',HOME:os.tmpdir(),...(consent===undefined?{}:{BRIDGE_BUNDLE_LOCAL_ACCESS:consent})},timeout:5000}),e=>e.code===1&&e.stderr.includes('disabled'));});
test('consenting bundle starts real MCP with no ripgrep available',async t=>{
 const dir=await fixture(t);await fs.writeFile(path.join(dir,'marker.txt'),'BUNDLE_OK');
 const client=new Client({name:'bundle-onboarding-test',version:'1.0'});
 const transport=new StdioClientTransport({command:process.execPath,args:[bundle],env:{PATH:'/usr/bin:/bin',HOME:dir,BRIDGE_BUNDLE_LOCAL_ACCESS:'true',BRIDGE_AGENT_AUDIT:'off',BRIDGE_AGENT_SEARCH:'native'},stderr:'pipe'});
 t.after(()=>client.close());await client.connect(transport);
 const {tools}=await client.listTools();assert.equal(tools.length,13);
 const response=await client.callTool({name:'search_files',arguments:{directory:dir,query:'BUNDLE_OK',glob:'*.txt'}});
 assert.notEqual(response.isError,true);const found=JSON.parse(response.content[0].text);assert.equal(found.matches.length,1);assert.equal(found.engine,'native');
});
