import React, { useState, useRef } from 'react';
import { Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import './Components.css';

const DocumentUploader: React.FC = () => {
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

      if (!response.ok) throw new Error('Upload failed');

      setStatus({ type: 'success', message: `Successfully uploaded ${file.name}` });
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to upload document. Please try again.' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="uploader-container">
      <div
        className={`dropzone ${isDragging ? 'dragging' : 'idle'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
          accept=".pdf,.docx,.txt,.md,.csv,.html"
        />

        <div className="upload-content">
          <div className={`icon-wrapper ${uploading ? 'loading' : 'idle'}`}>
            {uploading ? (
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            ) : (
              <Upload className="w-8 h-8 text-slate-400" />
            )}
          </div>
          
          <div>
            <h3 className="text-xl font-semibold mb-2">
              {uploading ? 'Uploading...' : 'Drop your documents here'}
            </h3>
            <p className="text-slate-400">
              Support for PDF, DOCX, CSV, MD, HTML
            </p>
          </div>
        </div>
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
