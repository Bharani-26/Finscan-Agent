import React, { useState, useEffect } from 'react';
import { useFinGuard } from '../context/FinGuardContext';
import { 
  User, 
  Mail, 
  Building2, 
  Briefcase, 
  FileCheck2, 
  Edit3, 
  Save, 
  X, 
  AlertCircle,
  ShieldCheck
} from 'lucide-react';
import PhoneNumberInput from '../components/PhoneNumberInput';

const Profile = () => {
  const { user, updateUserProfile } = useFinGuard();

  // Read-only vs Edit Mode toggle
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isPhoneInvalid, setIsPhoneInvalid] = useState(false);

  // Form State initialized from user session / metadata
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    businessName: '',
    phone: '+919876543210',
    businessType: 'Pvt Ltd',
    gstin: ''
  });

  // Sync state with active user context
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.user_metadata?.name || '',
        email: user.email || '',
        businessName: user.user_metadata?.businessName || '',
        phone: user.user_metadata?.phone || '+919876543210',
        businessType: user.user_metadata?.businessType || 'Pvt Ltd',
        gstin: user.user_metadata?.gstin || '27AABCU9603R1ZN'
      });
    }
  }, [user]);

  // Handle Edit Mode Toggle
  const handleEditClick = () => {
    setIsEditing(true);
    setError('');
  };

  // Handle Cancel Edit
  const handleCancelClick = () => {
    setIsEditing(false);
    setError('');
    setIsPhoneInvalid(false);
    if (user) {
      setFormData({
        name: user.user_metadata?.name || '',
        email: user.email || '',
        businessName: user.user_metadata?.businessName || '',
        phone: user.user_metadata?.phone || '+919876543210',
        businessType: user.user_metadata?.businessType || 'Pvt Ltd',
        gstin: user.user_metadata?.gstin || '27AABCU9603R1ZN'
      });
    }
  };

  // Form Validation
  const validate = () => {
    if (!formData.name.trim()) return 'Full Name is required.';
    if (!formData.businessName.trim()) return 'Business Name is required.';
    if (!formData.email || !formData.email.includes('@')) return 'Please enter a valid work email address.';
    if (isPhoneInvalid) return 'Please enter a valid phone number for the selected country.';
    return null;
  };

  // Handle Save Profile
  const handleSaveClick = async (e) => {
    e.preventDefault();
    setError('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    try {
      const res = await updateUserProfile(formData);
      if (res.success) {
        setIsEditing(false);
      }
    } catch (err) {
      setError('An unexpected error occurred while saving profile.');
    } finally {
      setSaving(false);
    }
  };

  const isSaveDisabled = saving || isPhoneInvalid;

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Business & Account Profile</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Manage entity details, tax identification parameters, and contact credentials
          </p>
        </div>

        {!isEditing ? (
          <button onClick={handleEditClick} className="btn btn-primary">
            <Edit3 size={16} />
            <span>Edit Profile</span>
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={handleCancelClick} className="btn btn-secondary" disabled={saving}>
              <X size={16} />
              <span>Cancel</span>
            </button>
            <button onClick={handleSaveClick} className="btn btn-primary" disabled={isSaveDisabled}>
              <Save size={16} />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Validation Error Banner */}
      {error && (
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#FCA5A5',
          padding: '0.85rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.88rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Profile Card */}
      <div className="card" style={{ padding: '2rem' }}>
        {/* Profile Header Avatar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1.25rem',
          paddingBottom: '1.5rem',
          marginBottom: '1.75rem',
          borderBottom: '1px solid var(--border-subtle)'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid var(--border-emerald)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--emerald-400)'
          }}>
            <User size={32} />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h2 style={{ fontSize: '1.35rem', color: 'var(--text-main)' }}>{formData.name || 'Business User'}</h2>
              <span className="badge badge-low" style={{ fontSize: '0.72rem' }}>
                <ShieldCheck size={12} />
                VERIFIED ENTITY
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '0.15rem' }}>
              {formData.businessName} • {formData.businessType}
            </p>
          </div>
        </div>

        {/* Form Fields Grid */}
        <form onSubmit={handleSaveClick}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.5rem'
          }}>
            {/* Field 1: Full Name */}
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                  disabled={!isEditing}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            </div>

            {/* Field 2: Email */}
            <div className="form-group">
              <label className="form-label">Work Email *</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                  disabled={!isEditing}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            {/* Field 3: Business Name */}
            <div className="form-group">
              <label className="form-label">Business / Enterprise Name *</label>
              <div style={{ position: 'relative' }}>
                <Building2 size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                  disabled={!isEditing}
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                />
              </div>
            </div>

            {/* Field 4: International Phone Number */}
            <div className="form-group">
              <label className="form-label">International Phone Number</label>
              <PhoneNumberInput
                value={formData.phone}
                onChange={(val) => setFormData({ ...formData, phone: val })}
                disabled={!isEditing}
                defaultCountry="IN"
                onErrorChange={(hasError) => setIsPhoneInvalid(hasError)}
              />
            </div>

            {/* Field 5: Industry / Business Type */}
            <div className="form-group">
              <label className="form-label">Entity Type / Structure</label>
              <div style={{ position: 'relative' }}>
                <Briefcase size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <select
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                  disabled={!isEditing}
                  value={formData.businessType}
                  onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                >
                  <option value="Sole Proprietor">Sole Proprietor</option>
                  <option value="Partnership">Partnership</option>
                  <option value="Pvt Ltd">Private Limited (Pvt Ltd)</option>
                  <option value="LLP">Limited Liability Partnership (LLP)</option>
                  <option value="Other">Other / Non-Profit</option>
                </select>
              </div>
            </div>

            {/* Field 6: GSTIN / Tax ID */}
            <div className="form-group">
              <label className="form-label">GSTIN / Tax Registration Number</label>
              <div style={{ position: 'relative' }}>
                <FileCheck2 size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="form-input mono"
                  style={{ paddingLeft: '2.5rem' }}
                  disabled={!isEditing}
                  placeholder="e.g. 27AABCU9603R1ZN"
                  value={formData.gstin}
                  onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          {isEditing && (
            <div style={{
              marginTop: '1.75rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '0.75rem'
            }}>
              <button type="button" onClick={handleCancelClick} className="btn btn-secondary">
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={isSaveDisabled}
                style={{
                  opacity: isSaveDisabled ? 0.5 : 1,
                  cursor: isSaveDisabled ? 'not-allowed' : 'pointer'
                }}
              >
                <Save size={16} />
                <span>{saving ? 'Saving...' : 'Save Profile'}</span>
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default Profile;
