import React, { useState, useRef } from 'react';
import { Upload, CheckCircle, AlertCircle } from 'lucide-react';
import './Components.css';

interface DocumentUploaderProps {
  onSuccess?: () => void;
}

const DocumentUploader: React.FC<DocumentUploaderProps> = ({ onSuccess }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleUpload(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleUpload(files[0]);
    }
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    setStatus(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:3000/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Upload error:', errorData);
        throw new Error('Upload failed');
      }

      setStatus({ type: 'success', message: `Successfully uploaded ${file.name}` });
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Upload exception:', error);
      setStatus({ type: 'error', message: 'Failed to upload document. Please try again.' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="uploader-container">
      <div
        className={`upload-zone ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          accept=".pdf,.txt,.doc,.docx,.md,.csv,.html,.xlsx,.xls"
          style={{ display: 'none' }}
        />
        <Upload className="upload-icon" size={48} />
        <p className="upload-text">Drag and drop your document here</p>
        <p className="upload-subtext">or</p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="upload-link"
        >
          click here to upload a document
        </button>
        <p className="upload-hint">Supported formats: PDF, TXT, DOC, DOCX, MD, CSV, HTML</p>
      </div>

      {status && (
        <div className={`status-message ${status.type}`}>
          {status.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span>{status.message}</span>
        </div>
      )}
    </div>
  );
};

export default DocumentUploader;
