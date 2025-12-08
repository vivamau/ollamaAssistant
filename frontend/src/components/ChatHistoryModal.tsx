import React, { useState } from 'react';
import { X, Trash2, MessageSquare, Clock, Cpu } from 'lucide-react';

interface ChatHistoryItem {
  ID: number;
  chat_start_datetime: number;
  save_datetime: number;
  modelNames: string[];
  filename: string;
}

interface ChatHistoryModalProps {
  chats: ChatHistoryItem[];
  onClose: () => void;
  onSelectChat: (id: number) => void;
  onDeleteChat: (id: number) => void;
}

const ChatHistoryModal: React.FC<ChatHistoryModalProps> = ({ 
  chats, 
  onClose, 
  onSelectChat, 
  onDeleteChat 
}) => {
  const [confirmDelete, setConfirmDelete] = useState<{ show: boolean; chatId: number | null }>({ show: false, chatId: null });

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '64rem', width: '90%', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Clock size={24} />
            Chat History
          </h2>
          <button onClick={onClose} className="close-btn">
            <X size={20} />
          </button>
        </div>
        
        <div className="overflow-y-auto flex-1 pr-2">
          {chats.length === 0 ? (
            <div className="text-center text-slate-400 py-12">
              <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
              <p>No saved chats found.</p>
            </div>
          ) : (
            <div className="history-table-container">
              <table className="history-table">
                <thead>
                  <tr>
                    <th style={{ width: '25%' }}>Date</th>
                    <th style={{ width: '45%' }}>Models Used</th>
                    <th style={{ width: '20%' }}>Saved</th>
                    <th style={{ width: '10%', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {chats.map((chat) => (
                    <tr 
                      key={chat.ID} 
                      className="history-row"
                      onClick={() => onSelectChat(chat.ID)}
                    >
                      <td>
                        <div className="history-date">
                          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                            {new Date(chat.chat_start_datetime * 1000).toLocaleDateString('en-GB', { 
                              day: 'numeric', month: 'short', year: 'numeric' 
                            })}
                          </span>
                          <span className="history-time">
                            {new Date(chat.chat_start_datetime * 1000).toLocaleTimeString([], { 
                              hour: '2-digit', minute: '2-digit' 
                            })}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="model-tags">
                          {chat.modelNames.map((model, index) => (
                            <span key={index} className="model-tag">
                              <Cpu size={12} />
                              {model}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <div className="history-date">
                          <span>
                            {new Date(chat.save_datetime * 1000).toLocaleDateString('en-GB', { 
                              day: 'numeric', month: 'short' 
                            })}
                          </span>
                          <span className="history-time">
                            {new Date(chat.save_datetime * 1000).toLocaleTimeString([], { 
                              hour: '2-digit', minute: '2-digit' 
                            })}
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDelete({ show: true, chatId: chat.ID });
                          }}
                          className="delete-btn"
                          title="Delete Chat"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        {confirmDelete.show && (
          <div className="modal-overlay" onClick={() => setConfirmDelete({ show: false, chatId: null })} style={{ zIndex: 10001 }}>
            <div className="modal-content" style={{ maxWidth: '28rem' }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Delete Chat</h2>
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>
                  Are you sure you want to delete this chat?
                </p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  This action cannot be undone.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setConfirmDelete({ show: false, chatId: null })}
                  className="btn-secondary"
                  style={{ padding: '0.625rem 1.25rem', border: 'none' }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (confirmDelete.chatId) {
                      onDeleteChat(confirmDelete.chatId);
                      setConfirmDelete({ show: false, chatId: null });
                    }
                  }}
                  className="btn-danger"
                  style={{ padding: '0.625rem 1.25rem', border: 'none' }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatHistoryModal;
