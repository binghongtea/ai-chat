import { useState, useRef, useEffect, type ChangeEvent } from 'react'
import { useChat } from './hooks/useChat'
import { readTextFile } from './hooks/useFileReader'
import './styles/App.scss'

function App() {
  const {
    messages,
    loading,
    vectorLoading,
    vectorReady,
    sendMessage,
    uploadDoc,
    clearChat
  } = useChat()

  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() =>
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  , [messages])

  const handleSend = () => {
    sendMessage(input)
    setInput('')
  }

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0]
    if (!file) return

    try {
      const text = await readTextFile(file)
      await uploadDoc(text)
      alert('Document loaded. You can ask questions now.')
    } catch (err) {
      console.error(err)
      alert('Failed to load document.')
    } finally {
      e.currentTarget.value = ''
    }
  }

  return (
    <div className="ai-chat-app">
      <div className="ai-chat-header">
        <div className="ai-avatar">AI</div>
        <h1 className="ai-chat-title">向量 RAG 问答助手</h1>
        <button onClick={clearChat} className="clear-btn">清空对话</button>
      </div>

      <div className="upload-bar">
        <label className="upload-btn">
          <input
            type="file"
            accept=".txt"
            onChange={handleFileChange}
            style={{ display: 'none' }}
            disabled={vectorLoading}
          />
          {vectorLoading ? '⏳ 向量化中...' : '📎 上传 TXT 文档'}
        </label>

        {vectorLoading && <span className="doc-tip">⏳ 处理中...</span>}
        {vectorReady && !vectorLoading && <span className="doc-tip">✅ 向量库已就绪</span>}
      </div>

      <div className="ai-chat-body">
        {messages.length === 0 && (
          <div className="ai-empty-tip">
            上传长文档后，AI 会智能检索相关内容回答
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`ai-message ${msg.role}`}>
            <div className="ai-message-avatar">
              {msg.role === 'user' ? '我' : 'AI'}
            </div>
            <div className="ai-message-bubble">{msg.content}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="ai-chat-footer">
        <div className="ai-input-bar">
          <textarea
            className="ai-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="输入问题..."
          />
          <button
            className="ai-send-btn"
            onClick={handleSend}
            disabled={loading || !input.trim()}
          >
            ↑
          </button>
        </div>
        <div className="ai-tip">AI 生成内容仅供参考</div>
      </div>
    </div>
  )
}

export default App
