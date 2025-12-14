import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Loader2, FileCode, Eye, Copy, Check, X, Bot } from 'lucide-react';

interface Prompt {
  ID: number;
  prompt: string;
  tags: string;
  created_at: number;
  updated_at?: number;
  model_ids?: number[];
  model_names?: string[];
  quality_rating?: number | null;
  comment?: string | null;
}

interface Model {
  ID: number;
  name: string;
  model: string;
  size: number;
}

const PromptManager: React.FC = () => {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ prompt: '', tags: '', modelIds: [] as number[], quality_rating: null as number | null, comment: '' });
  const [viewingPrompt, setViewingPrompt] = useState<Prompt | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ show: boolean; promptId: number | null }>({ show: false, promptId: null });

  useEffect(() => {
    fetchPrompts();
    fetchModels();
  }, []);

  const fetchPrompts = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/prompts`);
      if (response.ok) {
        const data = await response.json();
        setPrompts(data);
      }
    } catch (error) {
      console.error('Error fetching prompts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchModels = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/models`);
      if (response.ok) {
        const data = await response.json();
        setModels(data.models || []);
      }
    } catch (error) {
      console.error('Error fetching models:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingId 
        ? `${import.meta.env.VITE_API_BASE_URL}/api/prompts/${editingId}`
        : `${import.meta.env.VITE_API_BASE_URL}/api/prompts`;
      
      const method = editingId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setFormData({ prompt: '', tags: '', modelIds: [], quality_rating: null, comment: '' });
        setShowForm(false);
        setEditingId(null);
        fetchPrompts();
      }
    } catch (error) {
      console.error('Error saving prompt:', error);
    }
  };

  const handleEdit = (prompt: Prompt) => {
    setFormData({ 
      prompt: prompt.prompt, 
      tags: prompt.tags || '', 
      modelIds: prompt.model_ids || [],
      quality_rating: prompt.quality_rating || null,
      comment: prompt.comment || ''
    });
    setEditingId(prompt.ID);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    setConfirmDelete({ show: true, promptId: id });
  };

  const confirmDeletePrompt = async () => {
    const id = confirmDelete.promptId;
    if (!id) return;

    setConfirmDelete({ show: false, promptId: null });
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/prompts/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchPrompts();
      }
    } catch (error) {
      console.error('Error deleting prompt:', error);
    }
  };

  const handleView = (prompt: Prompt) => {
    setViewingPrompt(prompt);
  };

  const handleCopy = async (prompt: Prompt) => {
    try {
      await navigator.clipboard.writeText(prompt.prompt);
      setCopiedId(prompt.ID);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  return (
    <div className="prompt-manager-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div/>
        <button
          onClick={() => {
            setFormData({ prompt: '', tags: '', modelIds: [], quality_rating: null, comment: '' });
            setEditingId(null);
            setShowForm(!showForm);
          }}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Plus size={16} />
          New Prompt
        </button>
      </div>

      {showForm && (
        <div style={{ 
          backgroundColor: 'var(--bg-secondary)', 
          border: '1px solid var(--border-color)', 
          borderRadius: '0.75rem', 
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '1rem', fontSize: '1.125rem', fontWeight: '600' }}>
            {editingId ? 'Edit Prompt' : 'New Prompt'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Prompt
              </label>
              <textarea
                value={formData.prompt}
                onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                className="chat-input"
                rows={4}
                required
                style={{ resize: 'vertical', paddingRight: '1.5rem' }}
              />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="chat-input"
                placeholder="e.g., coding, writing, analysis"
                style={{ paddingRight: '1.5rem' }}
              />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Associated Models (optional)
              </label>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
                gap: '0.5rem',
                maxHeight: '200px',
                overflowY: 'auto',
                padding: '0.5rem',
                backgroundColor: 'var(--bg-primary)',
                borderRadius: '0.5rem',
                border: '1px solid var(--border-color)'
              }}>
                {models.map((model) => (
                  <label 
                    key={model.name} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.5rem',
                      padding: '0.5rem',
                      cursor: 'pointer',
                      borderRadius: '0.375rem',
                      transition: 'background-color 200ms'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--hover-bg)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <input
                      type="checkbox"
                      checked={formData.modelIds.includes(model.ID)}
                      onChange={(e) => {
                        const modelId = model.ID;
                        if (e.target.checked) {
                          setFormData({ ...formData, modelIds: [...formData.modelIds, modelId] });
                        } else {
                          setFormData({ ...formData, modelIds: formData.modelIds.filter(id => id !== modelId) });
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ color: 'var(--text-primary)', fontSize: '0.875rem' }}>{model.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Quality Rating (optional)
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {[1, 2, 3, 4, 5].map((rating) => {
                  const getColor = () => {
                    if (!formData.quality_rating || formData.quality_rating < rating) return 'var(--text-tertiary)';
                    if (formData.quality_rating <= 2) return 'var(--danger-text)'; // Red for 1-2
                    if (formData.quality_rating === 3) return 'var(--accent-secondary)'; // Blue for 3
                    return 'var(--success-text)'; // Green for 4-5
                  };
                  

                  
                  return (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setFormData({ ...formData, quality_rating: rating })}
                      style={{
                        padding: '0.5rem',
                        backgroundColor: formData.quality_rating && formData.quality_rating >= rating ? 
                          (formData.quality_rating <= 2 ? 'var(--danger-bg)' : formData.quality_rating === 3 ? 'var(--accent-glow)' : 'var(--success-bg)') : 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        transition: 'all 200ms',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      onMouseEnter={(e) => {
                        if (!formData.quality_rating || formData.quality_rating < rating) {
                          e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        const bgColor = formData.quality_rating && formData.quality_rating >= rating ? 
                          (formData.quality_rating <= 2 ? 'var(--danger-bg)' : formData.quality_rating === 3 ? 'var(--accent-glow)' : 'var(--success-bg)') : 'var(--bg-secondary)';
                        e.currentTarget.style.backgroundColor = bgColor;
                      }}
                    >
                      <Bot size={20} color={getColor()} />
                    </button>
                  );
                })}
                {formData.quality_rating && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, quality_rating: null })}
                    style={{
                      marginLeft: '0.5rem',
                      padding: '0.25rem 0.75rem',
                      fontSize: '0.875rem',
                      color: 'var(--text-secondary)',
                      backgroundColor: 'transparent',
                      border: '1px solid var(--border-color)',
                      borderRadius: '0.375rem',
                      cursor: 'pointer'
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Experience Comment (optional)
              </label>
              <textarea
                value={formData.comment}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                className="chat-input"
                rows={3}
                placeholder="Add notes about your experience with this prompt..."
                style={{ resize: 'vertical', paddingRight: '1.5rem' }}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setFormData({ prompt: '', tags: '', modelIds: [], quality_rating: null, comment: '' });
                }}
                className="close-btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="close-btn btn-primary-action"
              >
                {editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {viewingPrompt && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '48rem' }}>
            <div className="modal-header">
              <h2 className="text-2xl font-bold">View Prompt</h2>
              <button onClick={() => setViewingPrompt(null)} className="close-btn">
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Prompt
              </label>
              <div style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '0.75rem',
                padding: '1rem 1.5rem',
                color: 'var(--text-primary)',
                fontSize: '1em',
                whiteSpace: 'pre-wrap',
                maxHeight: '20rem',
                overflowY: 'auto'
              }}>
                {viewingPrompt.prompt}
              </div>
            </div>

            {viewingPrompt.tags && (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  Tags
                </label>
                <div className="tag-container">
                  {viewingPrompt.tags.split(',').map((tag, i) => (
                    <span key={i} className="tag">
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {viewingPrompt.model_names && viewingPrompt.model_names.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  Associated Models
                </label>
                <div className="tag-container">
                  {viewingPrompt.model_names.map((modelName, i) => (
                    <span key={i} className="tag" style={{ backgroundColor: 'var(--accent-glow)', color: 'var(--accent-secondary)' }}>
                      {modelName}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {viewingPrompt.quality_rating && (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  Quality Rating
                </label>
                <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                  {Array.from({ length: 5 }, (_, i) => {
                    const isActive = i < viewingPrompt.quality_rating!;
                    const getColor = () => {
                      if (!isActive) return 'var(--text-tertiary)';
                      if (viewingPrompt.quality_rating! <= 2) return 'var(--danger-text)'; // Red
                      if (viewingPrompt.quality_rating! === 3) return 'var(--accent-secondary)'; // Blue
                      return 'var(--success-text)'; // Green
                    };
                    

                    
                    return (
                      <Bot 
                        key={i} 
                        size={24} 
                        color={getColor()} 
                        fill={isActive ? getColor() : 'none'}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {viewingPrompt.comment && (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  Experience Comment
                </label>
                <div style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '0.75rem',
                  padding: '1rem 1.5rem',
                  color: 'var(--text-primary)',
                  fontSize: '0.9375rem',
                  whiteSpace: 'pre-wrap'
                }}>
                  {viewingPrompt.comment}
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => handleCopy(viewingPrompt)}
                className="close-btn btn-primary-action"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                {copiedId === viewingPrompt.ID ? <Check size={18} /> : <Copy size={18} />}
                {copiedId === viewingPrompt.ID ? 'Copied!' : 'Copy to Clipboard'}
              </button>
              <button
                onClick={() => setViewingPrompt(null)}
                className="close-btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin text-blue-500" />
        </div>
      ) : prompts.length === 0 ? (
        <div className="text-center text-slate-500 py-8 bg-slate-800/50 rounded-lg border border-slate-700">
          <FileCode className="mx-auto mb-2 opacity-50" size={32} />
          <p>No prompts yet. Create your first prompt!</p>
        </div>
      ) : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '30%' }}>Prompt</th>
                <th style={{ width: '12%' }}>Tags</th>
                <th style={{ width: '15%' }}>Models</th>
                <th style={{ width: '10%' }}>Quality</th>
                <th style={{ width: '18%' }}>Created</th>
                <th style={{ width: '15%', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {prompts.map((prompt) => (
                <tr key={prompt.ID} className="data-row">
                  <td>
                    <div style={{ 
                      maxWidth: '100%', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {prompt.prompt}
                    </div>
                  </td>
                  <td>
                    <div className="tag-container">
                      {prompt.tags && prompt.tags.split(',').map((tag, i) => (
                        <span key={i} className="tag">
                          {tag.trim()}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <div className="tag-container">
                      {prompt.model_names && prompt.model_names.length > 0 ? (
                        prompt.model_names.map((modelName, i) => (
                          <span key={i} className="tag" style={{ backgroundColor: 'var(--accent-glow)', color: 'var(--accent-secondary)' }}>
                            {modelName}
                          </span>
                        ))
                      ) : (
                        <span style={{ color: '#64748b', fontSize: '0.875rem' }}>No models</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      {prompt.quality_rating ? (
                        Array.from({ length: 5 }, (_, i) => {
                          const isActive = i < prompt.quality_rating!;
                          const getColor = () => {
                            if (!isActive) return 'var(--text-tertiary)';
                            if (prompt.quality_rating! <= 2) return 'var(--danger-text)'; // Red
                            if (prompt.quality_rating! === 3) return 'var(--accent-secondary)'; // Blue
                            return 'var(--success-text)'; // Green
                          };
                          

                          
                          return (
                            <Bot 
                              key={i} 
                              size={16} 
                              color={getColor()} 
                              fill={isActive ? getColor() : 'none'}
                            />
                          );
                        })
                      ) : (
                        <span style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>-</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="cell-date">
                      <span className="text-slate-300" style={{ color: 'var(--text-primary)' }}>
                        {new Date(prompt.created_at * 1000).toLocaleDateString('en-GB', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </span>
                      <span className="cell-time">
                        {new Date(prompt.created_at * 1000).toLocaleTimeString([], {
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => handleView(prompt)}
                        className="table-action-btn"
                        title="View"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => handleCopy(prompt)}
                        className="table-action-btn"
                        title="Copy to clipboard"
                      >
                        {copiedId === prompt.ID ? <Check size={16} /> : <Copy size={16} />}
                      </button>
                      <button
                        onClick={() => handleEdit(prompt)}
                        className="table-action-btn"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(prompt.ID)}
                        className="table-action-btn table-action-danger"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {confirmDelete.show && (
        <div className="modal-overlay" onClick={() => setConfirmDelete({ show: false, promptId: null })}>
          <div className="modal-content" style={{ maxWidth: '28rem' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Delete Prompt</h2>
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>
                Are you sure you want to delete this prompt?
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                This action cannot be undone.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmDelete({ show: false, promptId: null })}
                className="btn-secondary"
                style={{ padding: '0.625rem 1.25rem', border: 'none' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeletePrompt}
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

export default PromptManager;
