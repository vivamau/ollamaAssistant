import React, { useState } from 'react';
import { Globe, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import './Components.css';

interface WebsiteInputProps {
  onWebsiteAdded?: () => void;
}

const WebsiteInput: React.FC<WebsiteInputProps> = ({ onWebsiteAdded }) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setLoading(true);
    setStatus(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/websites/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) throw new Error('Scraping failed');

      setStatus({ type: 'success', message: 'Website content scraped successfully' });
      setUrl('');
      if (onWebsiteAdded) {
        onWebsiteAdded();
      }
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to scrape website. Please check the URL.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="website-input-container">
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <div className="section-header">
          <div>
            <h3 className="text-lg font-semibold">Add Website or Video</h3>
            <p className="text-slate-400 text-sm">Scrape website or YouTube video transcript</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="pull-form">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com or YouTube URL"
            className="input-field"
            style={{ flex: 1 }}
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Scraping...
              </>
            ) : (
              'Scrape'
            )}
          </button>
        </form>

        {status && (
          <div className={`status-message ${status.type}`}>
            {status.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            <span>{status.message}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default WebsiteInput;
