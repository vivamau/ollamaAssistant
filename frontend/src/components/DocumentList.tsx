import React, { useState, useEffect } from 'react';
import { FileText, Database, Loader2, Trash2, AlertCircle } from 'lucide-react';
import CreateModelModal from './CreateModelModal';

interface Document {
  ID: number;
  filename: string;
  original_name: string;
  upload_date: number;
  mime_type: string;
}

const DocumentList: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ show: boolean; docId: number | null }>({ show: false, docId: null });

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/documents`);
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (id: number) => {
    setConfirmDelete({ show: true, docId: id });
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete.docId) return;
    
    setDeletingId(confirmDelete.docId);
    setConfirmDelete({ show: false, docId: null });

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/documents/${confirmDelete.docId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchDocuments();
      } else {
        console.error('Failed to delete document');
      }
    } catch (error) {
      console.error('Error deleting document:', error);
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    fetchDocuments();
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchDocuments, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mt-8">
      <h3 className="text-xl font-semibold mb-4 text-slate-200">Uploaded Documents</h3>
      
      {loading && documents.length === 0 ? (
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin text-blue-500" />
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center text-slate-500 py-8 bg-slate-800/50 rounded-lg border border-slate-700">
          <FileText className="mx-auto mb-2 opacity-50" size={32} />
          <p>No documents uploaded yet</p>
        </div>
      ) : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '40%' }}>Document Name</th>
                <th style={{ width: '25%' }}>Type</th>
                <th style={{ width: '25%' }}>Upload Date</th>
                <th style={{ width: '10%', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.ID} className="data-row">
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-500/10 p-2 rounded-lg">
                        <FileText className="text-blue-400" size={16} />
                      </div>
                      <span className="font-medium text-slate-200">{doc.original_name}</span>
                    </div>
                  </td>
                  <td>
                    <span className="tag">
                      {doc.mime_type.split('/')[1]?.toUpperCase() || 'FILE'}
                    </span>
                  </td>
                  <td>
                    <div className="cell-date">
                      <span className="text-slate-300">
                        {new Date(doc.upload_date * 1000).toLocaleDateString('en-GB', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </span>
                      <span className="cell-time">
                        {new Date(doc.upload_date * 1000).toLocaleTimeString([], {
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setSelectedDocId(doc.ID)}
                        className="context-toggle"
                        title="Train model with this document"
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        <Database size={16} />
                        Train Model
                      </button>
                      <button
                        onClick={() => handleDeleteClick(doc.ID)}
                        className="table-action-btn table-action-danger"
                        title="Delete document"
                        disabled={deletingId === doc.ID}
                      >
                        {deletingId === doc.ID ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedDocId && (
        <CreateModelModal
          documentId={selectedDocId}
          onClose={() => setSelectedDocId(null)}
          onSuccess={() => {
            setSelectedDocId(null);
            // Optional: show success message
          }}
        />
      )}

      {confirmDelete.show && (
        <div className="modal-overlay" onClick={() => setConfirmDelete({ show: false, docId: null })}>
          <div className="modal-content" style={{ maxWidth: '28rem' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="text-xl font-bold text-slate-200 flex items-center gap-2">
                <AlertCircle className="text-red-500" />
                Delete Document
              </h2>
            </div>
            <div className="mb-6">
              <p className="text-slate-300 mb-2">
                Are you sure you want to delete this document?
              </p>
              <p className="text-slate-400 text-sm">
                This will remove the file from the system and the database. This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete({ show: false, docId: null })}
                className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400 border border-red-500/20 transition-colors"
              >
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentList;
