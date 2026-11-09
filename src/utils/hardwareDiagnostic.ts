/**
 * Cinema Nova Full FFMPEG & GPU Hardware Diagnostic Suite
 * Comprehensive client & server hardware inspection in the developer console.
 */

export interface GpuHardwareInfo {
  available: boolean;
  encoder: string;
  details: string;
  diag?: {
    hwaccels?: string;
    encoders?: string[];
    nvencSupported?: boolean;
    ffmpegVersion?: string;
  };
}

export interface ClientHardwareInfo {
  gpuRenderer: string;
  gpuVendor: string;
  webglVersion: string;
  webgpuSupported: boolean;
  cores: number;
  memoryGb?: number;
  codecs: {
    h264: boolean;
    hevc: boolean;
    vp9: boolean;
    av1: boolean;
    aac: boolean;
    opus: boolean;
  };
}

export async function detectClientHardware(): Promise<ClientHardwareInfo> {
  let gpuRenderer = 'Unknown GPU';
  let gpuVendor = 'Unknown Vendor';
  let webglVersion = 'None';

  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (gl) {
      webglVersion = gl instanceof WebGL2RenderingContext ? 'WebGL 2.0' : 'WebGL 1.0';
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        gpuRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || gpuRenderer;
        gpuVendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || gpuVendor;
      } else {
        gpuRenderer = gl.getParameter(gl.RENDERER) || gpuRenderer;
        gpuVendor = gl.getParameter(gl.VENDOR) || gpuVendor;
      }
    }
  } catch {
    // WebGL disabled or unavailable
  }

  const webgpuSupported = typeof navigator !== 'undefined' && 'gpu' in navigator;
  const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;
  const memoryGb = typeof navigator !== 'undefined' && (navigator as any).deviceMemory ? (navigator as any).deviceMemory : undefined;

  const testCodec = (mime: string) => {
    if (typeof MediaSource !== 'undefined' && MediaSource.isTypeSupported) {
      return MediaSource.isTypeSupported(mime);
    }
    if (typeof document !== 'undefined') {
      const v = document.createElement('video');
      return !!(v.canPlayType && v.canPlayType(mime).replace(/no/, ''));
    }
    return false;
  };

  const codecs = {
    h264: testCodec('video/mp4; codecs="avc1.42E01E, mp4a.40.2"'),
    hevc: testCodec('video/mp4; codecs="hvc1.1.6.L93.B0"') || testCodec('video/mp4; codecs="hev1.1.6.L93.B0"'),
    vp9: testCodec('video/webm; codecs="vp9, opus"'),
    av1: testCodec('video/mp4; codecs="av01.0.05M.08"'),
    aac: testCodec('audio/mp4; codecs="mp4a.40.2"'),
    opus: testCodec('audio/webm; codecs="opus"'),
  };

  return {
    gpuRenderer,
    gpuVendor,
    webglVersion,
    webgpuSupported,
    cores,
    memoryGb,
    codecs,
  };
}

export async function runFullDiagnostics(): Promise<{ client: ClientHardwareInfo; server: GpuHardwareInfo | null }> {
  const client = await detectClientHardware();
  let server: GpuHardwareInfo | null = null;

  try {
    const res = await fetch('/api/check-gpu');
    if (res.ok) {
      server = await res.json();
    }
  } catch (err) {
    // Non-blocking in preview mode
  }

  // Beautifully formatted Console Logging
  console.groupCollapsed('%c🎬 CINEMA NOVA: ПЕРЕВІРКА FFMPEG ТА ВІДЕОКАРТИ (GPU)', 'background: #FF3040; color: white; font-weight: bold; font-size: 13px; padding: 4px 8px; border-radius: 4px;');
  
  console.log('%c🖥️ КЛІЄНТСЬКА ВІДЕОКАРТА & ОБЛАДНАННЯ:', 'color: #38bdf8; font-weight: bold;');
  console.table({
    'Відеокарта (GPU Renderer)': client.gpuRenderer,
    'Виробник (Vendor)': client.gpuVendor,
    'WebGL Версія': client.webglVersion,
    'WebGPU Підтримка': client.webgpuSupported ? '✅ Доступно' : '❌ Не підтримується',
    'Ядра CPU (Concurrency)': `${client.cores} threads`,
    'ОЗП (RAM)': client.memoryGb ? `${client.memoryGb} GB` : 'N/A',
  });

  console.log('%c⚡ АПАРАТНЕ ДЕКОДУВАННЯ ВІДЕОКОДЕКІВ (БРАУЗЕР):', 'color: #38bdf8; font-weight: bold;');
  console.table({
    'H.264 / AVC (Full HD / 4K)': client.codecs.h264 ? '✅ Підтримується' : '❌ Ні',
    'H.265 / HEVC (4K HDR)': client.codecs.hevc ? '✅ Підтримується' : '❌ Ні',
    'VP9 (WebM High-Bitrate)': client.codecs.vp9 ? '✅ Підтримується' : '❌ Ні',
    'AV1 (Next-Gen 8K)': client.codecs.av1 ? '✅ Підтримується' : '❌ Ні',
    'AAC Audio': client.codecs.aac ? '✅ Підтримується' : '❌ Ні',
    'Opus Audio': client.codecs.opus ? '✅ Підтримується' : '❌ Ні',
  });

  if (server) {
    console.log('%c🚀 СЕРВЕРНИЙ FFMPEG TRANSCODER & ХМАРНИЙ РЕНДЕР:', 'color: #4ade80; font-weight: bold;');
    console.table({
      'Активний кодек рендеру': server.encoder,
      'Статус апаратного GPU': server.available ? '✅ GPU NVENC/QSV АКТИВНО' : 'ℹ️ CPU Multi-core (libx264)',
      'Деталі середовища': server.details,
      'Підтримка NVENC': server.diag?.nvencSupported ? '✅ Так' : '❌ Ні (хмарний контейнер)',
      'Доступні Encoders': server.diag?.encoders?.length ? server.diag.encoders.join(', ') : 'libx264, aac',
    });
    if (server.diag?.hwaccels) {
      console.log('Методи апаратного прискорення (-hwaccels):', server.diag.hwaccels);
    }
  } else {
    console.log('%cℹ️ Серверний API перевірки FFmpeg не відповів (статичний режим)', 'color: #f59e0b;');
  }

  console.groupEnd();

  // Attach to window for manual testing anytime
  if (typeof window !== 'undefined') {
    (window as any).__CINEMA_NOVA_DIAGNOSTICS__ = { client, server };
    (window as any).runCinemaNovaDiagnostics = runFullDiagnostics;
  }

  return { client, server };
}
