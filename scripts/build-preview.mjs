import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile);
const root=path.resolve(import.meta.dirname,'..');
const agent=path.join(root,'agent');
const pkg=JSON.parse(await fs.readFile(path.join(agent,'package.json'),'utf8'));
const version=pkg.version;
const out=path.join(root,'dist');
const stage=path.join(out,`ganado-bridge-${version}`);
const archive=path.join(out,`ganado-bridge-${version}.mcpb`);
await fs.rm(stage,{recursive:true,force:true});await fs.mkdir(stage,{recursive:true});await fs.mkdir(out,{recursive:true});
for(const name of ['bin','src','node_modules','package.json','npm-shrinkwrap.json','README.md','EVALUATION.md','LICENSE'])await fs.cp(path.join(agent,name),path.join(stage,name),{recursive:true,filter:src=>!['.DS_Store','.env','.npmrc'].includes(path.basename(src))});
await fs.copyFile(path.join(root,'assets/brand-icon.png'),path.join(stage,'icon.png'));
const manifest={manifest_version:'0.3',name:'ganado-bridge',display_name:'Ganado Bridge — Local + Relay Preview',version,
 description:'Checked local Mac tools plus an optional outbound pairing client for the Ganado Bridge managed relay.',
 long_description:'MIT preview for macOS. Local MCP mode remains available. The optional connect command creates a device identity and opens outbound HTTPS polling to the Ganado Bridge managed relay so a separately authorized remote MCP client can reach this Mac. Owner-level file/terminal access is not a sandbox. The public ChatGPT directory listing is not approved or generally released.',
 author:{name:'Ganado International s.r.o.',email:'info@ganado.cz',url:'https://ganado-bridge.vercel.app'},repository:{type:'git',url:'https://github.com/cynarax/bridge-by-ganado'},homepage:'https://ganado-bridge.vercel.app',documentation:'https://ganado-bridge.vercel.app/install',support:'https://ganado-bridge.vercel.app/support',icon:'icon.png',
 server:{type:'node',entry_point:'bin/bundle.mjs',mcp_config:{command:'node',args:['${__dirname}/bin/bundle.mjs'],env:{BRIDGE_BUNDLE_LOCAL_ACCESS:'${user_config.allow_local_access}'}}},tools_generated:true,keywords:['macos','files','terminal','developer-tools','mcp'],license:'MIT',privacy_policies:['https://ganado-bridge.vercel.app/privacy'],compatibility:{platforms:['darwin'],runtimes:{node:'^22.22.0 || ^24.0.0'}},user_config:{allow_local_access:{type:'boolean',title:'Enable owner-level local file and terminal access',description:'I understand this can read, change or delete files with my OS permissions and return requested data to my AI provider. It is not a sandbox.',required:true,default:false}}};
await fs.writeFile(path.join(stage,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
await fs.rm(archive,{force:true});
// Deterministic archive: Python zipfile writes sorted members with one fixed timestamp and preserved executable bits.
const py=`import os,sys,zipfile\nroot,out=sys.argv[1],sys.argv[2]\nfiles=[]\nfor base,dirs,names in os.walk(root):\n dirs.sort(); names.sort()\n for n in names: files.append(os.path.join(base,n))\nwith zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:\n for f in sorted(files):\n  rel=os.path.relpath(f,root).replace(os.sep,'/')\n  st=os.stat(f); info=zipfile.ZipInfo(rel,(2026,9,21,0,0,0)); info.compress_type=zipfile.ZIP_DEFLATED; info.external_attr=(st.st_mode & 0xffff)<<16\n  with open(f,'rb') as h:z.writestr(info,h.read())\n`;
await exec('python3',['-c',py,stage,archive],{timeout:120000,maxBuffer:10000});
const sha=createHash('sha256').update(await fs.readFile(archive)).digest('hex');
await fs.writeFile(path.join(out,'SHA256SUMS'),`${sha}  ${path.basename(archive)}\n`);
console.log(JSON.stringify({version,archive,sha256:sha},null,2));
