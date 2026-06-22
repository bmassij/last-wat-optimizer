/** Resize/compress image file before vision API (smaller = faster + fewer rate limits). */
export async function compressImageFile(
  file: File,
  maxWidth = 960,
  quality = 0.78,
): Promise<{ base64: string; mimeType: string }> {
  if (file.size < 400_000 && file.type === "image/jpeg") {
    return readFileAsBase64(file);
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width);
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return readFileAsBase64(file);

  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return readFileAsBase64(file);

  return { mimeType: match[1], base64: match[2] };
}

function readFileAsBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const match = result.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        reject(new Error("Invalid image data"));
        return;
      }
      resolve({ mimeType: match[1], base64: match[2] });
    };
    reader.onerror = () => reject(reader.error ?? new Error("Read failed"));
    reader.readAsDataURL(file);
  });
}
