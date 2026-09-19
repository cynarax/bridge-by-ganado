import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execFile);
import {nativeSearch} from './search-native.mjs';
export const sha256 = data => createHash('sha256').update(data).digest('hex');
export function absolute(value) {
  if (!path.isAbsolute(value) || value.includes('\0')) throw new Error('Use an absolute path');
  return path.resolve(value);
}
export async function fileInfo(file) {
  file = absolute(file); const s = await fs.lstat(file);
  return { path: file, type: s.isSymbolicLink() ? 'symlink' : s.isDirectory() ? 'directory' : s.isFile() ? 'file' : 'special',
    bytes: s.size, modified_at: s.mtime.toISOString(), mode: (s.mode & 0o777).toString(8) };
}
export async function listDirectory({ directory, offset = 0, limit = 100 }) {
  directory = absolute(directory);
  const names = (await fs.readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name));
  return { directory, offset, total: names.length, next_offset: Math.min(names.length, offset + limit),
    entries: names.slice(offset, offset + limit).map(e => ({ name: e.name, path: path.join(directory, e.name),
      type: e.isDirectory() ? 'directory' : e.isFile() ? 'file' : e.isSymbolicLink() ? 'symlink' : 'special' })) };
}
export async function readFile({ file, offset = 0, max_bytes = 65536, encoding = 'utf8' }) {
  file = absolute(file); const h = await fs.open(file, 'r');
  try {
    const s = await h.stat(); if (!s.isFile()) throw new Error('Not a regular file');
    if (offset > s.size) throw new Error('Offset beyond end of file');
    const buffer = Buffer.alloc(Math.min(max_bytes, s.size - offset));
    const { bytesRead } = await h.read(buffer, 0, buffer.length, offset);
    const data = buffer.subarray(0, bytesRead);
    if (encoding === 'utf8' && data.includes(0)) throw new Error('Binary file: choose base64 or read_image');
    return { path: file, encoding, data: data.toString(encoding), offset, next_offset: offset + bytesRead,
      total_bytes: s.size, more: offset + bytesRead < s.size,
      sha256: offset === 0 && bytesRead === s.size ? sha256(data) : null };
  } finally { await h.close(); }
}
const pending = new Map();
async function serial(key, fn) {
  const previous = pending.get(key) ?? Promise.resolve();
  let release; const current = new Promise(r => { release = r; });
  pending.set(key, current); await previous;
  try { return await fn(); } finally { release(); if (pending.get(key) === current) pending.delete(key); }
}
export async function writeFile({ file, content, encoding = 'utf8', expected_sha256 = null }) {
  file = absolute(file);
  const parent = await fs.realpath(path.dirname(file)); file = path.join(parent, path.basename(file));
  return serial(file, async () => {
    let original, mode = 0o600;
    try { const info = await fs.lstat(file); if (!info.isFile()) throw new Error('Refusing symlink or special-file replacement');
      if (info.size > 32 * 1024 * 1024) throw new Error('File too large for atomic text edit');
      original = await fs.readFile(file); mode = info.mode & 0o777;
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (original && expected_sha256 === null) throw new Error('File exists: provide its current SHA-256');
    if (expected_sha256 !== null && (!original || sha256(original) !== expected_sha256)) throw new Error('Conflict: file no longer matches expected SHA-256');
    if (encoding === 'base64' && !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(content)) throw new Error('Invalid base64');
    const data = Buffer.from(content, encoding), tmp = path.join(parent, '.ganado-bridge-' + randomUUID());
    let h;
    try {
      h = await fs.open(tmp, 'wx', mode); await h.writeFile(data); await h.sync(); await h.close(); h = null;
      if (original) {
        const current = await fs.lstat(file);
        if (!current.isFile() || sha256(await fs.readFile(file)) !== expected_sha256) throw new Error('Conflict: file changed during preparation');
        await fs.rename(tmp, file);
      } else { await fs.link(tmp, file); await fs.unlink(tmp); }
      return { path: file, bytes: data.length, sha256: sha256(data), created: !original };
    } finally { if (h) await h.close(); await fs.unlink(tmp).catch(e => { if (e.code !== 'ENOENT') throw e; }); }
  });
}
export async function editFile({ file, expected_sha256, old_text, new_text }) {
  if (!old_text) throw new Error('old_text must not be empty');
  const old = await readFile({ file, max_bytes: 4 * 1024 * 1024 });
  if (old.more || old.sha256 !== expected_sha256) throw new Error('Conflict or oversized file');
  if (old.data.split(old_text).length !== 2) throw new Error('old_text must match exactly once');
  return writeFile({ file, expected_sha256, content: old.data.replace(old_text, () => new_text) });
}
export async function search({ directory, query, glob, limit = 50, files_only = false }) {
  directory = absolute(directory);
  if(process.env.BRIDGE_AGENT_SEARCH==='native')return nativeSearch({directory,query,glob,limit,files_only});
  const args = files_only ? ['--files', '--hidden'] : ['--json', '--fixed-strings', '--hidden', '--max-count', String(limit), '-e', query];
  args.push('--glob', '!.git/**', '--glob', '!node_modules/**', '--glob', '!.build/**');
  if (glob) args.push('--glob', glob);
  args.push('--', directory);
  let stdout = '', partial = false;
  try { ({ stdout } = await exec('rg', args, { timeout: 10000, maxBuffer: 2 * 1024 * 1024, encoding: 'utf8' })); }
  catch (error) { if(error.code==='ENOENT')return nativeSearch({directory,query,glob,limit,files_only});
    if (error.code === 1) return { matches: [], incomplete: false };
    if (error.killed || error.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER') { stdout = error.stdout || ''; partial = true; }
    else throw new Error(error.code === 'ENOENT' ? 'ripgrep is not installed on this host' : 'Search failed: check directory access'); }
  let matches = [];
  if (files_only) matches = stdout.split('\n').filter(x => x && (!query || x.toLowerCase().includes(query.toLowerCase()))).map(file => ({ path: file }));
  else for (const line of stdout.split('\n')) {
    try { const event = JSON.parse(line); if (event.type === 'match') matches.push({ path: event.data.path.text,
      line: event.data.line_number, text: event.data.lines.text?.slice(0, 2000) }); } catch { if (line) partial = true; }
  }
  return { matches: matches.slice(0, limit), incomplete: partial || matches.length > limit,
    note: 'Literal search, skips .git/node_modules/.build; explicit reads and terminal remain available.' };
}
