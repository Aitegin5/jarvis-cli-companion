// Shared types for the Claude Code CLI adapter.

export type CliChunkType = 'stdout' | 'stderr' | 'error' | 'exit';

export interface CliChunk {
  type: CliChunkType;
  /** Raw text of this chunk (for 'exit' this is empty, see exitCode). */
  data: string;
  /** Populated only when type === 'exit'. */
  exitCode?: number | null;
  timestamp: number;
}

export type ParsedSegmentType = 'text' | 'code' | 'stderr';

export interface ParsedSegment {
  type: ParsedSegmentType;
  content: string;
  /** Language hint for 'code' segments, e.g. 'ts', 'bash'. Undefined if unknown. */
  language?: string;
}

export interface SessionTurn {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface RunOptions {
  /** Working directory for the CLI process. Defaults to process.cwd(). */
  cwd?: string;
  /** Milliseconds before the process is killed. Defaults to 120_000. */
  timeoutMs?: number;
  /** Extra CLI flags appended after the prompt. */
  extraArgs?: string[];
  /** If true, prior turns in the session are folded into the prompt as context. Default true. */
  useHistory?: boolean;
}

export interface RunResult {
  stdout: string;
  stderr: string;
  segments: ParsedSegment[];
  exitCode: number | null;
  timedOut: boolean;
}

export class CliNotFoundError extends Error {
  constructor(binary: string) {
    super(`Claude Code CLI executable not found: "${binary}". Is it installed and on PATH?`);
    this.name = 'CliNotFoundError';
  }
}

export class CliTimeoutError extends Error {
  constructor(ms: number) {
    super(`Claude Code CLI did not respond within ${ms}ms and was terminated.`);
    this.name = 'CliTimeoutError';
  }
}

export class CliProcessError extends Error {
  constructor(public exitCode: number | null, public stderr: string) {
    super(`Claude Code CLI exited with code ${exitCode}: ${stderr.slice(0, 500)}`);
    this.name = 'CliProcessError';
  }
}
