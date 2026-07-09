'use strict';

const { spawn } = require('child_process');
const { EventEmitter } = require('events');

/**
 * ClaudeCodeAdapter
 * ------------------
 * Thin wrapper around the Claude Code CLI binary.
 * Spawns the CLI as a child process, streams stdout/stderr
 * as they arrive, and exposes a simple event-based API so
 * higher layers (Orchestrator, voice, UI) never have to touch
 * the terminal directly.
 *
 * Events emitted:
 *  - 'data'   (chunk: string)          raw stdout chunk
 *  - 'error-data' (chunk: string)      raw stderr chunk
 *  - 'line'   (line: string)           a complete line of stdout
 *  - 'exit'   (code: number|null)      process finished
 *  - 'error'  (err: Error)             spawn/runtime error (e.g. binary not found)
 */
class ClaudeCodeAdapter extends EventEmitter {
  /**
   * @param {Object} options
   * @param {string} [options.binary='claude'] Path or name of the Claude Code CLI executable.
   * @param {string} [options.cwd] Working directory to run the CLI in (defaults to process.cwd()).
   * @param {Object} [options.env] Extra environment variables to merge into the child process env.
   */
  constructor(options = {}) {
    super();
    this.binary = options.binary || 'claude';
    this.cwd = options.cwd || process.cwd();
    this.env = { ...process.env, ...(options.env || {}) };
    this.child = null;
    this._stdoutBuffer = '';
  }

  /**
   * Starts a Claude Code CLI session with the given arguments.
   * @param {string[]} args CLI arguments, e.g. ['--print', 'explain this repo']
   * @returns {ClaudeCodeAdapter} this, for chaining
   */
  start(args = []) {
    if (this.child) {
      throw new Error('ClaudeCodeAdapter: a session is already running');
    }

    try {
      this.child = spawn(this.binary, args, {
        cwd: this.cwd,
        env: this.env,
        shell: false,
      });
    } catch (err) {
      this.emit('error', err);
      return this;
    }

    this.child.stdout.on('data', (buf) => this._handleStdout(buf));
    this.child.stderr.on('data', (buf) => this.emit('error-data', buf.toString('utf8')));

    this.child.on('error', (err) => {
      // Typically ENOENT when the claude binary isn't installed / not on PATH
      this.emit('error', err);
    });

    this.child.on('exit', (code) => {
      if (this._stdoutBuffer.length > 0) {
        this.emit('line', this._stdoutBuffer);
        this._stdoutBuffer = '';
      }
      this.emit('exit', code);
      this.child = null;
    });

    return this;
  }

  _handleStdout(buf) {
    const chunk = buf.toString('utf8');
    this.emit('data', chunk);

    this._stdoutBuffer += chunk;
    const lines = this._stdoutBuffer.split('\n');
    this._stdoutBuffer = lines.pop(); // keep incomplete last line in buffer
    for (const line of lines) {
      this.emit('line', line);
    }
  }

  /**
   * Sends text to the running CLI session's stdin (for interactive mode).
   * @param {string} text
   */
  send(text) {
    if (!this.child || !this.child.stdin.writable) {
      throw new Error('ClaudeCodeAdapter: no active session to write to');
    }
    this.child.stdin.write(text.endsWith('\n') ? text : text + '\n');
  }

  /**
   * Gracefully ends the current session.
   */
  stop() {
    if (this.child) {
      this.child.stdin.end();
      this.child.kill('SIGTERM');
    }
  }

  /**
   * Runs a one-shot Claude Code CLI command and resolves with the full stdout.
   * Convenience method for non-interactive calls.
   * @param {string[]} args
   * @returns {Promise<{ stdout: string, code: number }>}
   */
  run(args = []) {
    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      const proc = spawn(this.binary, args, { cwd: this.cwd, env: this.env, shell: false });

      proc.stdout.on('data', (b) => { stdout += b.toString('utf8'); });
      proc.stderr.on('data', (b) => { stderr += b.toString('utf8'); });
      proc.on('error', reject);
      proc.on('exit', (code) => {
        if (code === 0) {
          resolve({ stdout, code });
        } else {
          const err = new Error(`Claude Code CLI exited with code ${code}: ${stderr}`);
          err.stdout = stdout;
          err.stderr = stderr;
          err.code = code;
          reject(err);
        }
      });
    });
  }
}

module.exports = ClaudeCodeAdapter;
