import React, { useState, useEffect } from 'react';
import { Database, Download, Loader2, Trash2, Activity, Hash } from 'lucide-react';
import './Components.css';

interface Model {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
  usage_count?: number;
  total_prompt_tokens?: number;
  total_completion_tokens?: number;
  last_used_at?: number;
}

interface ModelSelectorProps {
  onSelect?: (model: string) => void;
  selectedModel?: string;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ onSelect, selectedModel }) => {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [pulling, setPulling] = useState(false);
  const [pullProgress, setPullProgress] = useState<{ status: string; completed?: number; total?: number } | null>(null);
  const [newModelName, setNewModelName] = useState('');
  const [deletingModel, setDeletingModel] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ show: boolean; modelName: string | null }>({ show: false, modelName: null });

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/models`);
      const data = await response.json();
      setModels(data.models || []);
    } catch (error) {
      console.error('Failed to fetch models', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePullModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModelName) return;

    setPulling(true);
    setPullProgress({ status: 'Starting download...' });

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/models/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: newModelName }),
      });

      const reader = response.body?.getReader();
      if (!reader) return;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = new TextDecoder().decode(value);
        const lines = text.split('\n');
        
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            setPullProgress({
              status: data.status,
              completed: data.completed,
              total: data.total
            });
          } catch (e) {
            // Ignore parse errors for partial chunks
          }
        }
      }

      await fetchModels();
      setNewModelName('');
      setPullProgress(null);
    } catch (error) {
      console.error('Failed to pull model', error);
      setPullProgress({ status: 'Failed to download model' });
    } finally {
      setPulling(false);
    }
  };

  const formatSize = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  };

  const formatBytes = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    const gb = bytes / (1024 * 1024 * 1024);
    return gb >= 1 ? `${gb.toFixed(2)} GB` : `${mb.toFixed(1)} MB`;
  };

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`;
    } else if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}K`;
    }
    return tokens.toString();
  };

  const handleDeleteModel = async (modelName: string) => {
    setConfirmDelete({ show: true, modelName });
  };

  const confirmDeleteModel = async () => {
    const modelName = confirmDelete.modelName;
    if (!modelName) return;

    setConfirmDelete({ show: false, modelName: null });
    setDeletingModel(modelName);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/models/${encodeURIComponent(modelName)}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchModels();
      } else {
        const error = await response.json();
        alert(`Failed to delete model: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting model:', error);
      alert('Failed to delete model');
    } finally {
      setDeletingModel(null);
    }
  };


  return (
    <div className="model-selector-container">
      {/* Model List */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Database className="text-blue-500" />
          Available Models
        </h3>
        
        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="animate-spin text-blue-500" />
          </div>
        ) : (
          <div className="models-grid">
            {models.map((model) => (
              <div key={model.name} style={{ position: 'relative' }}>
                <h4 className="font-medium text-base" style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                  {model.name}
                </h4>
                <div
                  className={`model-card ${selectedModel === model.name ? 'selected' : 'idle'}`}
                  style={{ position: 'relative' }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteModel(model.name);
                    }}
                    disabled={deletingModel === model.name}
                    className="table-action-btn table-action-danger"
                    title="Delete model"
                    style={{ 
                      position: 'absolute', 
                      top: '0.75rem', 
                      right: '0.75rem',
                      zIndex: 10
                    }}
                  >
                    {deletingModel === model.name ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>
                  <div 
                    onClick={() => onSelect?.(model.name)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="model-meta">
                      <span>Downloaded: {new Date(model.modified_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} ({formatSize(model.size)})</span>
                    </div>
                    <div className="model-meta" style={{ marginTop: '0.25rem' }}>
                      <span>
                        Last used: {model.last_used_at 
                          ? `${new Date(model.last_used_at * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} at ${new Date(model.last_used_at * 1000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
                          : 'Never'
                        }
                      </span>
                    </div>
                    <div className="model-meta" style={{ marginTop: '0.5rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Activity size={14} />
                        {model.usage_count || 0} uses
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Hash size={14} />
                        ↑{formatTokens(model.total_prompt_tokens || 0)} ↓{formatTokens(model.total_completion_tokens || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pull Model */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Download className="text-green-500" />
          Pull New Model
        </h3>
        
        <div className="warning-alert">
          <p className="text-sm">
            Downloading models requires significant disk space and bandwidth. 
            Standard models range from 2GB to 8GB.
          </p>
        </div>

        <form onSubmit={handlePullModel} className="pull-form">
          <input
            type="text"
            value={newModelName}
            onChange={(e) => setNewModelName(e.target.value)}
            placeholder="e.g., llama3, mistral, gemma:2b"
            className="input-field"
            style={{ flex: 1 }}
            disabled={pulling}
          />
          <button
            type="submit"
            disabled={pulling || !newModelName}
            className="btn-primary"
          >
            {pulling ? 'Downloading...' : 'Pull Model'}
          </button>
        </form>

        {pulling && pullProgress && (
          <div className="download-progress-container">
            <div className="progress-header">
              <div className="progress-status">
                <Loader2 size={16} className="animate-spin text-blue-500" />
                <span className="font-medium">{pullProgress.status}</span>
              </div>
              {pullProgress.total && (
                <div className="progress-stats">
                  <span className="progress-percentage">
                    {Math.round((pullProgress.completed || 0) / (pullProgress.total || 1) * 100)}%
                  </span>
                  <span className="progress-size">
                    {formatBytes(pullProgress.completed || 0)} / {formatBytes(pullProgress.total)}
                  </span>
                </div>
              )}
            </div>
            {pullProgress.total && (
              <div className="progress-bar-container">
                <div 
                  className="progress-bar-fill"
                  style={{ width: `${((pullProgress.completed || 0) / pullProgress.total) * 100}%` }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Custom Confirmation Dialog */}
      {confirmDelete.show && (
        <div className="modal-overlay" onClick={() => setConfirmDelete({ show: false, modelName: null })}>
          <div className="modal-content" style={{ maxWidth: '28rem' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Delete Model</h2>
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>
                Are you sure you want to delete the model <strong>"{confirmDelete.modelName}"</strong>?
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                This action cannot be undone. All data associated with this model will be permanently removed.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmDelete({ show: false, modelName: null })}
                className="btn-secondary"
                style={{ padding: '0.625rem 1.25rem', border: 'none' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteModel}
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
  );
};

export default ModelSelector;
