import {
  createCipheriv,
  createDecipheriv,
  createPrivateKey,
  createPublicKey,
  diffieHellman,
  generateKeyPairSync,
  hkdfSync,
  randomBytes,
} from 'node:crypto';

const INFO=Buffer.from('ganado-bridge-relay:v1');
const AAD=Buffer.from('ganado-bridge-relay-envelope:v1');

export function generateX25519KeyPair(){
  const {publicKey,privateKey}=generateKeyPairSync('x25519');
  return {
    public_key:publicKey.export({format:'der',type:'spki'}).toString('base64url'),
    private_key:privateKey.export({format:'der',type:'pkcs8'}).toString('base64url'),
  };
}
function pub(value){return createPublicKey({key:Buffer.from(value,'base64url'),format:'der',type:'spki'});}
function priv(value){return createPrivateKey({key:Buffer.from(value,'base64url'),format:'der',type:'pkcs8'});}
function derive(senderPrivate,recipientPublic,salt){
  const shared=diffieHellman({privateKey:senderPrivate,publicKey:recipientPublic});
  return Buffer.from(hkdfSync('sha256',shared,salt,INFO,32));
}
export function validateEnvelope(envelope){
  if(!envelope||typeof envelope!=='object'||Array.isArray(envelope)||envelope.v!==1)throw new Error('Unsupported relay envelope.');
  for(const k of ['epk','salt','iv','ct','tag']){
    if(typeof envelope[k]!=='string'||!envelope[k]||envelope[k].length>6_500_000||!/^[A-Za-z0-9_-]+$/.test(envelope[k])){
      throw new Error('Invalid relay envelope.');
    }
  }
  if(Buffer.from(envelope.iv,'base64url').length!==12||Buffer.from(envelope.tag,'base64url').length!==16)throw new Error('Invalid relay envelope.');
  return envelope;
}
export function encryptJson(recipientPublicKey,payload){
  const plaintext=Buffer.from(JSON.stringify(payload),'utf8');
  if(plaintext.length>3_500_000)throw new Error('Relay payload is too large.');
  const ephemeral=generateKeyPairSync('x25519'),salt=randomBytes(16),iv=randomBytes(12);
  const cipher=createCipheriv('aes-256-gcm',derive(ephemeral.privateKey,pub(recipientPublicKey),salt),iv);
  cipher.setAAD(AAD);
  const ct=Buffer.concat([cipher.update(plaintext),cipher.final()]);
  return {
    v:1,
    epk:ephemeral.publicKey.export({format:'der',type:'spki'}).toString('base64url'),
    salt:salt.toString('base64url'),
    iv:iv.toString('base64url'),
    ct:ct.toString('base64url'),
    tag:cipher.getAuthTag().toString('base64url'),
  };
}
export function decryptJson(recipientPrivateKey,envelope){
  validateEnvelope(envelope);
  const salt=Buffer.from(envelope.salt,'base64url'),iv=Buffer.from(envelope.iv,'base64url');
  const decipher=createDecipheriv('aes-256-gcm',derive(priv(recipientPrivateKey),pub(envelope.epk),salt),iv);
  decipher.setAAD(AAD);
  decipher.setAuthTag(Buffer.from(envelope.tag,'base64url'));
  const plaintext=Buffer.concat([decipher.update(Buffer.from(envelope.ct,'base64url')),decipher.final()]);
  if(plaintext.length>3_500_000)throw new Error('Relay payload is too large.');
  return JSON.parse(plaintext.toString('utf8'));
}
