import { useState } from 'react'
import { useVectorStore } from './useVectorStore'

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const { retrieve, loadDocument, ready, loading: vecLoading, clearStore } = useVectorStore()

  // 上传文档并构建向量库
  async function uploadDoc(text: string) {
    await loadDocument(text)
  }

  const sendMessage = async (inputText: string) => {
    if (!inputText.trim()) return
    setLoading(true)

    const userMessage: Message = { role: 'user', content: inputText }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      // 1. 从向量库拿到最相关的片段
      const relevantText = await retrieve(inputText)

      // 2. 构造带参考内容的 prompt
      let finalUserMessage = userMessage

      if (relevantText) {
        const prompt = `
请只根据下面内容回答，不要编造。
参考内容：
${relevantText}

用户问题：${inputText}
        `.trim()
        finalUserMessage = { role: 'user', content: prompt }
      }

      // 3. 历史对话 + 当前问题
      const messagesForModel = [
        ...newMessages.slice(0, -1),
        finalUserMessage
      ]

      const res = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen:0.5b',
          messages: messagesForModel,
          stream: true,
        }),
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
          } catch {
            continue
          }
        }
      }
    } catch (err) {
      console.error('请求失败', err)
    } finally {
      setLoading(false)
    }
  }

  const clearChat = () => {
    setMessages([])
    clearStore()
  }

  return {
    messages,
    loading,
    vectorLoading: vecLoading,
    vectorReady: ready,
    sendMessage,
    uploadDoc,
    clearChat,
  }
}
