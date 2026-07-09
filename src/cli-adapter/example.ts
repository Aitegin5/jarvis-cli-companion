// Demo: run `ts-node src/cli-adapter/example.ts` to see the adapter in action.
// Requires the Claude Code CLI ('claude') installed and on PATH.

import { ClaudeCodeAdapter } from './claudeCodeAdapter';
import { CliNotFoundError, CliProcessError, CliTimeoutError } from './types';

async function main() {
  const adapter = new ClaudeCodeAdapter({ defaultTimeoutMs: 60_000 });

  // Live-stream raw output as it arrives.
  adapter.on('stdout', (chunk: string) => process.stdout.write(chunk));
  adapter.on('stderr', (chunk: string) => process.stderr.write(`[stderr] ${chunk}`));

  try {
    console.log('\n--- Turn 1 ---');
    const first = await adapter.runCommand('List the files in the current directory.');
    console.log('\n\nParsed segments (turn 1):', first.segments.length);

    console.log('\n--- Turn 2 (uses session context from turn 1) ---');
    const second = await adapter.runCommand('Now explain what the largest file does.');
    console.log('\n\nParsed segments (turn 2):', second.segments.length);

    console.log('\nSession history length:', adapter.getHistory().length);
  } catch (err) {
    if (err instanceof CliNotFoundError) {
      console.error('\nClaude Code CLI is not installed or not on PATH.');
    } else if (err instanceof CliTimeoutError) {
      console.error('\nCLI call timed out.');
    } else if (err instanceof CliProcessError) {
      console.error(`\nCLI exited with code ${err.exitCode}: ${err.stderr}`);
    } else {
      console.error('\nUnexpected error:', err);
    }
    process.exitCode = 1;
  }
}

main();
