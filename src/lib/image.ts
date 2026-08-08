export const MAX_EDGE = 1000
export const JPEG_QUALITY = 0.7
export const TARGET_BYTES = 150 * 1024

/**
 * Longest edge capped at MAX_EDGE, aspect ratio preserved, never upscaled.
 * Pure arithmetic so it can be tested without a canvas.
 */
export function computeTargetSize(
  width: number,
  height: number,
  maxEdge: number = MAX_EDGE,
): { width: number; height: number } {
  const longest = Math.max(width, height)
  if (longest <= maxEdge) return { width, height }
  const scale = maxEdge / longest
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

/**
 * Browser-only. Resizes to MAX_EDGE and encodes JPEG at JPEG_QUALITY,
 * stepping quality down if the result still exceeds TARGET_BYTES.
 * Spec 7.3.
 */
export async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const { width, height } = computeTargetSize(bitmap.width, bitmap.height)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    throw new Error('Canvas 2D context unavailable')
  }
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const encode = (quality: number) =>
    new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Image encoding failed'))),
        'image/jpeg',
        quality,
      )
    })

  let quality = JPEG_QUALITY
  let blob = await encode(quality)
  // Photos of paper compress well; three steps is ample and bounded.
  while (blob.size > TARGET_BYTES && quality > 0.4) {
    quality -= 0.1
    blob = await encode(quality)
  }
  return blob
}
