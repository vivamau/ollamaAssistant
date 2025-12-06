import React, { useState, useEffect } from 'react';
import { X, Bot, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface CreateModelModalProps {
  documentId: number;
  onClose: () => void;
  onSuccess: () => void;
}

interface Model {
  name: string;
}

const CreateModelModal: React.FC<CreateModelModalProps> = ({ documentId, onClose, onSuccess }) => {
  const [baseModel, setBaseModel] = useState('');
  const [newModelName, setNewModelName] = useState('');
  const [loading, setLoading] = useState(false);
  const [models, setModels] = useState<Model[]>([]);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/models');
      if (response.ok) {
        const data = await response.json();
        setModels(data.models || []);
        if (data.models && data.models.length > 0) {
          setBaseModel(data.models[0].name);
        }
      }
    } catch (error) {
      console.error('Error fetching models:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!baseModel || !newModelName) return;

    setLoading(true);
    setStatus({ type: 'info', message: 'Creating model... This may take a while.' });
    setLogs([]);

    try {
      const response = await fetch('http://localhost:3000/api/models/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          baseModel,
          newModelName
        })
      });

      if (!response.ok) throw new Error('Failed to create model');
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = new TextDecoder().decode(value);
        const lines = text.split('\n');

        for (const line of lines) {
          if (!line.trim()) continue;
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              if (data.status) {
                setLogs(prev => [...prev, data.status]);
              }
            } catch (e) {
              console.error('Error parsing stream:', e);
            }
          }
        }
      }

      setStatus({ type: 'success', message: 'Model created successfully!' });
      setTimeout(() => {
        onSuccess();
      }, 2000);

    } catch (error) {
      console.error('Error creating model:', error);
      setStatus({ type: 'error', message: 'Failed to create model. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '32rem' }}>
        <div className="modal-header">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Bot size={24} />
            Train New Model
          </h2>
          {!loading && (
            <button onClick={onClose} className="close-btn">
              <X size={20} />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#cbd5e1', marginBottom: '0.5rem' }}>
              Base Model
            </label>
            <div className="model-dropdown-container">
              <button
                type="button"
                onClick={() => setShowModelDropdown(!showModelDropdown)}
                className="model-badge clickable"
                style={{ width: '100%', justifyContent: 'space-between' }}
              >
                <span className="font-medium text-sm text-slate-400">{baseModel}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              
              {showModelDropdown && (
                <div className="model-dropdown">
                  {models.map((model) => (
                    <button
                      key={model.name}
                      type="button"
                      onClick={() => {
                        setBaseModel(model.name);
                        setShowModelDropdown(false);
                      }}
                      className={`model-dropdown-item ${baseModel === model.name ? 'active' : ''}`}
                    >
                      <span style={{ color: '#f8fafc' }}>{model.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#cbd5e1', marginBottom: '0.5rem' }}>
              New Model Name
            </label>
            <input
              type="text"
              value={newModelName}
              onChange={(e) => setNewModelName(e.target.value)}
              placeholder="e.g., my-custom-model"
              className="chat-input"
              disabled={loading}
              required
              style={{ paddingRight: '1.5rem' }}
            />
          </div>

          {logs.length > 0 && (
            <div style={{ 
              backgroundColor: '#0a0f1a', 
              borderRadius: '0.75rem', 
              padding: '0.875rem', 
              maxHeight: '10rem', 
              overflowY: 'auto',
              marginBottom: '1.5rem',
              border: '1px solid #1e293b',
              fontFamily: 'monospace',
              fontSize: '0.75rem',
              color: '#94a3b8'
            }}>
              {logs.map((log, i) => (
                <div key={i} style={{ marginBottom: '0.25rem' }}>{log}</div>
              ))}
            </div>
          )}

          {status && (
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.875rem',
                borderRadius: '0.5rem',
                backgroundColor: status.type === 'success' ? 'rgba(34, 197, 94, 0.1)' :
                               status.type === 'error' ? 'rgba(239, 68, 68, 0.1)' :
                               'rgba(59, 130, 246, 0.1)',
                color: status.type === 'success' ? '#4ade80' :
                       status.type === 'error' ? '#f87171' :
                       '#60a5fa',
                border: `1px solid ${status.type === 'success' ? 'rgba(34, 197, 94, 0.2)' :
                                     status.type === 'error' ? 'rgba(239, 68, 68, 0.2)' :
                                     'rgba(59, 130, 246, 0.2)'}`,
                marginBottom: '1.5rem',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}
            >
              {status.type === 'success' ? <CheckCircle size={18} /> :
               status.type === 'error' ? <AlertCircle size={18} /> :
               <Loader2 size={18} className="animate-spin" />}
              <span>{status.message}</span>
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button
              type="submit"
              disabled={loading || !baseModel || !newModelName}
              className="close-btn"
              style={{ 
                padding: '0.5rem 1rem', 
                backgroundColor: loading || !baseModel || !newModelName ? '#334155' : '#2563eb', 
                borderRadius: '0.5rem', 
                color: 'white',
                opacity: loading || !baseModel || !newModelName ? 0.5 : 1,
                cursor: loading || !baseModel || !newModelName ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Model'
              )}
            </button>
            {!loading && (
              <button
                type="button"
                onClick={onClose}
                className="close-btn"
                style={{ padding: '0.5rem 1rem', backgroundColor: '#334155', borderRadius: '0.5rem', marginLeft: '0.75rem' }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateModelModal;
