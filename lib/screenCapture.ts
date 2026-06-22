/** Capture a JPEG frame from a live video stream (screen share). */
export function captureVideoFrame(
  video: HTMLVideoElement,
  maxWidth = 1280,
  quality = 0.82,
): { base64: string; mimeType: string } | null {
  if (!video.videoWidth || !video.videoHeight) return null;

  const scale = Math.min(1, maxWidth / video.videoWidth);
  const w = Math.round(video.videoWidth * scale);
  const h = Math.round(video.videoHeight * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.drawImage(video, 0, 0, w, h);
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;

  return { mimeType: match[1], base64: match[2] };
}

/** Fast fingerprint — skip unchanged frames while scrolling pauses. */
export function frameFingerprint(base64: string): string {
  const sample = base64.length > 800 ? base64.slice(400, 1200) : base64;
  let h = 0;
  for (let i = 0; i < sample.length; i++) {
    h = ((h << 5) - h + sample.charCodeAt(i)) | 0;
  }
  return String(h);
}

export async function requestScreenStream(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    throw new Error("unsupported");
  }
  return navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: false,
  });
}
