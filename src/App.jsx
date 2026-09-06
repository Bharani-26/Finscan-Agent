import React, { useState } from 'react';
import { FinGuardProvider, useFinGuard } from './context/FinGuardContext';
import DisclaimerBanner from './components/DisclaimerBanner';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import Compliance from './pages/Compliance';
import Profile from './pages/Profile';
import LoadingSpinner from './components/LoadingSpinner';
import TaxDashboard from './components/TaxDashboard';
import UploadModal from './components/UploadModal';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

const MainApp = () => {
  const { user, loadingAuth, activePage, toast } = useFinGuard();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [dashboardRefreshKey, setDashboardRefreshKey] = useState(0);

  const handleUploadSuccess = () => {
    setDashboardRefreshKey((key) => key + 1);
    setIsUploadModalOpen(false);
  };

  if (loadingAuth) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-dark)'
      }}>
        <LoadingSpinner statusText="Initializing Finscan security context..." />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="app-container">
      {/* Persistent Disclaimer Banner across all authenticated screens */}
      <DisclaimerBanner />

      {/* Main Layout with Sidebar + Content */}
      <div className="main-layout">
        <Navbar />

        <main className="content-area">
          {activePage === 'dashboard' && <TaxDashboard key={dashboardRefreshKey} userId={user.id} onOpenUpload={() => setIsUploadModalOpen(true)} />}
          {activePage === 'upload' && <Upload />}
          {activePage === 'compliance' && <Compliance />}
          {activePage === 'profile' && <Profile />}
        </main>
      </div>

      {isUploadModalOpen && (
        <UploadModal
          onClose={() => setIsUploadModalOpen(false)}
          onUploadSuccess={handleUploadSuccess}
          userId={user.id}
        />
      )}

      {/* Toast Notification Container */}
      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`}>
            {toast.type === 'error' ? (
              <AlertCircle size={18} style={{ color: 'var(--risk-high)' }} />
            ) : (
              <CheckCircle2 size={18} style={{ color: 'var(--emerald-500)' }} />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

const App = () => {
  return (
    <FinGuardProvider>
      <MainApp />
    </FinGuardProvider>
  );
};

export default App;
