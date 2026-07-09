// Speech-to-Text via whisper.cpp (local, open source, Russian support)

export class WhisperSTT {
  async transcribe(audioBuffer: Buffer): Promise<string> {
    // TODO: call local whisper.cpp binary/bindings, return transcribed text (ru)
    throw new Error('Not implemented yet');
  }
}
