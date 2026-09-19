import fs from 'node:fs/promises';
import {constants} from 'node:fs';
import path from 'node:path';

/** Bounded fallback. No shell, subprocess, external install or telemetry. */
export async function nativeSearch({directory,query,glob,limit=50,files_only=false}, budgets={}) {
 const maxEntries=budgets.maxEntries??5000, maxBytes=budgets.maxBytes??16*1024*1024;
 const maxFileBytes=budgets.maxFileBytes??256*1024, maxMs=budgets.maxMs??2000;
 const maxDepth=budgets.maxDepth??20, started=performance.now();
 const root=await fs.lstat(directory);if(!root.isDirectory()||root.isSymbolicLink())throw new Error('Search needs a real directory, not a symbolic link.');
 if(glob&&typeof path.matchesGlob!=='function')throw new Error('Glob search requires Node.js 22.22+ or 24.');
 const reasons=new Set(),matches=[],queue=[{dir:directory,depth:0}];let entries=0,bytes=0;
 const skip=new Set(['.git','node_modules','.build']);
 outer: while(queue.length){
  if(performance.now()-started>maxMs){reasons.add('time_budget');break;}
  const {dir,depth}=queue.shift();let stream;
  try{stream=await fs.opendir(dir);}catch(e){if(e.code==='ENOENT'||e.code==='EACCES'||e.code==='EPERM'){reasons.add('unreadable_entry');continue;}throw e;}
  for await(const entry of stream){
   if(++entries>maxEntries){reasons.add('entry_budget');break outer;}
   if(performance.now()-started>maxMs){reasons.add('time_budget');break outer;}
   const file=path.join(dir,entry.name);
   if(entry.isSymbolicLink())continue;
   if(entry.isDirectory()){if(skip.has(entry.name))continue;if(depth>=maxDepth){reasons.add('depth_budget');continue;}queue.push({dir:file,depth:depth+1});continue;}
   if(!entry.isFile())continue;
   const relative=path.relative(directory,file).split(path.sep).join('/');
   if(glob&&!path.matchesGlob(glob.includes('/')?relative:entry.name,glob))continue;
   if(files_only){if(!query||file.toLowerCase().includes(query.toLowerCase()))matches.push({path:file});}
   else{
    if(bytes>=maxBytes){reasons.add('byte_budget');break outer;}
    let h;
    try{
     h=await fs.open(file,constants.O_RDONLY|constants.O_NOFOLLOW);
     const info=await h.stat();if(!info.isFile())continue;
     const size=Math.min(info.size,maxFileBytes,maxBytes-bytes);
     if(size<info.size)reasons.add('file_or_byte_budget');
     const buffer=Buffer.alloc(size);const {bytesRead}=await h.read(buffer,0,size,0);bytes+=bytesRead;
     const data=buffer.subarray(0,bytesRead);if(data.includes(0))continue;
     const lines=data.toString('utf8').split('\n');
     for(let n=0;n<lines.length;n++){if(lines[n].includes(query))matches.push({path:file,line:n+1,text:lines[n].slice(0,2000)});if(matches.length>limit){reasons.add('result_limit');break outer;}}
    }catch(e){if(['EACCES','EPERM','ENOENT','ELOOP'].includes(e.code))reasons.add('unreadable_entry');else throw e;}
    finally{if(h)await h.close();}
   }
   if(matches.length>limit){reasons.add('result_limit');break outer;}
  }
 }
 return {matches:matches.slice(0,limit),incomplete:reasons.size>0,reasons:[...reasons],engine:'native',scanned_entries:Math.min(entries,maxEntries),bytes_read:bytes,note:'Literal bounded fallback; skips symlinks and .git/node_modules/.build. A budget hit is incomplete, not proof of absence. Explicit reads remain available.'};
}
