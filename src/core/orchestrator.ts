// Core Orchestrator
// Routes user text/voice input to the Claude Code CLI adapter,
// manages session state, and formats replies for the user.

export class Orchestrator {
  constructor() {
    // TODO: initialize session state, load config
  }

  async handleUserInput(input: string): Promise<string> {
    // TODO: send input to CLI Adapter, get raw output, format reply
    throw new Error('Not implemented yet');
  }
}
