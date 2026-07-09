# CLI Adapter

This module wraps the Claude Code CLI as a child process so the rest of
Jarvis (orchestrator, voice layer, UI) never has to shell out directly
or parse raw terminal output.

## Usage

```js
const { CliAdapter } = require('./index');

const adapter = new CliAdapter({ binary: 'claude', cwd: process.cwd() });

adapter.on('data', (chunk) => {
  // stream partial output to the UI or voice layer
  console.log(chunk);
});

const answer = await adapter.prompt('Explain this repo structure');
console.log(answer);
```

## API

- `new CliAdapter({ binary, cwd })` — create an adapter instance.
- `adapter.run(args, { input })` — run raw CLI args, resolves `{ stdout, stderr, code }`.
- `adapter.prompt(text, extraArgs)` — convenience wrapper for a single natural-language prompt.
- `adapter.cancel()` — kills the active CLI process.
- Events: `data` (stdout chunk), `error-data` (stderr chunk).

## Requirements

- Claude Code CLI installed and available on `PATH` (or pass a custom `binary` path).
- Node.js 18+.

## Next steps

- Add structured parsing of CLI output (JSON mode if/when CLI supports it).
- Add timeout/retry handling for long-running commands.
- Wire into `src/orchestrator` so prompts route through memory + context before hitting the CLI.
