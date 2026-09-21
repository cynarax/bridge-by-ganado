import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {decryptJson,encryptJson,generateX25519KeyPair} from '../src/relay-crypto.mjs';
import {disconnectRelay,handleRelayJob,loadRelayState,registerOrPair,saveRelayState} from '../src/relay-client.mjs';

const response=(status,body)=>({
  ok:status>=200&&status<300,
  status,
  async json(){return body;},
});
async function temp(t){
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'bridge-relay-test-'));
  t.after(()=>fs.rm(dir,{recursive:true,force:true}));
  return dir;
}
test('new relay pairing saves only local device identity with restrictive permissions',async t=>{
  const dir=await temp(t);
  const calls=[];
  const fetchImpl=async(url,options)=>{
    calls.push({url,options});
    return response(201,{device_id:'11111111-1111-4111-8111-111111111111',device_token:'D'.repeat(64),pairing_code:'PAIRTEST1234',pairing_expires_at:'2026-09-21T08:00:00Z'});
  };
  const result=await registerOrPair({fetchImpl,stateDir:dir,relayUrl:'https://relay.example'});
  assert.equal(result.new_device,true);
  assert.equal(result.pairing_code,'PAIRTEST1234');
  assert.equal(calls.length,1);
  assert.equal(calls[0].url,'https://relay.example/api/device-register');
  const state=await loadRelayState(dir);
  assert.equal(state.device_token,'D'.repeat(64));
  assert.ok(state.private_key.length>40);
  const info=await fs.stat(path.join(dir,'relay.json'));
  assert.equal(info.mode&0o077,0);
});

test('existing relay identity rotates pairing code without registering a second device',async t=>{
  const dir=await temp(t);
  const keys=generateX25519KeyPair();
  await saveRelayState({version:1,relay_url:'https://relay.example',device_id:'dev-1',device_token:'T'.repeat(64),...keys},dir);
  const calls=[];
  const fetchImpl=async(url,options)=>{
    calls.push({url,options});
    return response(200,{pairing_code:'NEWPAIR12345',pairing_expires_at:'2026-09-21T08:00:00Z'});
  };
  const result=await registerOrPair({fetchImpl,stateDir:dir,relayUrl:'https://relay.example'});
  assert.equal(result.new_device,false);
  assert.equal(result.pairing_code,'NEWPAIR12345');
  assert.equal(calls[0].url,'https://relay.example/api/device-pair');
  assert.equal(calls[0].options.headers.Authorization,'Device '+'T'.repeat(64));
});

test('relayed job decrypts locally and returns only encrypted result',async()=>{
  const device=generateX25519KeyPair(),responseKeys=generateX25519KeyPair();
  const state={relay_url:'https://relay.example',device_token:'T'.repeat(64),private_key:device.private_key};
  const job={
    job_id:'11111111-1111-4111-8111-111111111111',
    lease_token:'L'.repeat(64),
    tool:'read_file',
    request_envelope:encryptJson(device.public_key,{tool:'read_file',arguments:{file:'/tmp/fixture.txt'}}),
    response_public_key:responseKeys.public_key,
  };
  const client={async callTool(input){
    assert.deepEqual(input,{name:'read_file',arguments:{file:'/tmp/fixture.txt'}});
    return {content:[{type:'text',text:'PRIVATE_RESULT'}]};
  }};
  let posted;
  const fetchImpl=async(url,options)=>{
    posted={url,options,body:JSON.parse(options.body)};
    return response(200,{accepted:true});
  };
  await handleRelayJob({client,state,job,fetchImpl});
  assert.equal(posted.url,'https://relay.example/api/device-result');
  assert.equal(posted.options.headers.Authorization,'Device '+'T'.repeat(64));
  assert.ok(!JSON.stringify(posted.body.result_envelope).includes('PRIVATE_RESULT'));
  const result=decryptJson(responseKeys.private_key,posted.body.result_envelope);
  assert.deepEqual(result,{content:[{type:'text',text:'PRIVATE_RESULT'}]});
});

test('device disconnect must revoke remotely before local identity disappears',async t=>{
  const dir=await temp(t),keys=generateX25519KeyPair();
  await saveRelayState({version:1,relay_url:'https://relay.example',device_id:'dev-1',device_token:'T'.repeat(64),...keys},dir);
  let call;
  const fetchImpl=async(url,options)=>{call={url,options};return response(200,{revoked:true});};
  const result=await disconnectRelay({fetchImpl,stateDir:dir});
  assert.equal(result.revoked,true);
  assert.equal(call.url,'https://relay.example/api/device-revoke');
  assert.equal(await loadRelayState(dir),null);
});

test('failed disconnect keeps local identity so revocation can be retried',async t=>{
  const dir=await temp(t),keys=generateX25519KeyPair();
  await saveRelayState({version:1,relay_url:'https://relay.example',device_id:'dev-1',device_token:'T'.repeat(64),...keys},dir);
  const fetchImpl=async()=>response(503,{error:'down'});
  await assert.rejects(disconnectRelay({fetchImpl,stateDir:dir}),/down/);
  assert.ok(await loadRelayState(dir));
});
