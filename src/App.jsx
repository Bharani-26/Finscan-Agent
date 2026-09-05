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
import { AlertCircle, CheckCircle2, Shield, UploadCloud } from 'lucide-react';

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

      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 px-4 py-3 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-400/10 text-emerald-400">
              <Shield size={19} />
            </div>
            <div>
              <p className="text-sm font-bold tracking-tight text-white">FinScan AI</p>
              <p className="hidden text-[11px] text-slate-500 sm:block">Tax intelligence workspace</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsUploadModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-3.5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2 focus:ring-offset-slate-950"
          >
            <UploadCloud size={17} />
            <span>Upload Document</span>
          </button>
        </div>
      </header>

      {/* Main Layout with Sidebar + Content */}
      <div className="main-layout">
        <Navbar />

        <main className="content-area">
          {activePage === 'dashboard' && <TaxDashboard key={dashboardRefreshKey} onOpenUpload={() => setIsUploadModalOpen(true)} />}
          {activePage === 'upload' && <Upload />}
          {activePage === 'compliance' && <Compliance />}
          {activePage === 'profile' && <Profile />}
        </main>
      </div>

      {isUploadModalOpen && (
        <UploadModal
          onClose={() => setIsUploadModalOpen(false)}
          onUploadSuccess={handleUploadSuccess}
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
