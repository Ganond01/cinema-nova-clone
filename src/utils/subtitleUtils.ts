export interface JsonSubtitleSegment {
  start_seconds: number;
  end_seconds: number;
  text: string;
  isSilence?: boolean;
}

/**
  Formats seconds into WebVTT timestamp format (HH:MM:SS.mmm)
 */
export function formatVttTimestamp(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  const pad = (num: number, size: number) => String(num).padStart(size, '0');
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.round((seconds % 1) * 1000);

  return `${pad(hrs, 2)}:${pad(mins, 2)}:${pad(secs, 2)}.${pad(millis, 3)}`;
}

/**
 * Utility function jsonToVtt:
 * Parses array of JSON subtitle segments ({ start_seconds, end_seconds, text })
 * and converts them into standard WebVTT string format with timestamps.
 */
export function jsonToVtt(segments: JsonSubtitleSegment[]): string {
  let vtt = 'WEBVTT\n\n';

  if (!Array.isArray(segments)) return vtt;

  segments.forEach((seg, idx) => {
    if (seg.isSilence || !seg.text) return;
    const start = formatVttTimestamp(seg.start_seconds);
    const end = formatVttTimestamp(seg.end_seconds || seg.start_seconds + 3);
    vtt += `${idx + 1}\n`;
    vtt += `${start} --> ${end}\n`;
    vtt += `${seg.text.trim()}\n\n`;
  });

  return vtt;
}

/**
 * Creates a Data URL or Blob Object URL for WebVTT content
 */
export function createVttBlobUrl(vttContent: string): string {
  const blob = new Blob([vttContent], { type: 'text/vtt;charset=utf-8' });
  return URL.createObjectURL(blob);
}
