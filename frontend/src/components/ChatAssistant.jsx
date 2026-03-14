import { useState, useRef, useEffect } from 'react';
import { chatMessage } from '../api/client';

export default function ChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '👋 Hi! I\'m your **Treatment Intelligence Assistant**. Ask me about any treatment — side effects, effectiveness, timelines, combinations, or dosages.\n\nTry: *"What are common side effects of Metformin?"*',
      sources: [],
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const data = await chatMessage(userMsg);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.response,
          sources: data.sources || [],
          treatment: data.treatment,
          totalDiscussions: data.total_discussions,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' },
      ]);
    }
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderMarkdown = (text) => {
    // Simple markdown rendering
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '<br/><br/>')
      .replace(/\n•/g, '<br/>•')
      .replace(/\n-/g, '<br/>-')
      .replace(/\n/g, '<br/>');
  };

  return (
    <>
      <button className="chat-toggle" onClick={() => setIsOpen(!isOpen)} id="chat-toggle-btn">
        {isOpen ? '✕' : '💬'}
      </button>

      {isOpen && (
        <div className="chat-panel" id="chat-panel">
          <div className="chat-header">
            <div className="chat-header-icon">🤖</div>
            <div>
              <div className="chat-header-title">Treatment AI Assistant</div>
              <div className="chat-header-status">● Online — Powered by NLP</div>
            </div>
          </div>

          <div className="chat-messages">
            {messages.map((msg, i) => (
              <div key={i}>
                <div className={`chat-message ${msg.role}`}>
                  <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="chat-sources">
                      📚 Sources ({msg.sources.length}):
                      {msg.sources.slice(0, 3).map((s, j) => (
                        <a key={j} className="chat-source-link" href={s.url} target="_blank" rel="noopener noreferrer">
                          [{s.source}] {s.text}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="typing-indicator">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-area">
            <input
              className="chat-input"
              type="text"
              placeholder="Ask about any treatment..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              id="chat-input"
            />
            <button className="chat-send" onClick={handleSend} disabled={loading || !input.trim()}>
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}
