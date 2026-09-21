#!/usr/bin/env node
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import assert from 'node:assert/strict';
const exec=promisify(execFile);
const version='0.2.0-preview.0';
const here=fileURLToPath(import.meta.url);
const command=process.argv[2]||'help';
const output=data=>process.stdout.write(JSON.stringify(data,null,2)+'\n');
async function doctor(){
 let rg=false;try{await exec('rg',['--version'],{timeout:3000,maxBuffer:4000});rg=true;}catch{}
 const major=Number(process.versions.node.split('.')[0]);
 const minor=Number(process.versions.node.split('.')[1]);
 const checks={macos:process.platform==='darwin',supported_node:(major===22&&minor>=22)||major===24};
 return {product:'Ganado Bridge',version,platform:process.platform,architecture:process.arch,node:process.version,checks,search:{builtin:true,ripgrep_available:rg,required_external_install:false},ready:Object.values(checks).every(Boolean),public_chatgpt_connection:false,permission_note:'Runs as the existing OS user. Not a sandbox.'};
}
async function selftest(){
 const {Client}=await import('@modelcontextprotocol/sdk/client/index.js');
 const {StdioClientTransport}=await import('@modelcontextprotocol/sdk/client/stdio.js');
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'bridge-agent-evaluation-'));
 const client=new Client({name:'bridge-local-selftest',version:'1.0.0'});
 const transport=new StdioClientTransport({command:process.execPath,args:[here,'serve','--allow-local-access'],env:{PATH:process.env.PATH,HOME:root,BRIDGE_AGENT_AUDIT:'off'},stderr:'pipe'});
 const checks=[];
 const call=async(name,args={})=>{const result=await client.callTool({name,arguments:args});if(result.isError)throw new Error('Tool failed: '+name);return JSON.parse(result.content[0].text);};
 try{
  await client.connect(transport);
  const {tools}=await client.listTools();assert.equal(tools.length,13);assert.ok(!tools.some(t=>t.name==='ops_health'));checks.push('13 tools; no private operations tool');
  const identity=await call('system_info');assert.deepEqual(identity.configured_ssh_targets,[]);checks.push('no default remote hosts');
  for(const name of ['process_start','process_input']){const annotations=tools.find(t=>t.name===name).annotations;assert.equal(annotations.readOnlyHint,false);assert.equal(annotations.destructiveHint,true);assert.equal(annotations.openWorldHint,true);}checks.push('execution annotations are truthful');
  const file=path.join(root,'fixture.txt');await call('write_file',{file,content:'BRIDGE_BEFORE',expected_sha256:null});
  const read=await call('read_file',{file});assert.equal(read.data,'BRIDGE_BEFORE');
  await call('edit_file',{file,expected_sha256:read.sha256,old_text:'BRIDGE_BEFORE',new_text:'BRIDGE_AFTER'});
  const after=await call('read_file',{file});assert.equal(after.data,'BRIDGE_AFTER');checks.push('create/read/edit/read real MCP round trip');
  const stale=await client.callTool({name:'write_file',arguments:{file,content:'WRONG',expected_sha256:read.sha256}});assert.equal(stale.isError,true);assert.equal(await fs.readFile(file,'utf8'),'BRIDGE_AFTER');checks.push('stale write rejected');
  const freshConflict=await client.callTool({name:'write_file',arguments:{file,content:'WRONG',expected_sha256:null}});assert.equal(freshConflict.isError,true);checks.push('new-file overwrite rejected');
  const remote=await client.callTool({name:'process_start',arguments:{command:'printf NEVER',target:'unconfigured-evaluation-host'}});assert.equal(remote.isError,true);checks.push('unconfigured remote target rejected');
  const job=await call('process_start',{command:'sleep 0.05; printf BRIDGE_PROCESS_OK',cwd:root,wait_ms:0,timeout_ms:5000});
  let done;for(let i=0;i<20;i++){done=await call('process_read',{session_id:job.session_id,wait_ms:250});if(done.state==='exited')break;}
  assert.equal(done.state,'exited');assert.equal(done.exit_code,0);assert.equal(done.output,'BRIDGE_PROCESS_OK');checks.push('independent process calls and actual zero exit');
  return {product:'Ganado Bridge',version,passed:true,checks,scope:'Local synthetic test only. Not a ChatGPT directory or independent-machine acceptance.'};
 }finally{await client.close().catch(()=>{});await fs.rm(root,{recursive:true,force:true});}
}
try{
 if(command==='doctor'){const report=await doctor();output(report);if(!report.ready)process.exitCode=1;}
 else if(command==='selftest')output(await selftest());
 else if(command==='config')output({mcpServers:{'ganado-bridge':{command:process.execPath,args:[here,'serve','--allow-local-access']}}});
 else if(command==='connect'){const {connectRelay}=await import('../src/relay-client.mjs');await connectRelay();}
 else if(command==='disconnect'){const {disconnectRelay}=await import('../src/relay-client.mjs');const r=await disconnectRelay();output(r);}
 else if(command==='serve'){const {serve}=await import('../src/main.mjs');await serve();}
 else if(command==='--version'||command==='version')process.stdout.write('Ganado Bridge '+version+'\n');
 else if(command==='help'||command==='--help')process.stdout.write('Ganado Bridge — free local evaluation preview\n\nCommands: connect, disconnect, doctor, selftest, config, serve --allow-local-access, version\n\n13 MCP tools for owner-authorized file and terminal work.\nManaged relay client included; public ChatGPT listing is not yet approved. No default SSH target, paid subscription or startup service.\nRead README.md and the security model before enabling local access.\n');
 else throw new Error('Unknown command. Run with --help.');
}catch(error){process.stderr.write('Bridge: '+String(error.message).slice(0,400)+'\n');process.exitCode=1;}
