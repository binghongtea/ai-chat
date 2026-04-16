import { useState } from 'react'
import { useVectorStore } from './useVectorStore'

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [model, setModel] = useState('qwen:0.5b')
  const [dark, setDark] = useState(false)

  const { docs, retrieve, addDocument, ready, loading: vecLoading, clearStore } = useVectorStore()

  async function uploadDoc(filename: string, text: string) {
    try {
      return await addDocument(filename, text)
    } catch (err) {
      console.error(err)
      throw new Error('文档处理失败')
    }
  }

  const sendMessage = async (inputText: string) => {
    if (!inputText.trim()) return
    setLoading(true)

    const userMessage: Message = { role: 'user', content: inputText }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      const relevantText = await retrieve(inputText)
      let finalMsg = userMessage

      if (relevantText) {
        const prompt = `
仅依据以下内容回答，不要编造。
参考内容：
${relevantText}

问题：${inputText}
        `.trim()
        finalMsg = { role: 'user', content: prompt }
      }

      const messagesForModel = [
        ...newMessages.slice(0, -1),
        finalMsg
      ]

      const res = await fetch('http://localhost:1143/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: messagesForModel, stream: true }),
      })

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) return

      let fullText = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(Boolean)

        for (const line of lines) {
          try {
            const data = JSON.parse(line)
            const delta = data.message?.content || ''
            fullText += delta
            setMessages(prev => {
              const next = [...prev]
              next[next.length - 1].content = fullText
              return next
            })
          } catch { }
        }
      }
    } catch (err) {
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: '请求失败，请检查 Ollama 是否启动' }
      ])
    } finally {
      setLoading(false)
    }
  }

  const clearChat = () => setMessages([])

  // 导出聊天记录
  const exportChat = () => {
    const content = messages
      .map(m => `[${m.role === 'user' ? '我' : 'AI'}]\n${m.content}\n`)
      .join('\n')
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `聊天记录_${new Date().getTime()}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return {
    messages,
    loading,
    model,
    setModel,
    dark,
    setDark,
    docs,
    vectorLoading: vecLoading,
    vectorReady: ready,
    sendMessage,
    uploadDoc,
    clearChat,
    clearStore,
    exportChat,
  }
}