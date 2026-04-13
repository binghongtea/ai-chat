import { useState } from 'react'
import { splitText } from './useTextSplitter'
import { getEmbedding, searchMostRelevant } from './useEmbedding'

interface Chunk {
  text: string
  vector: number[]
}

export function useVectorStore() {
  const [chunks, setChunks] = useState<Chunk[]>([])
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  // 加载文档 → 切块 → 向量化
  async function loadDocument(text: string) {
    setLoading(true)
    setReady(false)

    try {
      const pieces = splitText(text, 300, 50)
      const vecChunks: Chunk[] = []

      for (const piece of pieces) {
        const vec = await getEmbedding(piece)
        vecChunks.push({ text: piece, vector: vec })
      }

      setChunks(vecChunks)
      setReady(true)
      return vecChunks.length
    } catch (err) {
      console.error('向量化失败', err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // 查询相关片段
  async function retrieve(query: string) {
    if (chunks.length === 0) return ''
    const queryVec = await getEmbedding(query)
    return searchMostRelevant(queryVec, chunks, 3)
  }

  function clearStore() {
    setChunks([])
    setReady(false)
    setLoading(false)
  }

  return {
    chunks,
    ready,
    loading,
    loadDocument,
    retrieve,
    clearStore,
  }
}