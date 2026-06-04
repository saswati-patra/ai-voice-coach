export const INPUT_SAMPLE_RATE = 16000;
export const OUTPUT_SAMPLE_RATE = 24000;

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}

export function parseSampleRate(mimeType: string | undefined, fallback: number): number {
  const match = /rate=(\d+)/.exec(mimeType || "");
  return match ? Number(match[1]) : fallback;
}

export function downsampleToPcm16(
  samples: Float32Array<ArrayBufferLike>,
  sourceSampleRate: number,
  targetSampleRate: number
): ArrayBuffer {
  if (sourceSampleRate === targetSampleRate) {
    return floatToPcm16(samples);
  }

  const ratio = sourceSampleRate / targetSampleRate;
  const outputLength = Math.floor(samples.length / ratio);
  const output = new Float32Array(outputLength);

  for (let index = 0; index < outputLength; index += 1) {
    const start = Math.floor(index * ratio);
    const end = Math.min(Math.floor((index + 1) * ratio), samples.length);
    let total = 0;

    for (let sampleIndex = start; sampleIndex < end; sampleIndex += 1) {
      total += samples[sampleIndex];
    }

    output[index] = total / Math.max(1, end - start);
  }

  return floatToPcm16(output);
}

export function floatToPcm16(samples: Float32Array<ArrayBufferLike>): ArrayBuffer {
  const buffer = new ArrayBuffer(samples.length * 2);
  const view = new DataView(buffer);

  samples.forEach((sample, index) => {
    const clipped = Math.max(-1, Math.min(1, sample));
    const value = clipped < 0 ? clipped * 0x8000 : clipped * 0x7fff;
    view.setInt16(index * 2, value, true);
  });

  return buffer;
}

export function pcm16ToFloat32(buffer: ArrayBuffer): Float32Array {
  const view = new DataView(buffer);
  const samples = new Float32Array(buffer.byteLength / 2);

  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = view.getInt16(index * 2, true) / 0x8000;
  }

  return samples;
}

export function buildRecorderWorkletUrl(): string {
  const code = `
    class PcmRecorderProcessor extends AudioWorkletProcessor {
      process(inputs) {
        const channel = inputs[0]?.[0];
        if (channel) {
          this.port.postMessage(channel.slice(0));
        }
        return true;
      }
    }

    registerProcessor("pcm-recorder", PcmRecorderProcessor);
  `;

  return URL.createObjectURL(new Blob([code], { type: "application/javascript" }));
}
