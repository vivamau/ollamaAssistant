import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MessageSquare, FileText, Globe, Database, Sparkles, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import logoDark from '../assets/logo-dark.png';
import logoLight from '../assets/logo-light.png';
import './Sidebar.css';

interface SidebarProps {
  onNavigationAttempt?: (path: string) => boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ onNavigationAttempt }) => {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Detect theme changes
  useEffect(() => {
    const updateTheme = () => {
      const currentTheme = document.documentElement.getAttribute('data-theme') as 'dark' | 'light';
      setTheme(currentTheme || 'dark');
    };

    // Initial theme detection
    updateTheme();

    // Watch for theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          updateTheme();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    return () => observer.disconnect();
  }, []);

  // Auto-collapse on smaller screens, auto-expand on larger screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsCollapsed(true);
      } else {
        setIsCollapsed(false);
      }
    };

    handleResize(); // Check on mount
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navItems = [
    { path: '/', label: 'Chat', icon: MessageSquare },
    { path: '/documents', label: 'Sources', icon: FileText },
    { path: '/websites', label: 'Websites', icon: Globe },
    { path: '/models', label: 'Models', icon: Database },
    { path: '/prompts', label: 'Prompts', icon: Sparkles },
  ];

  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="logo-container">
          <img 
            src={theme === 'dark' ? logoDark : logoLight} 
            alt="Ollama Logo" 
            className="app-logo" 
          />
        </div>
      </div>

      <button 
        className="sidebar-toggle"
        onClick={() => setIsCollapsed(!isCollapsed)}
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
      </button>

      <nav className="nav-list">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`nav-item ${location.pathname === item.path ? 'active' : 'inactive'}`}
            title={isCollapsed ? item.label : undefined}
            onClick={(e) => {
              if (onNavigationAttempt && !onNavigationAttempt(item.path)) {
                e.preventDefault();
              }
            }}
          >
            <item.icon size={isCollapsed ? 48 : 24} />
            {!isCollapsed && <span className="font-medium">{item.label}</span>}
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <Link
          to="/settings"
          className={`nav-item ${location.pathname === '/settings' ? 'active' : 'inactive'}`}
          title={isCollapsed ? 'Settings' : undefined}
          onClick={(e) => {
            if (onNavigationAttempt && !onNavigationAttempt('/settings')) {
              e.preventDefault();
            }
          }}
        >
          <Settings size={isCollapsed ? 48 : 24} />
          {!isCollapsed && <span className="font-medium">Settings</span>}
        </Link>
      </div>
    </div>
  );
};

export default Sidebar;
