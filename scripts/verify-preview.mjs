import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const exec=promisify(execFile);
const archive=path.resolve(process.argv[2]||'');
const metadata=JSON.parse(await fs.readFile(path.resolve(process.argv[3]||'server.json'),'utf8'));
assert.equal(metadata.name,'io.github.cynarax/bridge-by-ganado');
assert.ok(typeof metadata.description==='string' && metadata.description.length<=100,'registry description must not exceed 100 characters');
assert.equal(metadata.packages.length,1);assert.equal(metadata.packages[0].registryType,'mcpb');
const digest=createHash('sha256').update(await fs.readFile(archive)).digest('hex');assert.equal(digest,metadata.packages[0].fileSha256,'bundle SHA-256 differs from published metadata');
const {stdout:names}=await exec('unzip',['-Z1',archive],{maxBuffer:4_000_000});
for(const name of names.split('\n').filter(Boolean)){assert.ok(!name.startsWith('/')&&!name.split('/').includes('..')&&!name.includes('\\'),'unsafe archive member');assert.doesNotMatch(name,/(^|\/)(\.env(?:\..*)?|\.npmrc|runtime\.key)$/);}
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'bridge-distributed-'));let client;const checks=[];
try{
 await exec('unzip',['-q',archive,'-d',temp],{timeout:20000});checks.push('published hash and fresh extraction');
 const manifest=JSON.parse(await fs.readFile(path.join(temp,'manifest.json'),'utf8'));
 assert.equal(manifest.version,metadata.version);assert.equal(manifest.user_config.allow_local_access.default,false);
 assert.equal(manifest.server.mcp_config.command,'node');assert.deepEqual(manifest.compatibility.platforms,['darwin']);
 const wrapper=path.join(temp,manifest.server.entry_point);
 await assert.rejects(exec(process.execPath,[wrapper],{env:{PATH:'/usr/bin:/bin',HOME:temp},timeout:5000}),e=>e.code===1&&e.stderr.includes('disabled'));checks.push('disabled until explicit consent');
 const require=createRequire(path.join(temp,'package.json'));
 const {Client}=await import(require.resolve('@modelcontextprotocol/sdk/client/index.js'));
 const {StdioClientTransport}=await import(require.resolve('@modelcontextprotocol/sdk/client/stdio.js'));
 client=new Client({name:'distributed-preview-acceptance',version:'1.0.0'});
 const args=manifest.server.mcp_config.args.map(x=>x.replaceAll('${__dirname}',temp));
 const env=Object.fromEntries(Object.entries(manifest.server.mcp_config.env).map(([k,v])=>[k,v.replaceAll('${user_config.allow_local_access}','true')]));
 await client.connect(new StdioClientTransport({command:process.execPath,args,env:{PATH:'/nonexistent',HOME:temp,BRIDGE_AGENT_AUDIT:'off',...env},stderr:'pipe'}));
 const call=async(name,args={})=>{const r=await client.callTool({name,arguments:args});assert.notEqual(r.isError,true,name);return JSON.parse(r.content[0].text);};
 const {tools}=await client.listTools();assert.equal(tools.length,13);assert.ok(!tools.some(t=>t.name==='ops_health'));checks.push('manifest-resolved MCP startup with bundled dependencies');
 const identity=await call('system_info');assert.deepEqual(identity.configured_ssh_targets,[]);checks.push('no default remote host');
 const file=path.join(temp,'disposable-first-task.txt');
 await call('write_file',{file,content:'FIRST_TASK_BEFORE',expected_sha256:null});const before=await call('read_file',{file});assert.equal(before.data,'FIRST_TASK_BEFORE');
 await call('edit_file',{file,expected_sha256:before.sha256,old_text:'FIRST_TASK_BEFORE',new_text:'FIRST_TASK_AFTER'});assert.equal((await call('read_file',{file})).data,'FIRST_TASK_AFTER');checks.push('create/read/checked-edit/read');
 const stale=await client.callTool({name:'write_file',arguments:{file,content:'INVALID',expected_sha256:before.sha256}});assert.equal(stale.isError,true);assert.equal(await fs.readFile(file,'utf8'),'FIRST_TASK_AFTER');checks.push('stale overwrite rejected');
 const search=await call('search_files',{directory:temp,query:'FIRST_TASK_AFTER',glob:'disposable-first-task.txt'});assert.equal(search.matches.length,1);assert.equal(search.engine,'native');checks.push('search without ripgrep or a package installation');
 const job=await call('process_start',{command:'printf DISTRIBUTED_BRIDGE_OK',cwd:temp,wait_ms:0,timeout_ms:3000});let result;
 for(let n=0;n<20;n++){result=await call('process_read',{session_id:job.session_id,wait_ms:250});if(result.state==='exited')break;}
 assert.equal(result.state,'exited');assert.equal(result.exit_code,0);assert.equal(result.output,'DISTRIBUTED_BRIDGE_OK');checks.push('independent process calls and actual exit code');
 const remote=await client.callTool({name:'process_start',arguments:{command:'printf NO',target:'unconfigured-preview-host'}});assert.equal(remote.isError,true);checks.push('unconfigured SSH target rejected');
 await client.close();client=null;checks.push('client disconnect shuts down the connection');
}finally{if(client)await client.close().catch(()=>{});await fs.rm(temp,{recursive:true,force:true});}
await assert.rejects(fs.access(temp));checks.push('disposable installation and fixture removed');
console.log(JSON.stringify({at:new Date().toISOString(),version:metadata.version,sha256:digest,platform:os.platform(),arch:os.arch(),node:process.version,passed:true,checks,scope:'Archive and manifest-resolved MCP acceptance in a clean directory. Not a desktop-host UI install, customer activation or ChatGPT listing.'},null,2));
