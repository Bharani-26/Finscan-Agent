import React, { useState } from 'react';
import { useFinGuard } from '../context/FinGuardContext';
import { 
  Shield, 
  LayoutDashboard, 
  UploadCloud, 
  CheckSquare, 
  User,
  LogOut, 
  Building2, 
  Menu, 
  X 
} from 'lucide-react';

const Navbar = () => {
  const { user, activePage, setActivePage, logout, alerts } = useFinGuard();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const pendingAlertCount = alerts.filter(a => a.status === 'pending').length;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'upload', label: 'Upload & Analyze', icon: UploadCloud },
    { id: 'compliance', label: 'Compliance Alerts', icon: CheckSquare, badge: pendingAlertCount },
    { id: 'profile', label: 'Business Profile', icon: User },
  ];

  const handleNavClick = (id) => {
    setActivePage(id);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Desktop Sidebar Nav */}
      <aside className="desktop-sidebar">
        <div className="sidebar-brand" style={{ cursor: 'pointer' }} onClick={() => handleNavClick('dashboard')}>
          <div className="logo-badge">
            <Shield size={24} className="text-emerald" />
          </div>
          <div>
            <h1 className="brand-title">Finscan</h1>
            <span className="brand-subtitle">Compliance & Document OCR</span>
          </div>
        </div>

        {user && (
          <div 
            className="user-profile-card" 
            onClick={() => handleNavClick('profile')}
            style={{
              cursor: 'pointer',
              borderColor: activePage === 'profile' ? 'var(--border-emerald)' : 'var(--border-subtle)',
              backgroundColor: activePage === 'profile' ? 'var(--emerald-glow)' : 'rgba(255, 255, 255, 0.03)',
              transition: 'all 0.2s ease'
            }}
            title="Click to view & edit profile"
          >
            <div className="user-avatar">
              <Building2 size={18} />
            </div>
            <div className="user-info">
              <span className="user-name">{user.user_metadata?.name || 'Business User'}</span>
              <span className="business-name">{user.user_metadata?.businessName || 'My Business'}</span>
            </div>
          </div>
        )}

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`nav-item ${isActive ? 'nav-item-active' : ''}`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {item.badge > 0 && (
                  <span className="nav-badge">{item.badge}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button onClick={logout} className="btn-logout">
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Top Navbar Header */}
      <header className="mobile-header">
        <div className="mobile-brand" onClick={() => handleNavClick('dashboard')} style={{ cursor: 'pointer' }}>
          <Shield size={20} className="text-emerald" />
          <span className="brand-title" style={{ fontSize: '1.1rem' }}>Finscan</span>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="mobile-toggle-btn">
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-drawer">
          <div className="mobile-drawer-content">
            {user && (
              <div 
                className="user-profile-card" 
                onClick={() => handleNavClick('profile')}
                style={{ marginBottom: '1rem', cursor: 'pointer' }}
              >
                <User size={18} />
                <div className="user-info">
                  <span className="user-name">{user.user_metadata?.name}</span>
                  <span className="business-name">{user.user_metadata?.businessName}</span>
                </div>
              </div>
            )}
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`nav-item ${isActive ? 'nav-item-active' : ''}`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                  {item.badge > 0 && (
                    <span className="nav-badge">{item.badge}</span>
                  )}
                </button>
              );
            })}
            <button onClick={() => { logout(); setMobileMenuOpen(false); }} className="btn-logout" style={{ marginTop: '1rem' }}>
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      <style>{`
        .desktop-sidebar {
          width: 260px;
          background-color: var(--bg-surface);
          border-right: 1px solid var(--border-subtle);
          display: flex;
          flex-direction: column;
          padding: 1.5rem 1rem;
          min-height: 100vh;
        }

        .sidebar-brand {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem;
          margin-bottom: 1.5rem;
        }

        .logo-badge {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid var(--border-emerald);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .brand-title {
          font-size: 1.25rem;
          line-height: 1.1;
        }

        .brand-subtitle {
          font-size: 0.72rem;
          color: var(--text-muted);
          display: block;
        }

        .user-profile-card {
          background-color: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 0.75rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }

        .user-avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: var(--bg-card);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--emerald-400);
          border: 1px solid var(--border-medium);
        }

        .user-info {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .user-name {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-main);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .business-name {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          flex: 1;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          border-radius: var(--radius-md);
          color: var(--text-muted);
          background: transparent;
          border: 1px solid transparent;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          transition: all 0.2s ease;
          width: 100%;
          text-align: left;
        }

        .nav-item:hover {
          color: var(--text-main);
          background-color: rgba(255, 255, 255, 0.04);
        }

        .nav-item-active {
          color: var(--emerald-400);
          background-color: var(--emerald-glow);
          border-color: var(--border-emerald);
          font-weight: 600;
        }

        .nav-badge {
          margin-left: auto;
          background-color: var(--risk-high);
          color: white;
          font-size: 0.72rem;
          font-weight: 700;
          padding: 0.1rem 0.5rem;
          border-radius: 9999px;
        }

        .sidebar-footer {
          padding-top: 1rem;
          border-top: 1px solid var(--border-subtle);
        }

        .btn-logout {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          width: 100%;
          padding: 0.75rem 1rem;
          border-radius: var(--radius-md);
          background: transparent;
          border: 1px solid var(--border-medium);
          color: var(--text-muted);
          cursor: pointer;
          font-weight: 500;
          font-size: 0.88rem;
          transition: all 0.2s ease;
        }

        .btn-logout:hover {
          color: var(--risk-high);
          border-color: rgba(239, 68, 68, 0.4);
          background: rgba(239, 68, 68, 0.1);
        }

        .mobile-header {
          display: none;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.25rem;
          background-color: var(--bg-surface);
          border-bottom: 1px solid var(--border-subtle);
        }

        .mobile-brand {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .mobile-toggle-btn {
          background: transparent;
          border: none;
          color: var(--text-main);
          cursor: pointer;
        }

        .mobile-drawer {
          display: none;
        }

        @media (max-width: 900px) {
          .desktop-sidebar {
            display: none;
          }
          .mobile-header {
            display: flex;
          }
          .mobile-drawer {
            display: block;
            position: fixed;
            top: 60px;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(9, 13, 22, 0.95);
            backdrop-filter: blur(8px);
            z-index: 90;
            padding: 1.5rem;
          }
        }
      `}</style>
    </>
  );
};

export default Navbar;
