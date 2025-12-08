import React, { useState, useEffect } from 'react';
import { Globe, Database, Loader2, Trash2, Eye } from 'lucide-react';
import CreateModelModal from './CreateModelModal';
import './Components.css';

interface Website {
  ID: number;
  url: string;
  title: string;
  content: string;
  scraped_at: number;
  last_updated: number;
  status: string;
}

const WebsiteList: React.FC = () => {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWebsiteId, setSelectedWebsiteId] = useState<number | null>(null);
  const [previewWebsite, setPreviewWebsite] = useState<Website | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ show: boolean; websiteId: number | null }>({ show: false, websiteId: null });

  const fetchWebsites = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/websites`);
      const data = await response.json();
      setWebsites(data.websites || []);
    } catch (error) {
      console.error('Error fetching websites:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebsites();
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchWebsites, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleDelete = (id: number) => {
    setConfirmDelete({ show: true, websiteId: id });
  };

  const truncateUrl = (url: string, maxLength: number = 30) => {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + '...';
  };

  const confirmDeleteWebsite = async () => {
    if (!confirmDelete.websiteId) return;

    try {
      await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/websites/${confirmDelete.websiteId}`, {
        method: 'DELETE',
      });
      setWebsites(websites.filter(w => w.ID !== confirmDelete.websiteId));
      setConfirmDelete({ show: false, websiteId: null });
    } catch (error) {
      console.error('Error deleting website:', error);
    }
  };

  return (
    <>
      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-4 text-slate-200">Scraped Websites</h3>
        
        {loading && websites.length === 0 ? (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-blue-500" />
          </div>
        ) : websites.length === 0 ? (
          <div className="text-center text-slate-500 py-8 bg-slate-800/50 rounded-lg border border-slate-700">
            <Globe className="mx-auto mb-2 opacity-50" size={32} />
            <p>No websites scraped yet</p>
          </div>
        ) : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '35%' }}>Website URL</th>
                  <th style={{ width: '30%' }}>Title</th>
                  <th style={{ width: '20%' }}>Scraped Date</th>
                  <th style={{ width: '15%', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {websites.map((website) => (
                  <tr key={website.ID} className="data-row">
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-500/10 p-2 rounded-lg">
                          <Globe className="text-blue-400" size={16} />
                        </div>
                        <a
                          href={website.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-blue-400 hover:text-blue-300"
                          title={website.url}
                        >
                          {truncateUrl(website.url)}
                        </a>
                      </div>
                    </td>
                    <td>
                      <span 
                        className="text-slate-300" 
                        title={website.title || 'No title'}
                      >
                        {truncateUrl(website.title || 'No title')}
                      </span>
                    </td>
                    <td>
                      <div className="cell-date">
                        <span className="text-slate-300">
                          {new Date(website.scraped_at * 1000).toLocaleDateString('en-GB', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })}
                        </span>
                        <span className="cell-time">
                          {new Date(website.scraped_at * 1000).toLocaleTimeString([], {
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => setPreviewWebsite(website)}
                          className="context-toggle"
                          title="Preview content"
                          style={{ whiteSpace: 'nowrap', minWidth: '100px' }}
                        >
                          <Eye size={16} />
                          Preview
                        </button>
                        <button
                          onClick={() => setSelectedWebsiteId(website.ID)}
                          className="context-toggle"
                          title="Train model with this website"
                          style={{ whiteSpace: 'nowrap', minWidth: '120px' }}
                        >
                          <Database size={16} />
                          Train Model
                        </button>
                        <button
                          onClick={() => handleDelete(website.ID)}
                          className="settings-btn"
                          style={{ color: 'var(--danger-text)' }}
                          title="Delete website"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewWebsite && (
        <div className="modal-overlay" onClick={() => setPreviewWebsite(null)}>
          <div className="modal-content" style={{ maxWidth: '50rem' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                  Content Preview
                </h2>
                <a
                  href={previewWebsite.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--accent-primary)', fontSize: '0.875rem', textDecoration: 'none' }}
                >
                  {previewWebsite.url}
                </a>
              </div>
              <button
                onClick={() => setPreviewWebsite(null)}
                className="close-btn"
                style={{ padding: '0.5rem', border: 'none' }}
              >
                ✕
              </button>
            </div>
            <div style={{ marginTop: '1rem' }}>
              <div
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: '0.5rem',
                  padding: '1rem',
                  maxHeight: '60vh',
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontSize: '0.875rem',
                  lineHeight: '1.6',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)'
                }}
              >
                {previewWebsite.content}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button
                onClick={() => setPreviewWebsite(null)}
                className="btn-secondary"
                style={{ padding: '0.625rem 1.25rem', border: 'none' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedWebsiteId && (
        <CreateModelModal
          documentId={selectedWebsiteId}
          sourceType="website"
          onClose={() => setSelectedWebsiteId(null)}
          onSuccess={() => {
            setSelectedWebsiteId(null);
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {confirmDelete.show && (
        <div className="modal-overlay" onClick={() => setConfirmDelete({ show: false, websiteId: null })}>
          <div className="modal-content" style={{ maxWidth: '28rem' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Delete Website</h2>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Are you sure you want to delete this website? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmDelete({ show: false, websiteId: null })}
                className="btn-secondary"
                style={{ padding: '0.625rem 1.25rem', border: 'none' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteWebsite}
                className="btn-danger"
                style={{ padding: '0.625rem 1.25rem', border: 'none' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default WebsiteList;
