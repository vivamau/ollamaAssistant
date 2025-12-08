
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import DocumentUploader from './components/DocumentUploader';
import DocumentList from './components/DocumentList';
import WebsiteInput from './components/WebsiteInput';
import ModelSelector from './components/ModelSelector';
import PromptManager from './components/PromptManager';
import Settings from './components/Settings';
import './App.css';

// Placeholder components for now
const DocumentsPage = () => (
  <div className="page-container">
    <h2 className="page-title">Documents</h2>
    <DocumentUploader />
    <DocumentList />
  </div>
);

const WebsitesPage = () => (
  <div className="page-container">
    <h2 className="page-title">Websites</h2>
    <WebsiteInput />
  </div>
);

const ModelsPage = () => (
  <div className="page-container">
    <h2 className="page-title">Models</h2>
    <ModelSelector />
  </div>
);

const PromptsPage = () => (
  <div className="page-container">
    <PromptManager />
  </div>
);

function App() {
  const chatInterfaceRef = useRef<any>(null);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  const handleNavigationAttempt = (path: string): boolean => {
    // If trying to navigate away from chat, check for unsaved changes
    if (window.location.pathname === '/' && path !== '/') {
      if (chatInterfaceRef.current?.hasUnsavedChanges()) {
        setPendingNavigation(path);
        chatInterfaceRef.current?.showNavigationPrompt();
        return false; // Block navigation
      }
    }
    return true; // Allow navigation
  };

  const handleNavigationConfirmed = () => {
    if (pendingNavigation) {
      window.location.href = pendingNavigation;
      setPendingNavigation(null);
    }
  };

  return (
    <Router>
      <div className="app-container">
        <Sidebar onNavigationAttempt={handleNavigationAttempt} />
        <main className="main-content">
          <div className="background-gradient" />
          <Routes>
            <Route path="/" element={<ChatInterface ref={chatInterfaceRef} onNavigationConfirmed={handleNavigationConfirmed} />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/websites" element={<WebsitesPage />} />
            <Route path="/models" element={<ModelsPage />} />
            <Route path="/prompts" element={<PromptsPage />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
