import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { homedir } from 'node:os';
import { stat } from 'node:fs/promises';
import path from 'node:path';

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
export function shellQuote(text) { return "'" + text.replaceAll("'", "'\\''") + "'"; }

/** Only jobs created by this manager can be polled, written to or stopped. */
export class Processes {
  constructor({ maxActive = 12, maxCaptureBytes = 8 * 1024 * 1024, maxFinished = 64,
                sshAliases = [], home = homedir(), onEvent = () => {} } = {}) {
    this.jobs = new Map(); this.maxActive = maxActive; this.maxCaptureBytes = maxCaptureBytes;
    this.maxFinished = maxFinished; this.sshAliases = new Set(sshAliases);
    this.home = home; this.onEvent = onEvent;
  }
  async start({ command, cwd = this.home, target = 'local', wait_ms = 1000,
                timeout_ms = 30 * 60 * 1000, shell = '/bin/bash' }) {
    if (!command || command.includes('\0')) throw new Error('Invalid command');
    if (this.list().filter(j => j.state === 'running').length >= this.maxActive) throw new Error('Concurrent-process limit reached; poll existing jobs or stop one');
    let executable, args;
    if (target === 'local') {
      if (!path.isAbsolute(cwd) || !(await stat(cwd)).isDirectory()) throw new Error('cwd must be an existing absolute directory');
      if (!['/bin/bash', '/bin/zsh', '/bin/sh'].includes(shell)) throw new Error('Select /bin/bash, /bin/zsh or /bin/sh');
      executable = shell; args = ['-c', command];
    } else {
      if (!this.sshAliases.has(target)) throw new Error('SSH target is not configured by the owner');
      if (cwd !== this.home && !path.posix.isAbsolute(cwd)) throw new Error('Remote cwd must be absolute');
      executable = '/usr/bin/ssh';
      const script = (cwd === this.home ? '' : `cd ${shellQuote(cwd)} && `) + command;
      args = ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=8', '--', target, '/bin/bash -c ' + shellQuote(script)];
    }
    this.prune();
    // Never forward tunnel/MCP provider credentials to a launched subprocess.
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
      !/^(?:GANADO_BRIDGE_HTTP_TOKEN|CONTROL_PLANE_API_KEY|OPENAI_API_KEY|ANTHROPIC_API_KEY)$/.test(key)));
    const child = spawn(executable, args, { cwd: target === 'local' ? cwd : this.home,
      env, stdio: ['pipe', 'pipe', 'pipe'], detached: true });
    const id = randomUUID();
    const job = { id, child, target, state: 'running', started_at: new Date().toISOString(),
      exit_code: null, signal: null, output: Buffer.alloc(0), base: 0, total: 0, timed_out: false,
      spawn_error: false, timer: null, killTimer: null };
    this.jobs.set(id, job);
    const append = chunk => {
      const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      job.total += data.length;
      job.output = Buffer.concat([job.output, data]);
      if (job.output.length > this.maxCaptureBytes) job.output = job.output.subarray(job.output.length - this.maxCaptureBytes);
      job.base = job.total - job.output.length;
    };
    child.stdout.on('data', append); child.stderr.on('data', append);
    child.stdin.on('error', () => {});
    child.on('error', () => { job.spawn_error = true; });
    child.on('close', (code, signal) => {
      job.state = 'exited'; job.exit_code = code; job.signal = signal;
      job.ended_at = new Date().toISOString();
      clearTimeout(job.timer); clearTimeout(job.killTimer);
      this.onEvent({ action: 'process_finished', session_id: id, target, exit_code: code, timed_out: job.timed_out });
    });
    if (timeout_ms > 0) {
      job.timer = setTimeout(() => { job.timed_out = true; this.signal(job, 'SIGTERM');
        job.killTimer = setTimeout(() => this.signal(job, 'SIGKILL'), 3000); job.killTimer.unref();
      }, timeout_ms); job.timer.unref();
    }
    this.onEvent({ action: 'process_started', session_id: id, target });
    return this.read({ session_id: id, offset: 0, max_bytes: 65536, wait_ms });
  }
  get(id) { const job = this.jobs.get(id); if (!job) throw new Error('Unknown or expired session_id'); return job; }
  async read({ session_id, offset = 0, max_bytes = 65536, wait_ms = 0 }) {
    const job = this.get(session_id);
    if (!Number.isInteger(offset) || offset < 0 || offset > job.total) throw new Error('Invalid output offset');
    const deadline = Date.now() + Math.min(10000, Math.max(0, wait_ms));
    while (job.state === 'running' && job.total <= offset && Date.now() < deadline) await pause(25);
    const start = Math.max(offset, job.base), end = Math.min(job.total, start + max_bytes);
    return { session_id, pid: job.child.pid ?? null, target: job.target, state: job.state,
      exit_code: job.exit_code, signal: job.signal, timed_out: job.timed_out, spawn_error: job.spawn_error,
      output: job.output.subarray(start - job.base, end - job.base).toString('utf8'),
      offset: start, next_offset: end, total_bytes: job.total, earliest_offset: job.base,
      omitted_bytes: start - offset, more: end < job.total, started_at: job.started_at,
      ended_at: job.ended_at ?? null, stream: 'stdout_and_stderr_merged' };
  }
  async input({ session_id, text = '', close_stdin = false, offset = 0, wait_ms = 1000 }) {
    const job = this.get(session_id);
    if (job.state !== 'running' || !job.child.stdin.writable) throw new Error('Process no longer accepts input');
    if (close_stdin) job.child.stdin.end(text); else job.child.stdin.write(text);
    return this.read({ session_id, offset, max_bytes: 65536, wait_ms });
  }
  signal(job, signal) {
    if (job.state !== 'running') return;
    try { process.kill(-job.child.pid, signal); } catch (error) { if (error.code !== 'ESRCH') throw error; }
  }
  async stop(id) {
    const job = this.get(id); this.signal(job, 'SIGTERM');
    for (let i = 0; i < 40 && job.state === 'running'; i++) await pause(25);
    if (job.state === 'running') { this.signal(job, 'SIGKILL'); await pause(50); }
    return { session_id: id, state: job.state, exit_code: job.exit_code, signal: job.signal,
      remote_note: job.target === 'local' ? null : 'SSH client stopped; remote descendants may require an explicit remote status check.' };
  }
  list() { return [...this.jobs.values()].map(j => ({ session_id: j.id, pid: j.child.pid ?? null,
    target: j.target, state: j.state, started_at: j.started_at, exit_code: j.exit_code,
    total_bytes: j.total, timed_out: j.timed_out })); }
  prune() {
    const done = [...this.jobs.values()].filter(j => j.state === 'exited');
    for (const j of done.slice(0, Math.max(0, done.length - this.maxFinished))) this.jobs.delete(j.id);
  }
  async close() { await Promise.all([...this.jobs.values()].filter(j => j.state === 'running').map(j => this.stop(j.id))); }
}
