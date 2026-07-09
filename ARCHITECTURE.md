# Architecture

## Goal

Wrap Claude Code CLI so a non-technical user can operate it through a normal chat/voice interface, entirely with free and open-source tooling (aside from the LLM API call itself).

## Components

### 1. Core Orchestrator (`src/core/`)
Receives user input (text or transcribed voice), maintains conversation/session state, decides which Claude Code CLI command(s) to run, and formats the CLI's raw output into a natural human-readable reply.

### 2. CLI Adapter (`src/cli-adapter/`)
Spawns the Claude Code CLI as a child process, sends commands, captures stdout/stderr, streams output back to the orchestrator in real time. Handles error parsing and retries.

### 3. Voice Layer (`src/voice/`)
- STT: whisper.cpp (local, open source) transcribes Russian speech to text.
- TTS: Silero (local, open source, Russian-tuned) synthesizes natural-sounding speech from Jarvis's replies.
- Both run on local hardware — no cloud voice API, no per-request cost.

### 4. Interface
A lightweight UI (web or desktop) sits on top so the user never touches a terminal. Text input/output plus a mic button for voice.

## Data flow

```
User speech --> whisper.cpp (STT) --> text
text --> Core Orchestrator --> command --> CLI Adapter --> Claude Code CLI
Claude Code CLI output --> CLI Adapter --> Orchestrator --> natural-language reply
reply --> Silero (TTS) --> spoken response
```

## Constraints

- No paid APIs or SaaS voice services.
- Must run locally where possible (voice stack).
- LLM calls go through the standard Anthropic API used by Claude Code CLI itself — this is the one external API call in the pipeline.

## Status

Scaffold stage. Next steps: implement CLI Adapter process spawning, then wire up Orchestrator, then integrate voice layer.
