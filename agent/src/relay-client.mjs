import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {decryptJson,encryptJson,generateX25519KeyPair} from './relay-crypto.mjs';

const DEFAULT_RELAY='https://ganado-bridge.vercel.app';
const cli=fileURLToPath(new URL('../bin/bridge.mjs',import.meta.url));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

export function relayOrigin(value=process.env.BRIDGE_RELAY_URL||DEFAULT_RELAY){
  const u=new URL(value);
  const loopback=u.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(u.hostname);
  if(u.username||u.password||u.hash||u.search||(u.protocol!=='https:'&&!loopback))throw new Error('Relay URL must be an HTTPS origin (or local loopback for tests).');
  return u.origin;
}
export function relayStateDir(){
  const value=process.env.BRIDGE_AGENT_STATE_DIR||path.join(os.homedir(),'.local/state/ganado-bridge-agent');
  if(!path.isAbsolute(value))throw new Error('Relay state directory must be absolute.');
  return value;
}
export async function loadRelayState(stateDir=relayStateDir()){
  const file=path.join(stateDir,'relay.json');
  try{
    const info=await fs.lstat(file);
    if(!info.isFile()||info.isSymbolicLink()||(info.mode&0o077)!==0)throw new Error('Unsafe relay state file permissions.');
    const state=JSON.parse(await fs.readFile(file,'utf8'));
    for(const k of ['relay_url','device_id','device_token','public_key','private_key']){
      if(typeof state[k]!=='string'||!state[k])throw new Error('Invalid relay state.');
    }
    return state;
  }catch(error){
    if(error.code==='ENOENT')return null;
    throw error;
  }
}
export async function saveRelayState(state,stateDir=relayStateDir()){
  await fs.mkdir(stateDir,{recursive:true,mode:0o700});
  const dir=await fs.lstat(stateDir);
  if(!dir.isDirectory()||dir.isSymbolicLink())throw new Error('Unsafe relay state directory.');
  await fs.chmod(stateDir,0o700);
  const file=path.join(stateDir,'relay.json');
  const tmp=path.join(stateDir,'.relay.'+process.pid+'.tmp');
  await fs.writeFile(tmp,JSON.stringify(state,null,2)+'\n',{mode:0o600,flag:'wx'});
  try{
    await fs.rename(tmp,file);
    await fs.chmod(file,0o600);
  }catch(error){
    await fs.rm(tmp,{force:true}).catch(()=>{});
    throw error;
  }
}
export async function removeRelayState(stateDir=relayStateDir()){
  await fs.rm(path.join(stateDir,'relay.json'),{force:true});
}
async function postJson(fetchImpl,url,{deviceToken,body,timeout=30000}={}){
  const headers={'Content-Type':'application/json'};
  if(deviceToken)headers.Authorization='Device '+deviceToken;
  const response=await fetchImpl(url,{
    method:'POST',headers,body:JSON.stringify(body||{}),signal:AbortSignal.timeout(timeout),
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok){
    const error=new Error(typeof data.error==='string'?data.error:'Relay request failed.');
    error.status=response.status;
    throw error;
  }
  return data;
}
export async function registerOrPair({fetchImpl=fetch,stateDir=relayStateDir(),relayUrl=relayOrigin()}={}){
  let state=await loadRelayState(stateDir);
  if(state&&state.relay_url!==relayUrl)throw new Error('This Mac is paired to a different relay. Disconnect it before changing relay URL.');
  if(!state){
    const keys=generateX25519KeyPair();
    const data=await postJson(fetchImpl,relayUrl+'/api/device-register',{body:{name:'My Mac',public_key:keys.public_key}});
    if(!data.device_id||!data.device_token||!data.pairing_code)throw new Error('Relay returned an incomplete device registration.');
    state={
      version:1,relay_url:relayUrl,device_id:data.device_id,device_token:data.device_token,
      public_key:keys.public_key,private_key:keys.private_key,created_at:new Date().toISOString(),
    };
    await saveRelayState(state,stateDir);
    return {state,pairing_code:data.pairing_code,pairing_expires_at:data.pairing_expires_at,new_device:true};
  }
  const data=await postJson(fetchImpl,relayUrl+'/api/device-pair',{deviceToken:state.device_token,body:{}});
  if(!data.pairing_code)throw new Error('Relay did not issue a pairing code.');
  return {state,pairing_code:data.pairing_code,pairing_expires_at:data.pairing_expires_at,new_device:false};
}
export async function disconnectRelay({fetchImpl=fetch,stateDir=relayStateDir()}={}){
  const state=await loadRelayState(stateDir);
  if(!state)return {revoked:false,already_absent:true};
  try{
    await postJson(fetchImpl,state.relay_url+'/api/device-revoke',{deviceToken:state.device_token,body:{}});
  }catch(error){
    if(error.status!==401)throw error;
  }
  await removeRelayState(stateDir);
  return {revoked:true,already_absent:false};
}
export async function handleRelayJob({client,state,job,fetchImpl=fetch}){
  let result;
  try{
    const request=decryptJson(state.private_key,job.request_envelope);
    if(!request||request.tool!==job.tool||!request.arguments||typeof request.arguments!=='object')throw new Error('Mismatched relay request.');
    result=await client.callTool({name:request.tool,arguments:request.arguments});
    if(!result||!Array.isArray(result.content))throw new Error('Invalid local MCP result.');
    // Encrypting can reject an oversized response; convert that into a small remote error below.
    JSON.stringify(result);
  }catch{
    result={isError:true,content:[{type:'text',text:'The local Bridge could not safely complete this relayed tool call.'}]};
  }
  let envelope;
  try{
    envelope=encryptJson(job.response_public_key,result);
  }catch{
    envelope=encryptJson(job.response_public_key,{isError:true,content:[{type:'text',text:'The local Bridge result was too large for the managed relay.'}]});
  }
  return postJson(fetchImpl,state.relay_url+'/api/device-result',{
    deviceToken:state.device_token,
    body:{job_id:job.job_id,lease_token:job.lease_token,result_envelope:envelope},
  });
}
function childEnv(){
  const result={PATH:process.env.PATH||'',HOME:process.env.HOME||os.homedir()};
  if(process.env.BRIDGE_AGENT_STATE_DIR)result.BRIDGE_AGENT_STATE_DIR=process.env.BRIDGE_AGENT_STATE_DIR;
  if(process.env.BRIDGE_AGENT_AUDIT)result.BRIDGE_AGENT_AUDIT=process.env.BRIDGE_AGENT_AUDIT;
  if(process.env.BRIDGE_AGENT_SSH_ALIASES)result.BRIDGE_AGENT_SSH_ALIASES=process.env.BRIDGE_AGENT_SSH_ALIASES;
  return result;
}
export async function connectRelay({fetchImpl=fetch,stateDir=relayStateDir(),relayUrl=relayOrigin(),write=process.stdout.write.bind(process.stdout)}={}){
  const registration=await registerOrPair({fetchImpl,stateDir,relayUrl});
  write('Ganado Bridge pairing code: '+registration.pairing_code+'\n');
  write('Add Ganado Bridge in ChatGPT and enter this code when the browser asks.\n');
  write('Pairing codes expire after 10 minutes. Keep this process running. Ctrl-C disconnects the live session, not the device identity.\n');
  const state=registration.state;
  const client=new Client({name:'ganado-bridge-managed-device',version:'0.2.0-preview.0'});
  const transport=new StdioClientTransport({
    command:process.execPath,
    args:[cli,'serve','--allow-local-access'],
    env:childEnv(),
    stderr:'pipe',
  });
  await client.connect(transport);
  let stopping=false;
  const stop=async()=>{if(stopping)return;stopping=true;await client.close().catch(()=>{});};
  process.once('SIGTERM',()=>void stop());
  process.once('SIGINT',()=>void stop());
  try{
    while(!stopping){
      try{
        const data=await postJson(fetchImpl,state.relay_url+'/api/device-poll',{deviceToken:state.device_token,body:{},timeout:25000});
        if(data.job)await handleRelayJob({client,state,job:data.job,fetchImpl});
      }catch(error){
        if(error.status===401)throw new Error('This Bridge device was revoked. Run ganado-bridge disconnect, then connect again.');
        if(stopping)break;
        await sleep(1500);
      }
    }
  }finally{
    await stop();
  }
}
