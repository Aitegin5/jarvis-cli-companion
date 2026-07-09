# Jarvis CLI Companion

Jarvis is an open-source, human-friendly wrapper around Claude Code CLI. It gives people a normal chat and voice interface instead of a terminal — same power, none of the command-line friction.

## Why

Claude Code CLI is powerful but intimidating for non-terminal users. Jarvis sits on top of it: you talk or type normally, Jarvis translates that into Claude Code CLI commands, runs them, and reads back the results in plain language (and in Russian, with natural-sounding voice).

## Core principles

- Free and open source only — no paid APIs, no paid TTS/STT services.
- Local-first voice: Silero TTS for speech synthesis, whisper.cpp for speech recognition, both run on your own machine.
- LLM access via API (Anthropic API for Claude Code CLI integration).
- Node.js/TypeScript core.

## Project structure

```
src/
  core/          # Orchestrator: routes user intent to Claude Code CLI, manages sessions
  voice/         # Silero TTS + whisper.cpp STT integration
  cli-adapter/   # Wraps and parses Claude Code CLI process I/O
ARCHITECTURE.md  # Full technical design doc
```

## Status

Early scaffold — architecture and folder structure in place, implementation in progress.

## License

MIT
