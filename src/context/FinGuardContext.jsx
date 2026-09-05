import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  supabase, 
  getStoredInvoices, 
  saveInvoiceToStore, 
  getStoredAlerts, 
  updateAlertStatusInStore,
  updateProfile,
  getStoredProfile
} from '../services/mockApi';

const FinGuardContext = createContext(null);

export const FinGuardProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [activePage, setActivePage] = useState('dashboard');
  
  const [invoices, setInvoices] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [toast, setToast] = useState(null);

  // Initialize session and stored data on mount
  useEffect(() => {
    const initSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session) {
        setSession(data.session);
        setUser(data.session.user);
      }
      setLoadingAuth(false);
    };

    initSession();
    setInvoices(getStoredInvoices());
    setAlerts(getStoredAlerts());
  }, []);

  // Toast notification system
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Auth Handlers
  const login = async (email, password) => {
    const res = await supabase.auth.signInWithPassword({ email, password });
    if (res.error) {
      return { success: false, error: res.error.message };
    }
    setSession(res.data.session);
    setUser(res.data.user);
    showToast(`Welcome back, ${res.data.user.user_metadata?.name || 'User'}!`);
    return { success: true };
  };

  const register = async (name, businessName, email, password) => {
    const res = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, businessName } }
    });
    if (res.error) {
      return { success: false, error: res.error.message };
    }
    setSession(res.data.session);
    setUser(res.data.user);
    showToast('Account created successfully!');
    return { success: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setActivePage('dashboard');
    showToast('Logged out successfully', 'success');
  };

  // Profile Update Handler
  const updateUserProfile = async (profileData) => {
    const res = await updateProfile(profileData);
    if (res.success) {
      // Update local state
      setUser(prev => ({
        ...prev,
        email: profileData.email,
        user_metadata: {
          ...prev?.user_metadata,
          name: profileData.name,
          businessName: profileData.businessName,
          phone: profileData.phone,
          businessType: profileData.businessType,
          gstin: profileData.gstin
        }
      }));
      showToast('Profile updated successfully', 'success');
      return { success: true };
    } else {
      showToast('Failed to update profile', 'error');
      return { success: false };
    }
  };

  // Invoice Handlers
  const addInvoice = (invoiceData) => {
    const updatedInvoices = saveInvoiceToStore(invoiceData);
    setInvoices(updatedInvoices);

    if (invoiceData.riskLevel === 'HIGH' || invoiceData.riskLevel === 'MEDIUM') {
      const newAlert = {
        id: `ALT-${Math.floor(100 + Math.random() * 900)}`,
        issue: invoiceData.riskLevel === 'HIGH' ? 'High Risk Document Flagged' : 'Compliance Warning Detected',
        riskLevel: invoiceData.riskLevel,
        explanation: invoiceData.taxVerification || invoiceData.aiSummary,
        recommendation: 'Review vendor tax details and line items before confirming payout.',
        status: 'pending',
        date: new Date().toISOString().split('T')[0],
        invoiceRef: invoiceData.invoiceNumber
      };
      updateAlertStatusInStore(newAlert.id, 'pending');
      setAlerts(prev => [newAlert, ...prev]);
    }

    showToast(`Invoice ${invoiceData.invoiceNumber} added to dashboard!`);
  };

  // Alert Handlers
  const markAlertAsReviewed = (alertId) => {
    const updated = updateAlertStatusInStore(alertId, 'reviewed');
    setAlerts(updated);
    showToast('Compliance alert marked as reviewed', 'success');
  };

  return (
    <FinGuardContext.Provider value={{
      user,
      session,
      loadingAuth,
      activePage,
      setActivePage,
      invoices,
      alerts,
      toast,
      showToast,
      login,
      register,
      logout,
      updateUserProfile,
      addInvoice,
      markAlertAsReviewed
    }}>
      {children}
    </FinGuardContext.Provider>
  );
};

export const useFinGuard = () => {
  const context = useContext(FinGuardContext);
  if (!context) {
    throw new Error('useFinGuard must be used within a FinGuardProvider');
  }
  return context;
};

// Alias export for Finscan naming consistency
export const useFinscan = useFinGuard;
