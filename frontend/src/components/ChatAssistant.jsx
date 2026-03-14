import { useState, useRef, useEffect } from 'react';
import { chatMessage } from '../api/client';

export default function ChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hi! I\'m your **CuraTrace Intelligence Assistant**. Ask me about any disease or treatment — side effects, effectiveness, timelines, or alternative approaches.\n\nTry: *"What are the treatment options for Migraine?"*',
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
          content: data?.response || 'No response received. Please try again.',
          sources: data?.sources || [],
          treatment: data?.treatment,
          totalDiscussions: data?.total_discussions,
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
        {isOpen ? '✕' : 'Chat'}
      </button>

      {isOpen && (
        <div className="chat-panel" id="chat-panel">
          <div className="chat-header">
            <div className="chat-header-icon">AI</div>
            <div>
              <div className="chat-header-title">Treatment AI Assistant</div>
              <div className="chat-header-status">● Online — Powered by NLP</div>
            </div>
          </div>

          <div className="chat-messages" style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', flex: 1, padding: '16px 20px', gap: '16px' }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div className={`chat-message ${msg.role}`} style={{
                  maxWidth: '85%',
                  padding: '12px 16px',
                  borderRadius: msg.role === 'user' ? '12px 12px 0 12px' : '12px 12px 12px 0',
                  background: msg.role === 'user' ? '#1565C0' : 'rgba(21, 101, 192, 0.04)',
                  border: msg.role === 'user' ? 'none' : '1px solid #E2E8F0',
                  color: msg.role === 'user' ? '#fff' : '#4A5B6C',
                  fontSize: '14px',
                  lineHeight: '1.5'
                }}>
                  <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="chat-sources" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #E2E8F0', fontSize: '12px' }}>
                      <div style={{ color: '#7A8B9C', marginBottom: '8px' }}>Sources ({msg.sources.length}):</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {msg.sources.slice(0, 3).map((s, j) => (
                          <a key={j} className="chat-source-link" href={s.url || '#'} target="_blank" rel="noopener noreferrer" style={{ color: '#1565C0', textDecoration: 'none', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            [{s.source}] {s.text}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div className="typing-indicator" style={{ display: 'flex', gap: '4px', padding: '12px 16px', background: 'rgba(21,101,192,0.04)', borderRadius: '12px 12px 12px 0', width: 'fit-content' }}>
                  <div className="typing-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#7A8B9C', animation: 'bounce 1.4s infinite ease-in-out both' }} />
                  <div className="typing-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#7A8B9C', animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '0.2s' }} />
                  <div className="typing-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#7A8B9C', animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '0.4s' }} />
                </div>
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
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}
