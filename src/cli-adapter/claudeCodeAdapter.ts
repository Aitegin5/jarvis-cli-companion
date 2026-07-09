// Claude Code CLI Adapter
// Spawns the Claude Code CLI as a child process, streams stdout/stderr
// in real time via EventEmitter, parses output into text/code/stderr
// segments, keeps session context across calls, and handles common
// failure modes (binary not found, timeout, non-zero exit).

import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { EventEmitter } from 'events';
import { CliSession } from './session';
import { parseCliOutput } from './outputParser';
import {
  CliChunk,
  CliNotFoundError,
  CliProcessError,
  CliTimeoutError,
  RunOptions,
  RunResult,
} from './types';

export interface ClaudeCodeAdapterOptions {
  /** Executable name or path. Defaults to 'claude' (Claude Code CLI binary). */
  binary?: string;
  /** Default timeout for runs, ms. Defaults to 120_000 (2 min). */
  defaultTimeoutMs?: number;
  /** Max turns kept in session history. Defaults to 20. */
  maxSessionTurns?: number;
}

/**
 * Events emitted while a command runs:
 *  - 'stdout'  (chunk: string)   raw stdout as it arrives
 *  - 'stderr'  (chunk: string)   raw stderr as it arrives
 *  - 'data'    (chunk: CliChunk) unified stream (stdout/stderr/error/exit)
 *  - 'error'   (err: Error)      spawn/timeout/runtime failure
 *  - 'exit'    (code: number|null) process exited
 */
export class ClaudeCodeAdapter extends EventEmitter {
  private readonly binary: string;
  private readonly defaultTimeoutMs: number;
  private readonly session: CliSession;

  constructor(options: ClaudeCodeAdapterOptions = {}) {
    super();
    this.binary = options.binary ?? 'claude';
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? 120_000;
    this.session = new CliSession(options.maxSessionTurns ?? 20);
  }

  /** Returns a copy of the current session history. */
  getHistory() {
    return this.session.getHistory();
  }

  /** Clears session context (start a fresh conversation). */
  resetSession(): void {
    this.session.clear();
  }

  /**
   * Runs a prompt through the Claude Code CLI as a one-shot child process.
   * Streams output live via events and also resolves with the full result.
   */
  runCommand(prompt: string, options: RunOptions = {}): Promise<RunResult> {
    const useHistory = options.useHistory ?? true;
    const timeoutMs = options.timeoutMs ?? this.defaultTimeoutMs;
    const finalPrompt = useHistory
      ? this.session.buildPromptWithContext(prompt)
      : prompt;

    this.session.addUserTurn(prompt);

    return new Promise((resolve, reject) => {
      let child: ChildProcessWithoutNullStreams;

      try {
        child = spawn(
          this.binary,
          ['--print', finalPrompt, ...(options.extraArgs ?? [])],
          { cwd: options.cwd ?? process.cwd(), shell: false }
        );
      } catch (err) {
        const e = this.toSpawnError(err);
        this.emitError(e);
        reject(e);
        return;
      }

      let stdout = '';
      let stderr = '';
      let settled = false;
      let timedOut = false;

      const timer = setTimeout(() => {
        timedOut = true;
        child.kill('SIGKILL');
      }, timeoutMs);

      child.on('error', (err: NodeJS.ErrnoException) => {
        clearTimeout(timer);
        if (settled) return;
        settled = true;
        const e =
          err.code === 'ENOENT' ? new CliNotFoundError(this.binary) : err;
        this.emitError(e);
        reject(e);
      });

      child.stdout.on('data', (buf: Buffer) => {
        const text = buf.toString('utf8');
        stdout += text;
        this.emit('stdout', text);
        this.emitChunk({ type: 'stdout', data: text, timestamp: Date.now() });
      });

      child.stderr.on('data', (buf: Buffer) => {
        const text = buf.toString('utf8');
        stderr += text;
        this.emit('stderr', text);
        this.emitChunk({ type: 'stderr', data: text, timestamp: Date.now() });
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        if (settled) return;
        settled = true;

        this.emit('exit', code);
        this.emitChunk({ type: 'exit', data: '', exitCode: code, timestamp: Date.now() });

        if (timedOut) {
          const e = new CliTimeoutError(timeoutMs);
          this.emitError(e);
          reject(e);
          return;
        }

        if (code !== 0 && code !== null) {
          const e = new CliProcessError(code, stderr);
          this.emitError(e);
          reject(e);
          return;
        }

        const segments = parseCliOutput(stdout, stderr);
        if (stdout.trim().length > 0) {
          this.session.addAssistantTurn(stdout.trim());
        }

        resolve({ stdout, stderr, segments, exitCode: code, timedOut });
      });
    });
  }

  private emitChunk(chunk: CliChunk) {
    this.emit('data', chunk);
  }

  private emitError(err: Error) {
    this.emit('error', err);
  }

  private toSpawnError(err: unknown): Error {
    const e = err as NodeJS.ErrnoException;
    if (e && e.code === 'ENOENT') return new CliNotFoundError(this.binary);
    return e instanceof Error ? e : new Error(String(err));
  }
}
