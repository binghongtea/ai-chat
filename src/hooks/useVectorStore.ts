import { useState, useEffect } from 'react'
import { splitText } from './useTextSplitter'
import { getEmbedding, searchMostRelevant } from './useEmbedding'

interface Chunk {
  text: string
  vector: number[]
}

interface StoredDoc {
  name: string
  chunks: Chunk[]
}

export function useVectorStore() {
  const [docs, setDocs] = useState<StoredDoc[]>([])
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  // 从 localStorage 加载知识库
  useEffect(() => {
    const saved = localStorage.getItem('vectorStore')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setDocs(parsed)
        setReady(true)
      } catch {}
    }
  }, [])

  // 保存到 localStorage
  const saveToLocal = (newDocs: StoredDoc[]) => {
    localStorage.setItem('vectorStore', JSON.stringify(newDocs))
  }

  // 添加文档
  async function addDocument(filename: string, text: string) {
    setLoading(true)
    setReady(false)
    try {
      const pieces = splitText(text, 300, 50)
      const chunks: Chunk[] = []

      for (const p of pieces) {
        const vec = await getEmbedding(p)
        chunks.push({ text: p, vector: vec })
      }

      const newDocs = [...docs, { name: filename, chunks }]
      setDocs(newDocs)
      saveToLocal(newDocs)
      setReady(true)
      return chunks.length
    } catch (err) {
      console.error('向量化失败', err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // 检索所有文档
  async function retrieve(query: string) {
    if (docs.length === 0) return ''

    const queryVec = await getEmbedding(query)
    let allChunks: Chunk[] = []
    docs.forEach(d => allChunks = allChunks.concat(d.chunks))

    return searchMostRelevant(queryVec, allChunks, 4)
  }

  // 清空所有文档
  function clearStore() {
    setDocs([])
    setReady(false)
    localStorage.removeItem('vectorStore')
  }

  return {
    docs,
    ready,
    loading,
    addDocument,
    retrieve,
    clearStore,
  }
}