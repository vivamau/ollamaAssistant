import React, { useState, useEffect } from 'react';
import { Database, Download, Check, AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import './Components.css';

interface Model {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
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

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/models');
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
      const response = await fetch('http://localhost:3000/api/models/pull', {
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

  const handleDeleteModel = async (modelName: string) => {
    if (!confirm(`Are you sure you want to delete the model "${modelName}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingModel(modelName);
    try {
      const response = await fetch(`http://localhost:3000/api/models/${encodeURIComponent(modelName)}`, {
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
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
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
              <div
                key={model.name}
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
                  <div className="model-header">
                    <h4 className="font-medium text-lg" style={{ paddingRight: '2rem' }}>{model.name}</h4>
                    {selectedModel === model.name && <Check className="text-blue-500" size={20} />}
                  </div>
                  <div className="model-meta">
                    <span>{formatSize(model.size)}</span>
                    <span>{new Date(model.modified_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pull Model */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Download className="text-green-500" />
          Pull New Model
        </h3>
        
        <div className="warning-alert">
          <AlertTriangle className="text-yellow-500 shrink-0" />
          <p className="text-yellow-200 text-sm">
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
    </div>
  );
};

export default ModelSelector;
