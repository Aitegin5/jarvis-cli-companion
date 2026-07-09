// Keeps a rolling conversation history per session so multiple
// CLI invocations can share context (Claude Code CLI itself is
// stateless per spawn, so we fold prior turns into the next prompt).

import { SessionTurn } from './types';

export class CliSession {
  private turns: SessionTurn[] = [];

  constructor(private readonly maxTurns: number = 20) {}

  addUserTurn(content: string): void {
    this.push({ role: 'user', content, timestamp: Date.now() });
  }

  addAssistantTurn(content: string): void {
    this.push({ role: 'assistant', content, timestamp: Date.now() });
  }

  private push(turn: SessionTurn): void {
    this.turns.push(turn);
    if (this.turns.length > this.maxTurns) {
      this.turns.splice(0, this.turns.length - this.maxTurns);
    }
  }

  getHistory(): SessionTurn[] {
    return [...this.turns];
  }

  clear(): void {
    this.turns = [];
  }

  /**
   * Builds a single prompt string that folds prior turns in as context,
   * followed by the new user message. Used because a fresh CLI process
   * has no memory of previous invocations.
   */
  buildPromptWithContext(newMessage: string): string {
    if (this.turns.length === 0) return newMessage;

    const historyBlock = this.turns
      .map((t) => `${t.role === 'user' ? 'User' : 'Assistant'}: ${t.content}`)
      .join('\n');

    return [
      'Context from earlier in this conversation (for reference only):',
      historyBlock,
      '',
      'New request:',
      newMessage,
    ].join('\n');
  }
}
