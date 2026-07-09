// Claude Code CLI Adapter
// Spawns the Claude Code CLI process, sends commands, streams output.

import { spawn } from 'child_process';

export class ClaudeCodeAdapter {
  runCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // TODO: spawn Claude Code CLI process with `command`,
      // capture stdout/stderr, resolve with combined output
      reject(new Error('Not implemented yet'));
    });
  }
}
