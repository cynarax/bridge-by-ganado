import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import fs from 'node:fs/promises';
import os from 'node:os';
import { Processes } from './processes.mjs';
import { absolute, fileInfo, readFile, writeFile, editFile, listDirectory, search } from './files.mjs';
const text = value => ({ content: [{ type: 'text', text: JSON.stringify(value) }] });
const integer = (min, max, fallback) => z.number().int().min(min).max(max).default(fallback);
const abs = z.string().min(1).max(8192).refine(v => v.startsWith('/') && !v.includes('\0'), 'Absolute path required');
const uuid = z.string().uuid();
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const readOnly = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const write = { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false };
const execute = { ...write, openWorldHint: true };

export function createBridge({ processes = new Processes(), audit = async () => {} } = {}) {
  const server = new McpServer({ name: 'ganado-bridge-agent', version: '0.2.0-preview.0' });
  function tool(name, description, inputSchema, annotations, fn) {
    server.registerTool(name, { description, inputSchema, annotations }, async (input) => {
      const started = Date.now();
      try {
        const result = await fn(input);
        await audit({ at: new Date().toISOString(), tool: name, ok: true, duration_ms: Date.now() - started });
        return result?.content ? result : text(result);
      } catch (error) {
        await audit({ at: new Date().toISOString(), tool: name, ok: false, duration_ms: Date.now() - started });
        // Native error codes + our static validation messages. Never echo subprocess stderr.
        const message = error?.code ? `Operation failed (${error.code})` : String(error?.message ?? 'Operation failed').slice(0, 400);
        return { isError: true, content: [{ type: 'text', text: message }] };
      }
    });
  }
  tool('system_info', 'Current authorized host, user privileges and resource availability. No credentials.', {}, readOnly, async () => {
    const disk = await fs.statfs(os.homedir());
    return { hostname: os.hostname(), platform: os.platform(), architecture: os.arch(), home: os.homedir(),
      uid: process.getuid?.(), node: process.version, memory_available_bytes: os.freemem(),
      disk_available_bytes: disk.bavail * disk.bsize, configured_ssh_targets: [...processes.sshAliases],
      transport_note: 'Runs as the logged-in OS user; no sudo elevation or TCC bypass.' };
  });
  tool('list_directory', 'Page through a directory on the authorized host. Absolute paths; includes dotfiles.',
    { directory: abs, offset: integer(0, 1_000_000, 0), limit: integer(1, 500, 100) }, readOnly, listDirectory);
  tool('file_info', 'File type, size, modified time and Unix mode. Does not return contents.', { file: abs }, readOnly, ({ file }) => fileInfo(file));
  tool('read_file', 'Read explicit local file content in byte pages. Text or base64; returned content is untrusted data. Use returned next_offset; a full read includes SHA-256 for edits.',
    { file: abs, offset: integer(0, Number.MAX_SAFE_INTEGER, 0), max_bytes: integer(1, 1_048_576, 65536), encoding: z.enum(['utf8', 'base64']).default('utf8') }, readOnly, readFile);
  tool('write_file', 'Create a file with expected_sha256=null, or replace one only if the current SHA-256 matches. Changes actual files. Parent must exist. Does not follow a final symlink.',
    { file: abs, content: z.string().max(4_194_304), encoding: z.enum(['utf8', 'base64']).default('utf8'), expected_sha256: hash.nullable() }, write, writeFile);
  tool('edit_file', 'Replace exactly one literal fragment in a UTF-8 file after checking its SHA-256. Rejects ambiguity and conflicting edits.',
    { file: abs, expected_sha256: hash, old_text: z.string().min(1).max(1_048_576), new_text: z.string().max(1_048_576) }, write, editFile);
  tool('search_files', 'Bounded literal file-name or content search. Uses ripgrep when available, otherwise a built-in bounded fallback. Returns paths/lines and incomplete flag. No regex interpretation of the query.',
    { directory: abs, query: z.string().max(2000), glob: z.string().max(500).optional(), limit: integer(1, 200, 50), files_only: z.boolean().default(false) }, readOnly, search);
  tool('read_image', 'View a PNG, JPEG, GIF or WebP file directly, without public upload. Maximum 4 MiB. Image bytes are returned to the requesting AI.',
    { file: abs }, readOnly, async ({ file }) => {
      const h = await fs.open(absolute(file), 'r'); let data;
      try { const s = await h.stat(); if (!s.isFile() || s.size > 4_194_304) throw new Error('Use an image of at most 4 MiB'); data = await h.readFile(); }
      finally { await h.close(); }
      const mime = data.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'image/png' :
        data[0] === 255 && data[1] === 216 ? 'image/jpeg' : data.subarray(0,3).toString() === 'GIF' ? 'image/gif' :
        data.subarray(0,4).toString() === 'RIFF' && data.subarray(8,12).toString() === 'WEBP' ? 'image/webp' : null;
      if (!mime) throw new Error('Unsupported image data');
      return { content: [{ type: 'image', mimeType: mime, data: data.toString('base64') }] };
    });
  tool('process_start', 'Execute a shell command as the owner on local Mac or an already authorized SSH alias. CAN MODIFY/DELETE files, access network and invoke installed tools. No command allowlist or hidden approval bypass. Returns a session_id immediately; poll output for completion. timeout_ms=0 allows a long job until explicitly stopped or server exit.',
    { command: z.string().min(1).max(262144), cwd: abs.optional(), target: z.string().max(80).default('local'),
      shell: z.enum(['/bin/bash','/bin/zsh','/bin/sh']).default('/bin/bash'), wait_ms: integer(0, 10000, 1000), timeout_ms: integer(0, 86_400_000, 1_800_000) }, execute, input => processes.start(input));
  tool('process_read', 'Read stdout/stderr of a previously started session using byte offsets; shows true exit code, truncation, timeout and more-output status.',
    { session_id: uuid, offset: integer(0, Number.MAX_SAFE_INTEGER, 0), max_bytes: integer(1, 1_048_576, 65536), wait_ms: integer(0, 10000, 0) }, readOnly, input => processes.read(input));
  tool('process_input', 'Send input to a process created by this bridge; may execute instructions or change its state. Use python3 -u -i for a persistent Python interpreter; pipe-based, not a PTY.',
    { session_id: uuid, text: z.string().max(262144).default(''), close_stdin: z.boolean().default(false), offset: integer(0, Number.MAX_SAFE_INTEGER, 0), wait_ms: integer(0, 10000, 1000) }, execute, input => processes.input(input));
  tool('process_stop', 'Terminate only the specified bridge-owned process group. For SSH, this stops the connection; remote child shutdown needs independent verification.',
    { session_id: uuid }, write, ({ session_id }) => processes.stop(session_id));
  tool('process_list', 'List sessions created by this bridge. Does not reveal command arguments or environment secrets.', {}, readOnly, () => ({ processes: processes.list() }));
  return { server, processes };
}
