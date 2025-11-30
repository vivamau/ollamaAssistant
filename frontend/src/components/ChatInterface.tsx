import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, FileText, Settings, Loader2, ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import ModelSelector from './ModelSelector';
import './ChatInterface.css';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [models, setModels] = useState<Array<{ name: string }>>([]);
  const [useContext, setUseContext] = useState(true);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initial model fetch
  useEffect(() => {
    fetch('http://localhost:3000/api/models')
      .then(res => res.json())
      .then(data => {
        if (data.models?.length > 0) {
          setModels(data.models);
          setSelectedModel(data.models[0].name);
        }
      })
      .catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selectedModel) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          messages: [...messages, userMessage],
          useContext
        }),
      });

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      let assistantMessage = '';
      
      // Add empty assistant message with loading indicator
      setMessages(prev => [...prev, { role: 'assistant', content: '...' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = new TextDecoder().decode(value);
        const lines = text.split('\n');

        for (const line of lines) {
          if (!line.trim()) continue;
          
          // Handle SSE format: strip "data: " prefix
          let jsonStr = line;
          if (line.startsWith('data: ')) {
            jsonStr = line.substring(6); // Remove "data: " prefix
          }
          
          try {
            const data = JSON.parse(jsonStr);
            if (data.message?.content) {
              assistantMessage += data.message.content;
              setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1].content = assistantMessage || '...';
                return newMessages;
              });
            }
          } catch (e) {
            console.error('Error parsing chunk', e);
          }
        }
      }
    } catch (error) {
      console.error('Chat failed', error);
      setMessages(prev => [...prev, { role: 'system', content: 'Error: Failed to get response.' }]);
    } finally {
      setLoading(false);
    }
  };

  if (!selectedModel) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-slate-400">Loading models...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      {/* Header */}
      <div className="chat-header">
        <div className="header-controls">
          <div className="model-dropdown-container">
            <button
              onClick={() => setShowModelDropdown(!showModelDropdown)}
              className="model-badge clickable"
            >
              <Bot size={18} className="text-slate-400" />
              <span className="font-medium text-sm text-slate-400">{selectedModel}</span>
              <ChevronDown size={16} className="text-slate-400" />
            </button>
            
            {showModelDropdown && (
              <div className="model-dropdown">
                {models.map((model) => (
                  <button
                    key={model.name}
                    onClick={() => {
                      setSelectedModel(model.name);
                      setShowModelDropdown(false);
                    }}
                    className={`model-dropdown-item ${selectedModel === model.name ? 'active' : ''}`}
                  >
                    <Bot size={16} style={{ color: '#f8fafc' }} />
                    <span style={{ color: '#f8fafc' }}>{model.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <button
            onClick={() => setUseContext(!useContext)}
            className={`context-toggle ${useContext ? 'active' : 'inactive'}`}
          >
            <FileText size={16} />
            {useContext ? 'Context Active' : 'Context Disabled'}
          </button>
        </div>

        <button 
          onClick={() => setShowModelSelector(!showModelSelector)}
          className="settings-btn"
        >
          <Settings size={20} />
        </button>
      </div>

      {showModelSelector && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="text-2xl font-bold">Model Settings</h2>
              <button 
                onClick={() => setShowModelSelector(false)}
                className="close-btn"
              >
                Close
              </button>
            </div>
            <ModelSelector 
              selectedModel={selectedModel} 
              onSelect={(model) => {
                setSelectedModel(model);
                setShowModelSelector(false);
              }} 
            />
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="messages-area">
        {messages.length === 0 && (
          <div className="empty-state">
            <Bot size={64} className="mb-4" />
            <p className="text-xl font-medium">Start a conversation</p>
          </div>
        )}
        
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`message-row ${msg.role === 'user' ? 'user' : 'assistant'}`}
          >
            {msg.role !== 'user' && (
              <div className="avatar bot">
                <Bot size={18} className="text-white" />
              </div>
            )}
            
            <div className={`message-bubble ${msg.role === 'user' ? 'user' : 'assistant'}`}>
              {msg.content === '...' ? (
                <div className="flex items-center gap-2 text-slate-400">
                  <Loader2 size={16} className="animate-spin" />
                  <span>Thinking...</span>
                </div>
              ) : (
                <div className="prose prose-invert max-w-none text-sm leading-relaxed">
                  <ReactMarkdown 
                    components={{
                      code: ({node, ...props}) => (
                        <code className="bg-black/30 rounded px-1 py-0.5" {...props} />
                      ),
                      pre: ({node, ...props}) => (
                        <pre className="bg-black/30 rounded-lg p-4 overflow-x-auto my-2" {...props} />
                      )
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="avatar user">
                <User size={18} className="text-slate-300" />
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="input-area">
        <form onSubmit={handleSubmit} className="input-form">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="chat-input"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="send-btn"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;
