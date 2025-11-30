import React from 'react';
import { MessageSquare, FileText, Globe, Settings, Database } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';

const Sidebar: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { icon: MessageSquare, label: 'Chat', path: '/' },
    { icon: FileText, label: 'Documents', path: '/documents' },
    { icon: Globe, label: 'Websites', path: '/websites' },
    { icon: Database, label: 'Models', path: '/models' },
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="logo-container">
          <span className="text-white font-bold">OA</span>
        </div>
        <h1 className="app-title">Ollama Assistant</h1>
      </div>

      <nav className="nav-list">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`nav-item ${isActive(item.path) ? 'active' : 'inactive'}`}
          >
            <item.icon size={20} />
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <Link to="/settings" className="settings-item">
          <Settings size={20} />
          <span className="font-medium">Settings</span>
        </Link>
      </div>
    </div>
  );
};

export default Sidebar;
