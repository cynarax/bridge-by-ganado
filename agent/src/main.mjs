import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {appendFile,mkdir,lstat,rename} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createBridge} from './server.mjs';
import {Processes} from './processes.mjs';

export async function serve(){
 if(!process.argv.includes('--allow-local-access'))throw new Error('Owner-level file/terminal access requires explicit --allow-local-access. Read the security model first.');
 const aliases=(process.env.BRIDGE_AGENT_SSH_ALIASES||'').split(',').map(x=>x.trim()).filter(Boolean);
 if(aliases.some(x=>!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(x)))throw new Error('Invalid SSH alias configuration.');
 const stateDir=process.env.BRIDGE_AGENT_STATE_DIR||path.join(os.homedir(),'.local/state/ganado-bridge-agent');
 if(!path.isAbsolute(stateDir))throw new Error('Audit directory must be absolute.');
 let queue=Promise.resolve();
 async function audit(row){
  if(process.env.BRIDGE_AGENT_AUDIT==='off')return;
  queue=queue.catch(()=>{}).then(async()=>{
   await mkdir(stateDir,{recursive:true,mode:0o700});const directory=await lstat(stateDir);
   if(!directory.isDirectory()||directory.isSymbolicLink())throw new Error('Unsafe audit directory');
   const file=path.join(stateDir,'audit.jsonl');
   try{const info=await lstat(file);if(!info.isFile()||info.isSymbolicLink())throw new Error('Unsafe audit file');if(info.size>2_000_000)await rename(file,file+'.1');}catch(error){if(error.code!=='ENOENT')throw error;}
   await appendFile(file,JSON.stringify(row)+'\n',{mode:0o600});
  });
  try{await queue;}catch{process.stderr.write('Bridge: metadata audit write failed.\n');}
 }
 const processes=new Processes({sshAliases:aliases,onEvent:row=>void audit({at:new Date().toISOString(),...row})});
 const {server}=createBridge({processes,audit});
 let stopping=false;
 const stop=async()=>{if(stopping)return;stopping=true;await processes.close();await queue.catch(()=>{});await server.close();};
 process.on('SIGTERM',()=>void stop());process.on('SIGINT',()=>void stop());
 server.server.onclose=()=>void stop();
 await server.connect(new StdioServerTransport());
}
