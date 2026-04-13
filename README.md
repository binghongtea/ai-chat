# AI大模型入门

# 本地部署，最快解决方案：换成 **Ollama 本地模型**（完全无跨域、免费、离线可用）

不用 API Key、不用翻墙、不会跨域！

## 重点关注

~~~
// res.body：fetch 返回的响应体流（二进制数据流）
// getReader()：创建一个读取器，用来一块一块读取数据
const reader = res.body?.getReader()

//创建解码器
const decoder = new TextDecoder()

// reader.read()：异步读取一块数据，返回一个 Promise，解析后是一个包含 done 和 value 的对象
// value：当前读取到的数据块（二进制数据流）
const { done, value } = await reader!.read()

// 解码数据块，把刚才读到的二进制 value → 文本字符串 chunk。
const chunk = decoder.decode(value)

// 按行切分（Ollama 固定格式）
const lines = chunk.split('\n').filter(Boolean)
~~~



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

# 封装 useChat 钩子 + 完美流式对话

~~~
1.修复流式体验，让 AI 像 ChatGPT 一样逐字输出
2.封装一个可复用的 AI Hook（useChat），以后任何项目都能直接用
3.解决历史对话上下文（多轮聊天）
4.加一点 UI 美化，看起来像正式产品

今天你真正掌握的核心技能
前端流式读取 SSE/Stream 格式
逐字渲染 AI 回复（ChatGPT 同款体验）
多轮对话上下文
Hook 封装思想（可迁移到任何 AI 项目）
~~~

# Markdown 解析内容：理解向量化 (Vectorization) 1. 什么是向量化？
向量化（Vectorization/Embedding）是将人类自然语言转换为 高维空间中的数值向量 的过程。

- 输入 ：一段文本（如 "我喜欢吃苹果"）
- 输出 ：一个包含成百上千个浮点数的数组（如 [0.12, -0.45, 0.88, ...] ） 2. 为什么向量化对 AI 至关重要？
计算机无法直接理解词汇的含义，但它们擅长处理数字。向量化赋予了文字“语义位置”：

- 语义相似度 ：在向量空间中，意思相近的句子，其向量的“距离”也更近。
- 超越关键词匹配 ：传统的搜索（如 Ctrl+F）只能找完全一致的字。向量搜索可以搜到“意思相近”的内容。比如搜“水果”，向量搜索能帮你找到“苹果”。 3. 代码解析： useVectorStore.ts 中的实现逻辑
在 useVectorStore.ts 中，核心流程如下：

步骤 代码实现 说明 1. 切块 (Chunking) splitText(text, 300, 50) 将长文章切成小段。因为模型有窗口限制，且小片段能让检索更精准。 2. 向量化 (Embedding) getEmbedding(piece) 调用后端模型（如 OpenAI 接口），将文字转化为语义向量数组。 3. 存储 (Storage) setChunks(vecChunks) 将 文本 + 向量 组合存储，形成一个简单的“本地向量数据库”。 4. 检索 (Retrieval) retrieve(query) 将你的问题也向量化，然后计算它与库里哪个片段最“像”，从而找回相关知识。
 4. 核心术语对比
术语 形象比喻 作用 Text Chunk 书中的一个章节 信息的最小存储单元 Embedding 章节的“指纹” 信息的数学表达，用于比对 Vector Space 图书馆的坐标系 确定信息在知识海洋中的位置 Similarity 两个指纹的相似度 判断问题和答案的相关程度

