# AI大模型入门

# 本地部署，最快解决方案：换成 **Ollama 本地模型**（完全无跨域、免费、离线可用）

不用 API Key、不用翻墙、不会跨域！

## 步骤 1：安装 Ollama（1 分钟）

官网下载安装（支持 Windows/Mac）：

https://ollama.com/

## 步骤 2：启动本地模型

安装完打开 **终端 / CMD**，运行：

bash

运行

```
ollama run qwen:0.5b
```

它会自动下载一个**超小、超快**的通义千问本地模型。

## 步骤 3：运行本地 API 服务

Ollama 默认开启接口：

plaintext

```
http://localhost:11434
```

**无跨域、前端可直接调用！**

------

## ✅ 步骤 4：替换前端代码（直接复制覆盖 App.tsx）

这是**可直接运行、无跨域**的 React + 本地模型代码：

tsx











```
import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 发送到本地 Ollama 模型
  const sendMessage = async () => {
    if (!input.trim()) return

    const userMsg: Message = { role: 'user', content: input }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    const assistantMsg: Message = { role: 'assistant', content: '' }
    setMessages([...newMessages, assistantMsg])

    try {
      // 本地模型接口，无跨域！
      const res = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'qwen:0.5b',
          messages: newMessages,
          stream: true,
        }),
      })

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader!.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(Boolean)

        for (const line of lines) {
          try {
            const data = JSON.parse(line)
            const content = data.message?.content || ''
            if (content) {
              fullText += content
              setMessages((prev) => [
                ...prev.slice(0, -1),
                { role: 'assistant', content: fullText },
              ])
            }
          } catch (e) {}
        }
      }
    } catch (err) {
      console.error('本地模型调用失败', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 20 }}>
      <h2>本地 AI 聊天机器人（无跨域）</h2>
      <div
        style={{
          height: '60vh',
          overflowY: 'auto',
          border: '1px solid #eee',
          padding: 16,
          borderRadius: 8,
        }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              margin: '8px 0',
              textAlign: m.role === 'user' ? 'right' : 'left',
            }}
          >
            <div
              style={{
                display: 'inline-block',
                padding: '10px 14px',
                borderRadius: 15,
                backgroundColor: m.role === 'user' ? '#007bff' : '#f1f1f1',
                color: m.role === 'user' ? '#fff' : '#000',
              }}
            >
              {m.content}
            </div>
          </div>
        ))}
        <div ref={chatRef} />
      </div>

      <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #ddd' }}
          placeholder="输入消息..."
        />
        <button
          onClick={sendMessage}
          disabled={loading}
          style={{ padding: '10px 16px' }}
        >
          {loading ? '思考中...' : '发送'}
        </button>
      </div>
    </div>
  )
}

export default App
```

------

## ✅ 运行成功条件

1. Ollama 已安装
2. 终端运行过 `ollama run qwen:0.5b`
3. 前端 `npm run dev`

**现在绝对不会跨域！**
