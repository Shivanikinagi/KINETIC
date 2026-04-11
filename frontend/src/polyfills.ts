import { Buffer } from "buffer";

declare global {
  interface Window {
    global: typeof globalThis;
    process: { env: Record<string, string> };
    Buffer: typeof Buffer;
  }
}

if (!(globalThis as Record<string, unknown>).global) {
  (globalThis as Record<string, unknown>).global = globalThis;
}

if (!(window as unknown as Record<string, unknown>).global) {
  window.global = globalThis;
}

if (!(globalThis as Record<string, unknown>).process) {
  (globalThis as Record<string, unknown>).process = { env: {} };
}

if (!(window as unknown as Record<string, unknown>).process) {
  window.process = { env: {} };
}

if (!(globalThis as Record<string, unknown>).Buffer) {
  (globalThis as Record<string, unknown>).Buffer = Buffer;
}

if (!(window as unknown as Record<string, unknown>).Buffer) {
  window.Buffer = Buffer;
}

export {};