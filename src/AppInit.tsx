import { useState, useRef, useEffect } from 'react'

// 定义消息对象的类型接口
interface Message {
  role: 'user' | 'assistant' // 角色：用户或 AI 助手
  content: string            // 消息的具体文本内容
}

function App() {
  // --- 状态管理区域 ---
  const [messages, setMessages] = useState<Message[]>([]) // 存储所有的对话历史记录
  const [input, setInput] = useState('')                  // 绑定底部输入框的文本
  const [loading, setLoading] = useState(false)           // 标记 AI 是否正在生成回复，用于禁用发送按钮
  const chatRef = useRef<HTMLDivElement>(null)            // 指向聊天列表底部的空元素，用于实现自动滚动

  // 监听 messages 数组的变化，每当有新消息时，自动平滑滚动到最底部
  useEffect(() => {
    chatRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // --- 核心方法：发送消息到本地 Ollama 模型并处理流式返回 ---
  const sendMessage = async () => {
    // 1. 检查输入是否为空（去除首尾空格），防止发送空消息
    if (!input.trim()) return

    // 2. 立即将用户的消息追加到界面上，提升用户体验（乐观更新）
    const userMsg: Message = { role: 'user', content: input }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')      // 发送后清空输入框
    setLoading(true)  // 进入加载状态，防止用户重复点击

    // 3. 预先在列表中放入一条空的 AI 消息作为占位，后续流式返回的数据将实时填充到这里
    const assistantMsg: Message = { role: 'assistant', content: '' }
    setMessages([...newMessages, assistantMsg])

    try {
      // 4. 发起网络请求，调用本地运行的 Ollama 接口（默认端口 11434，本地调用无跨域限制）
      const res = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'qwen:0.5b',    // 指定使用的本地大模型名称
          messages: newMessages, // 携带完整的上下文对话记录给大模型
          stream: true,          // 关键配置：开启流式输出（打字机效果），模型会一段一段地返回结果
        }),
      })

      console.log(res,'res')

      // 5. 获取响应体的可读数据流      
      //res.body：fetch 返回的响应体流（二进制数据流）
      //getReader()：创建一个读取器，用来一块一块读取数据
      //reader.read()：读取数据块，返回一个 Promise，解析后是一个包含 done 和 value 的对象
      //done：是否读取完成
      //value：当前读取到的数据块（二进制数据流）
      const reader = res.body?.getReader()
      console.log(reader,'reader')

      // 创建解码器，用于将二进制数据解码为字符串
      //TextDecoder()：创建一个解码器，用来将二进制数据解码为字符串
      const decoder = new TextDecoder() // 用于将二进制流解码为普通文本（UTF-8）
      let fullText = '' // 临时变量，用于拼接完整回复

      // 6. 不断循环读取数据块，直到读取完毕
      while (true) {
        // reader.read()：异步读取一块数据，返回一个 Promise，解析后是一个包含 done 和 value 的对象
        //value：当前读取到的数据块（二进制数据流）
        const { done, value } = await reader!.read()
        console.log(done, value,'done, value')

        if (done) break // done 为 true 表示服务端已停止发送数据，跳出循环

        // 将当前读取到的二进制数据块解码为字符串
        const chunk = decoder.decode(value)
        console.log(chunk,'chunk')
        // Ollama 返回的流式数据是按行分隔的多个 JSON 字符串，这里按行切分并过滤掉空行
        const lines = chunk.split('\n').filter(Boolean)

        // 7. 遍历解析每一行 JSON 数据
        for (const line of lines) {
          try {
            const data = JSON.parse(line)
            const content = data.message?.content || '' // 提取模型生成的增量文本片段
            if (content) {
              fullText += content // 拼接到完整的回复文本中
              
              // 8. 动态更新 React 状态中的最后一条消息（即刚才预占位的 AI 回复内容）
              setMessages((prev) => [
                ...prev.slice(0, -1), // 保留前面的所有历史消息不变
                { role: 'assistant', content: fullText }, // 更新最后一条消息，覆盖为拼接好的最新文本
              ])
            }
          } catch {
            continue
          }
        }
      }
    } catch (err) {
      console.error('本地模型调用失败', err)
    } finally {
      // 请求结束或报错时，恢复按钮的可点击状态
      setLoading(false)
    }
  }

  // --- UI 渲染区域 ---
  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 20 }}>
      <h2>本地 AI 聊天机器人（无跨域）</h2>
      
      {/* 聊天记录展示区 */}
      <div
        style={{
          height: '60vh',
          overflowY: 'auto', // 内容溢出时显示滚动条
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
              // 根据角色动态设置对齐方式：用户靠右，AI 靠左
              textAlign: m.role === 'user' ? 'right' : 'left',
            }}
          >
            <div
              style={{
                display: 'inline-block',
                padding: '10px 14px',
                borderRadius: 15,
                // 根据角色动态设置气泡的背景色和文字颜色：用户蓝底白字，AI 灰底黑字
                backgroundColor: m.role === 'user' ? '#007bff' : '#f1f1f1',
                color: m.role === 'user' ? '#fff' : '#000',
              }}
            >
              {m.content}
            </div>
          </div>
        ))}
        {/* 这个空 div 充当滚动锚点，配合 useEffect 确保新消息出现时能滚动到这里 */}
        <div ref={chatRef} />
      </div>

      {/* 底部输入与操作区 */}
      <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          // 监听键盘事件，当按下回车键时触发发送方法
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #ddd' }}
          placeholder="输入消息..."
        />
        <button
          onClick={sendMessage}
          disabled={loading} // 加载过程中禁用按钮，防止用户重复点击发送
          style={{ padding: '10px 16px' }}
        >
          {loading ? '思考中...' : '发送'}
        </button>
      </div>
    </div>
  )
}

export default App
