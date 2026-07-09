# CLI Adapter

Wraps the Claude Code CLI so nothing above this layer (Orchestrator, voice module, UI) ever has to shell out or parse raw terminal output directly.

## Why

Jarvis exists to remove the terminal from the equation. This module is the only place in the codebase that actually spawns the `claude` process.

## Usage

### One-shot command

```js
const ClaudeCodeAdapter = require('./ClaudeCodeAdapter');

const adapter = new ClaudeCodeAdapter();

adapter.run(['--print', 'explain what this repo does'])
  .then(({ stdout }) => console.log(stdout))
  .catch((err) => console.error('CLI error:', err.message));
```

### Streaming / interactive session

```js
const adapter = new ClaudeCodeAdapter();

adapter.on('line', (line) => console.log('[claude]', line));
adapter.on('error-data', (chunk) => console.error('[claude:err]', chunk));
adapter.on('error', (err) => console.error('Failed to start Claude Code CLI:', err.message));
adapter.on('exit', (code) => console.log('Session ended with code', code));

adapter.start(['chat']);
adapter.send('Hello, Jarvis.');
// ... later
adapter.stop();
```

## Notes

- Requires the `claude` binary to be installed and available on `PATH` (or pass `binary: '/path/to/claude'` in the constructor options).
- No external dependencies — built entirely on Node's `child_process` and `events` core modules, in line with the project's free/open-source-only constraint.
- Errors from a missing/broken binary surface through the `error` event (or promise rejection for `run()`), never a crash.
