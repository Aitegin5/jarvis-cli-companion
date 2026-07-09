// Parses raw Claude Code CLI stdout/stderr into structured segments:
// plain text, fenced code blocks (with language hint), and stderr lines.

import { ParsedSegment } from './types';

const FENCE_RE = /```(\w*)\n([\s\S]*?)```/g;

/**
 * Splits stdout into alternating text/code segments based on markdown
 * fenced code blocks (```lang ... ```), which is how Claude Code CLI
 * formats code in its terminal output.
 */
export function parseStdout(stdout: string): ParsedSegment[] {
  const segments: ParsedSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  FENCE_RE.lastIndex = 0;
  while ((match = FENCE_RE.exec(stdout)) !== null) {
    const [full, lang, code] = match;
    const start = match.index;

    if (start > lastIndex) {
      const text = stdout.slice(lastIndex, start);
      if (text.trim().length > 0) {
        segments.push({ type: 'text', content: text });
      }
    }

    segments.push({
      type: 'code',
      content: code.replace(/\n$/, ''),
      language: lang || undefined,
    });

    lastIndex = start + full.length;
  }

  if (lastIndex < stdout.length) {
    const tail = stdout.slice(lastIndex);
    if (tail.trim().length > 0) {
      segments.push({ type: 'text', content: tail });
    }
  }

  return segments;
}

/** Wraps non-empty stderr output as a single stderr segment. */
export function parseStderr(stderr: string): ParsedSegment[] {
  if (!stderr || stderr.trim().length === 0) return [];
  return [{ type: 'stderr', content: stderr }];
}

/** Combines stdout + stderr parsing into one ordered segment list. */
export function parseCliOutput(stdout: string, stderr: string): ParsedSegment[] {
  return [...parseStdout(stdout), ...parseStderr(stderr)];
}
