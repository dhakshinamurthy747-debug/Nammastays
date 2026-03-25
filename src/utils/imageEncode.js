/**
 * Resize image file in-browser and return JPEG data URL for localStorage persistence.
 * @param {File} file
 * @param {number} maxEdge
 * @param {number} quality 0..1
 * @returns {Promise<string>}
 */
export function fileToResizedDataUrl(file, maxEdge = 1600, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      try {
        let { width, height } = img
        const max = Math.max(width, height)
        if (max > maxEdge) {
          const scale = maxEdge / max
          width = Math.round(width * scale)
          height = Math.round(height * scale)
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas unsupported'))
          return
        }
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      } catch (e) {
        reject(e)
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Image load failed'))
    }
    img.src = url
  })
}

const MAX_PHOTOS = 8
const MAX_TOTAL_CHARS = 4_200_000

/**
 * @param {{ file: File }[]} photoItems
 * @param {(msg: string) => void} onWarn
 * @returns {Promise<string[]>}
 */
export async function encodePhotosForStorage(photoItems, onWarn) {
  const items = (photoItems || []).slice(0, MAX_PHOTOS)
  if (items.length === 0) return []
  const urls = []
  let total = 0
  for (const item of items) {
    if (!item?.file) continue
    const dataUrl = await fileToResizedDataUrl(item.file)
    total += dataUrl.length
    if (total > MAX_TOTAL_CHARS) {
      onWarn('Photo bundle too large for browser storage — using the first images only.')
      break
    }
    urls.push(dataUrl)
  }
  return urls
}
