import { useState, useRef, useEffect } from 'react'
import { useChat } from './hooks/useChat'
import { readTextFile } from './hooks/useFileReader'
import './styles/App.scss'

function App() {
  const {
    messages,
    loading,
    model,
    setModel,
    dark,
    setDark,
    docs,
    vectorLoading,
    vectorReady,
    sendMessage,
    uploadDoc,
    clearChat,
    clearStore,
    exportChat,
  } = useChat()

  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    sendMessage(input)
    setInput('')
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    for (const file of files) {
      try {
        const text = await readTextFile(file)
        await uploadDoc(file.name, text)
      } catch (err) {
        alert('处理失败：' + err)
      }
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className={`ai-chat-app ${dark ? 'dark' : ''}`}>
      <div className="ai-chat-header">
        <div className="ai-avatar">AI</div>
        <h1 className="ai-chat-title">RAG 知识库助手</h1>

        <div className="control-bar">
          <select className="model-select" value={model} onChange={(e) => setModel(e.target.value)}>
            <option value="qwen:0.5b">qwen:0.5b</option>
            <option value="qwen:2b">qwen:2b</option>
            <option value="llama3:8b">llama3:8b</option>
          </select>

          <button className="theme-toggle" onClick={() => setDark(!dark)}>
            {dark ? '☀️' : '🌙'}
          </button>

          <button className="export-btn" onClick={exportChat}>导出</button>
          <button onClick={clearChat} className="clear-btn">清空对话</button>
        </div>
      </div>

      <div className="upload-bar">
        <label className="upload-btn">
          <input
            type="file"
            accept=".txt"
            multiple
            onChange={handleFileChange}
            style={{ display: 'none' }}
            disabled={vectorLoading}
          />
          {vectorLoading ? '处理中...' : '📎 上传文档'}
        </label>

        {docs.length > 0 && (
          <button className="clear-btn" onClick={clearStore}>清空知识库</button>
        )}

        {vectorLoading && <span className="doc-tip">⏳ 向量化中</span>}
        {vectorReady && !vectorLoading && <span className="doc-tip">✅ 知识库就绪</span>}
      </div>

      {docs.length > 0 && (
        <div className="doc-list">
          <span>已上传：</span>
          {docs.map((d, i) => (
            <span key={i} className="doc-tag">{d.name}</span>
          ))}
        </div>
      )}

      <div className="ai-chat-body">
        {messages.length === 0 && (
          <div className="ai-empty-tip">
            上传文档后提问，AI 将从知识库检索回答
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`ai-message ${msg.role}`}>
            <div className="ai-message-avatar">
              {msg.role === 'user' ? '我' : 'AI'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="ai-message-bubble">{msg.content}</div>
              {msg.role === 'assistant' && msg.content && (
                <button className="copy-btn" onClick={() => copyToClipboard(msg.content)}>
                  复制
                </button>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="ai-message assistant">
            <div className="ai-message-avatar">AI</div>
            <div className="ai-message-bubble">
              <div className="loading-wave"><span></span><span></span><span></span></div>
            </div>
          </div>
        )}

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