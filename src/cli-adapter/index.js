const { spawn } = require('child_process');
const { EventEmitter } = require('events');

/**
 * CliAdapter
 * Wraps the Claude Code CLI as a child process, streams stdout/stderr
 * as events, and exposes a simple promise-based API so the Orchestrator
 * never has to touch a terminal directly.
 */
class CliAdapter extends EventEmitter {
  constructor(options = {}) {
    super();
    this.binary = options.binary || 'claude';
    this.cwd = options.cwd || process.cwd();
    this.child = null;
  }

  /**
   * Runs a Claude Code CLI command and resolves with the full stdout.
   * Emits 'data' events for streaming consumers (e.g. voice/UI layer).
   */
  run(args = [], { input } = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn(this.binary, args, {
        cwd: this.cwd,
        shell: false,
      });
      this.child = child;

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (chunk) => {
        const text = chunk.toString();
        stdout += text;
        this.emit('data', text);
      });

      child.stderr.on('data', (chunk) => {
        const text = chunk.toString();
        stderr += text;
        this.emit('error-data', text);
      });

      child.on('close', (code) => {
        this.child = null;
        if (code === 0) {
          resolve({ stdout, stderr, code });
        } else {
          const err = new Error(`claude CLI exited with code ${code}`);
          err.stdout = stdout;
          err.stderr = stderr;
          reject(err);
        }
      });

      child.on('error', (err) => {
        this.child = null;
        reject(err);
      });

      if (input) {
        child.stdin.write(input);
      }
      child.stdin.end();
    });
  }

  /** Sends a natural-language prompt to Claude Code CLI. */
  async prompt(text, extraArgs = []) {
    const result = await this.run(['-p', text, ...extraArgs]);
    return result.stdout.trim();
  }

  /** Kills the currently running CLI process, if any. */
  cancel() {
    if (this.child) {
      this.child.kill('SIGTERM');
      this.child = null;
    }
  }
}

module.exports = { CliAdapter };
