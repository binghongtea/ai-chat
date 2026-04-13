// 简单按长度切块
export function splitText(text: string, chunkSize = 300, overlap = 50): string[] {
  const chunks: string[] = []
  let i = 0

  while (i < text.length) {
    const end = Math.min(i + chunkSize, text.length)
    chunks.push(text.slice(i, end))
    i += chunkSize - overlap
  }

  return chunks
}