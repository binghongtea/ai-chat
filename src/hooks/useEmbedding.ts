function normalize(vec: number[]) {
  let sumSq = 0
  for (let i = 0; i < vec.length; i++) sumSq += vec[i] * vec[i]
  const mag = Math.sqrt(sumSq) || 1
  return vec.map(v => v / mag)
}

// 把文本变成向量（Embedding）
// 说明：这里用“轻量哈希向量”代替大模型 embedding，避免前端下载大模型导致“上传没反应”的体验问题。
// 原理：把字符/词元映射到固定维度桶里做计数，再归一化；用于本地 RAG 的粗检索足够用。
export async function getEmbedding(text: string) {
  const dim = 256
  const vec = new Array<number>(dim).fill(0)

  const normalizedText = (text || '').toLowerCase()
  for (let i = 0; i < normalizedText.length; i++) {
    const code = normalizedText.charCodeAt(i)
    const idx = (code * 131 + i * 17) % dim
    vec[idx] += 1
  }

  return normalize(vec)
}

// 计算余弦相似度
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0
  let magA = 0
  let magB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    magA += a[i] ** 2
    magB += b[i] ** 2
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB))
}

// 从知识库找最相关的片段
export function searchMostRelevant(
  queryVec: number[],
  chunks: { text: string; vector: number[] }[],
  topK = 3
) {
  return chunks
    .map(item => ({
      text: item.text,
      score: cosineSimilarity(queryVec, item.vector)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(item => item.text)
    .join('\n---\n')
}
