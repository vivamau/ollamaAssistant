import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, FileText, Settings, Loader2, ChevronDown, Info, Download, Save, MessageSquarePlus, StopCircle, List } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import ModelSelector from './ModelSelector';
import ChatHistoryModal from './ChatHistoryModal';
import './ChatInterface.css';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
  model?: string;
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
  const [chatStartTime, setChatStartTime] = useState<Date | null>(null);
  const [modelsUsedInChat, setModelsUsedInChat] = useState<Set<string>>(new Set());
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [savedChats, setSavedChats] = useState<any[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initial model fetch
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE_URL}/api/models`)
      .then(res => res.json())
      .then(data => {
        if (data.models?.length > 0) {
          setModels(data.models);
          setSelectedModel(data.models[0].name);
        }
      })
      .catch(console.error);
  }, []);

  const handleModelChange = (newModel: string) => {
    if (newModel !== selectedModel) {
      setSelectedModel(newModel);
      setMessages(prev => [
        ...prev, 
        { 
          role: 'system', 
          content: `Model switched to ${newModel}`, 
          timestamp: new Date() 
        }
      ]);
      setShowModelDropdown(false);
      setShowModelSelector(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selectedModel) return;

    // Track chat start time on first message
    if (!chatStartTime) {
      setChatStartTime(new Date());
    }

    // Track models used
    setModelsUsedInChat(prev => new Set(prev).add(selectedModel));

    const userMessage: Message = { 
      role: 'user', 
      content: input, 
      timestamp: new Date(),
      model: selectedModel
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      abortControllerRef.current = new AbortController();
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          messages: messages.filter(m => m.role !== 'system').concat(userMessage), // Filter out system messages for API
          useContext
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      let assistantMessage = '';
      
      // Add empty assistant message with loading indicator
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '...', 
        timestamp: new Date(),
        model: selectedModel
      }]);

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
                const lastMsg = newMessages[newMessages.length - 1];
                if (lastMsg.role === 'assistant') {
                    lastMsg.content = assistantMessage || '...';
                }
                return newMessages;
              });
            }
          } catch (e) {
            console.error('Error parsing chunk', e);
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Generation stopped by user');
        // Remove the "..." placeholder message
        setMessages(prev => {
          const newMessages = [...prev];
          if (newMessages[newMessages.length - 1]?.content === '...') {
            newMessages.pop();
          }
          return newMessages;
        });
      } else {
        console.error('Chat failed', error);
        setMessages(prev => [...prev, { role: 'system', content: 'Error: Failed to get response.', timestamp: new Date() }]);
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleExportChat = () => {
    if (messages.length === 0) return;

    const exportContent = messages
      .map(m => {
        const time = m.timestamp ? `[${formatDate(m.timestamp)}]` : '';
        
        if (m.role === 'system') {
            return `**System** ${time}\n${m.content}\n`;
        }

        const role = m.role === 'user' ? 'User' : 'Assistant';
        const modelInfo = m.model ? `(Model: ${m.model})` : '';
        return `### ${role} ${time} ${modelInfo}\n\n${m.content}\n`;
      })
      .join('\n---\n\n');

    const blob = new Blob([exportContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-export-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleNewChat = () => {
    if (messages.length > 0) {
      setShowSaveDialog(true);
    } else {
      handleClearChat();
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setChatStartTime(null);
    setModelsUsedInChat(new Set());
    setShowSaveDialog(false);
  };

  const handleSaveChat = async (clearAfterSave: boolean = false) => {
    if (messages.length === 0) return;

    const exportContent = messages
      .map(m => {
        const time = m.timestamp ? `[${formatDate(m.timestamp)}]` : '';
        
        if (m.role === 'system') {
            return `**System** ${time}\n${m.content}\n`;
        }

        const role = m.role === 'user' ? 'User' : 'Assistant';
        const modelInfo = m.model ? `(Model: ${m.model})` : '';
        return `### ${role} ${time} ${modelInfo}\n\n${m.content}\n`;
      })
      .join('\n---\n\n');

    try {
      const filename = `chat-${new Date().toISOString().slice(0, 10)}-${Date.now()}.md`;
      const startTime = chatStartTime ? Math.floor(chatStartTime.getTime() / 1000) : Math.floor(Date.now() / 1000);
      const modelsUsed = Array.from(modelsUsedInChat);

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/chat/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          filename, 
          content: exportContent,
          startTime,
          modelsUsed
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Chat saved successfully to: ${data.path}${data.chatId ? ` (ID: ${data.chatId})` : ''}`);
        if (clearAfterSave) {
          handleClearChat();
        }
      } else {
        alert('Failed to save chat');
      }
    } catch (error) {
      console.error('Error saving chat:', error);
      alert('Failed to save chat');
    }
  };

  const handleHistoryClick = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/chat`);
      if (response.ok) {
        const data = await response.json();
        setSavedChats(data);
        setShowHistory(true);
      } else {
        console.error('Failed to fetch chats');
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
    }
  };

  const handleLoadChat = async (id: number) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/chat/${id}/content`);
      if (response.ok) {
        const data = await response.json();
        
        // Convert timestamp strings to Date objects
        const loadedMessages = data.messages.map((m: any) => ({
          ...m,
          timestamp: m.timestamp ? new Date(m.timestamp) : undefined
        }));

        setMessages(loadedMessages);
        
        // Try to set start time from first message
        if (loadedMessages.length > 0 && loadedMessages[0].timestamp) {
          setChatStartTime(loadedMessages[0].timestamp);
        } else {
          setChatStartTime(new Date()); // Fallback
        }

        // Rebuild models used set
        const models = new Set<string>();
        loadedMessages.forEach((m: any) => {
          if (m.model) models.add(m.model);
        });
        setModelsUsedInChat(models);

        // Close history modal
        setShowHistory(false);
      } else {
        alert('Failed to load chat content');
      }
    } catch (error) {
      console.error('Error loading chat:', error);
      alert('Failed to load chat');
    }
  };

  const handleDeleteChat = async (id: number) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/chat/${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        // Remove from local state
        setSavedChats(prev => prev.filter(chat => chat.ID !== id));
      } else {
        alert('Failed to delete chat');
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
      alert('Failed to delete chat');
    }
  };

  const formatTime = (date?: Date) => {
    if (!date) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date?: Date) => {
    if (!date) return '';
    const day = date.getDate();
    const month = date.toLocaleString('en-GB', { month: 'short' });
    const year = date.getFullYear();
    return `${day} ${month} ${year} ${formatTime(date)}`;
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
          <button
            onClick={handleNewChat}
            className="context-toggle"
            title="New Chat"
          >
            <MessageSquarePlus size={16} />
            New Chat
          </button>

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
                    onClick={() => handleModelChange(model.name)}
                    className={`model-dropdown-item ${selectedModel === model.name ? 'active' : ''}`}
                  >
                    <Bot size={16} />
                    <span>{model.name}</span>
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

        <div className="flex gap-2">
          <button 
            onClick={() => handleSaveChat(false)}
            className="settings-btn"
            title="Save Chat to Server"
          >
            <Save size={20} />
          </button>
          <button 
            onClick={handleHistoryClick}
            className="settings-btn"
            title="Chat History"
          >
            <List size={20} />
          </button>
          <button 
            onClick={handleExportChat}
            className="settings-btn"
            title="Export Chat"
          >
            <Download size={20} />
          </button>
          <button 
            onClick={() => setShowModelSelector(!showModelSelector)}
            className="settings-btn"
            title="Settings"
          >
            <Settings size={20} />
          </button>
        </div>
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
              onSelect={handleModelChange} 
            />
          </div>
        </div>
      )}

      {showSaveDialog && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '32rem' }}>
            <div className="modal-header">
              <h2 className="text-2xl font-bold">Save Current Chat?</h2>
            </div>
            <p className="text-slate-300 mb-6">
              You have an ongoing chat. Would you like to save it before starting a new one?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="close-btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleClearChat}
                className="close-btn btn-danger"
              >
                Don't Save
              </button>
              <button
                onClick={() => handleSaveChat(true)}
                className="close-btn btn-primary-action"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {showHistory && (
        <ChatHistoryModal
          chats={savedChats}
          onClose={() => setShowHistory(false)}
          onSelectChat={handleLoadChat}
          onDeleteChat={handleDeleteChat}
        />
      )}

      {/* Messages */}
      <div className="messages-area">
        {messages.length === 0 && (
          <div className="empty-state">
            <Bot size={64} className="mb-4" />
            <p className="text-xl font-medium">Start a conversation</p>
          </div>
        )}
        
        {messages.map((msg, idx) => {
          if (msg.role === 'system') {
             if (msg.content.startsWith('Model switched')) {
                 return (
                    <div key={idx} className="system-message">
                        <div className="flex items-center justify-center gap-2 text-slate-500 text-sm py-2">
                            <Info size={14} />
                            <span>{msg.content}</span>
                            <span className="text-xs opacity-70">({formatTime(msg.timestamp)})</span>
                        </div>
                    </div>
                 );
             }
             // Other system messages (errors etc)
             return (
                <div key={idx} className="system-message error">
                    <div className="text-red-400 text-sm text-center py-2">
                        {msg.content}
                    </div>
                </div>
             );
          }

          return (
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
                <>
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
                    {msg.timestamp && (
                        <div className={`message-timestamp ${msg.role === 'user' ? 'text-blue-200' : 'text-slate-500'}`}>
                            {formatDate(msg.timestamp)}
                        </div>
                    )}
                </>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="avatar user">
                <User size={18} className="text-slate-300" />
              </div>
            )}
          </div>
        )})}
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
            type={loading ? "button" : "submit"}
            onClick={loading ? handleStopGeneration : undefined}
            disabled={!loading && !input.trim()}
            className={`send-btn ${loading ? 'loading' : ''}`}
          >
            {loading ? <StopCircle size={20} /> : <Send size={20} />}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;
