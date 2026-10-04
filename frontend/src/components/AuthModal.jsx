import React, { useState } from 'react';
import { loginUser, registerUserAcc } from '../services/api';
import { DEMO_USERS } from '../constants/demoUsers';

export default function AuthModal({ role = 'USER', onLoginSuccess, onClose }) {
  const targetRole = role || 'USER';
  const defaultDemo = DEMO_USERS.find(u => u.role === targetRole) || DEMO_USERS[0];

  const [mode, setMode] = useState('login'); // 'login' or 'register'

  // Login Form States
  const [identityInput, setIdentityInput] = useState(defaultDemo.username);
  const [passwordInput, setPasswordInput] = useState(defaultDemo.password);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Multi-Category Registration States
  const [userCategory, setUserCategory] = useState('DEFENCE'); // 'DEFENCE' | 'SOFTWARE' | 'NON_DEFENCE'
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('password123');
  const [showRegPassword, setShowRegPassword] = useState(false);
  
  // Identity Proof States
  const [idProofType, setIdProofType] = useState('GOVERNMENT_ID');
  const [idProofNumber, setIdProofNumber] = useState('');

  // Organization Proof States
  const [serviceId, setServiceId] = useState('');
  const [department, setDepartment] = useState('');
  const [orgAuthCode, setOrgAuthCode] = useState('BEL-SEC-2026');
  const [employeeId, setEmployeeId] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [orgName, setOrgName] = useState('');
  const [orgIdOptional, setOrgIdOptional] = useState('');

  const [docFile, setDocFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successInfo, setSuccessInfo] = useState(null);

  const handleSelectCategory = (cat) => {
    setUserCategory(cat);
    setErrorMsg('');
    if (cat === 'DEFENCE') {
      setIdProofType('GOVERNMENT_ID');
      setOrgAuthCode('BEL-SEC-2026');
    } else if (cat === 'SOFTWARE') {
      setIdProofType('AADHAAR');
      setOrgAuthCode('TECH-AUTH-2026');
    } else {
      setIdProofType('AADHAAR');
      setOrgAuthCode('');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const acceptedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
      if (!acceptedTypes.includes(file.type)) {
        setErrorMsg('Choose a PDF, JPG, or PNG document.');
        setDocFile(null);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setErrorMsg('The selected document must be 10 MB or smaller.');
        setDocFile(null);
        return;
      }
      setErrorMsg('');
      setDocFile(file);
    }
  };

  const handleOneClickLogin = async (u) => {
    setIdentityInput(u.username);
    setPasswordInput(u.password);
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await loginUser({
        identity: u.username,
        password: u.password,
        role: u.role,
      });

      if (res && res.authenticated) {
        onLoginSuccess({
          did: res.did,
          role: res.role || u.role,
          username: res.username || u.username,
          documentAttached: false,
        });
      } else {
        setErrorMsg((res && res.error) || 'Authentication failed. Please verify credentials.');
      }
    } catch (err) {
      setErrorMsg(err.message || '1-Click demo authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessInfo(null);

    if (mode === 'login') {
      if (!identityInput.trim() || !passwordInput.trim()) {
        return setErrorMsg('Please enter both identity/username and password');
      }

      setLoading(true);
      try {
        const res = await loginUser({
          identity: identityInput.trim(),
          password: passwordInput.trim(),
          role: targetRole,
        });

        if (res.authenticated) {
          onLoginSuccess({
            did: res.did,
            role: res.role || targetRole,
            username: res.username || res.did,
            documentAttached: !!docFile,
          });
        }
      } catch (err) {
        setErrorMsg(err.message || 'Authentication failed. Please check credentials.');
      } finally {
        setLoading(false);
      }
    } else {
      // Registration validation based on User Category
      if (!regUsername.trim() || !regPassword.trim()) {
        return setErrorMsg('Please choose a username and password.');
      }
      if (!idProofNumber.trim()) {
        return setErrorMsg('Identity proof document number is required.');
      }

      if (userCategory === 'DEFENCE' && !serviceId.trim()) {
        return setErrorMsg('Official Service/Employee ID is required for Defence/Government accounts.');
      }
      if (userCategory === 'SOFTWARE' && (!employeeId.trim() || !companyEmail.trim())) {
        return setErrorMsg('Employee ID and Official Company Email are required for Software/Technology accounts.');
      }

      setLoading(true);
      try {
        const orgProofData = {
          serviceId: serviceId.trim(),
          department: department.trim() || (userCategory === 'DEFENCE' ? 'BEL Radar Systems' : 'Technology Unit'),
          authCode: orgAuthCode.trim(),
          employeeId: employeeId.trim(),
          companyEmail: companyEmail.trim(),
          orgName: orgName.trim(),
          orgIdOptional: orgIdOptional.trim(),
        };

        const res = await registerUserAcc({
          username: regUsername.trim(),
          password: regPassword.trim(),
          role: targetRole,
          userCategory,
          idProofType,
          idProofNumber: idProofNumber.trim(),
          orgProof: orgProofData,
          autoVerify: false,
        });

        if (res.success) {
          setSuccessInfo({
            did: res.did,
            username: res.username,
            role: res.role,
            verified: res.verified,
            status: res.status || 'PENDING_APPROVAL',
            message: res.message || 'Access application submitted! Queued for manual Administrator review and approval.',
          });
        }
      } catch (err) {
        setErrorMsg(err.message || 'Registration failed. Please check submitted proofs.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-container auth-modal-box">
        <form onSubmit={handleSubmit} className="modal-form-padded">
          {/* Header Row */}
          <div className="modal-header-row">
            <div className="modal-title-group">
              <span className="modal-kicker-tag">BLOCKSHIELD ENTERPRISE IDENTITY &amp; ACCESS</span>
              <h2 className="auth-modal-title">
                {mode === 'login' ? `${targetRole} Workspace Access` : `Request ${targetRole} Account (Admin Creation)`}
              </h2>
              <p className="modal-intro">
                {mode === 'login'
                  ? `Enter registered credentials to access the ${targetRole} workspace.`
                  : `In accordance with BlockShield enterprise governance, only the System Administrator can create accounts and issue DIDs. Submit your verification proofs for Admin approval.`}
              </p>
            </div>
            {onClose && (
              <button
                type="button"
                className="btn-modal-close"
                onClick={onClose}
                aria-label="Close dialog"
              >
                ✕
              </button>
            )}
          </div>

          {/* Mode Switch Segmented Tabs */}
          <div className="auth-segmented-tabs">
            <button
              type="button"
              className={`segmented-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => { setMode('login'); setErrorMsg(''); setSuccessInfo(null); }}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`segmented-tab ${mode === 'register' ? 'active' : ''}`}
              onClick={() => { setMode('register'); setErrorMsg(''); setSuccessInfo(null); }}
            >
              Request Account (Admin Verified)
            </button>
          </div>

          {/* Success Banner */}
          {successInfo && (
            <div className="registration-workflow-badge" role="status">
              <span>✓ {successInfo.message}</span>
            </div>
          )}

          {/* Error Alert */}
          {errorMsg && (
            <div className="form-error-alert" role="alert">
              <span>{errorMsg}</span>
            </div>
          )}

          {/* MODE 1: LOGIN */}
          {mode === 'login' && (
            <div className="form-layout">
              <div className="auth-demo-picker-box">
                <span className="auth-demo-picker-label">Quick Demo Sign In:</span>
                <div className="auth-demo-picker-chips">
                  {DEMO_USERS.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      className={`btn-demo-chip ${u.username === identityInput ? 'active' : ''}`}
                      onClick={() => handleOneClickLogin(u)}
                      disabled={loading}
                      title={`Instant 1-Click Login as ${u.displayName} (${u.role})`}
                    >
                      <span className="demo-chip-role-tag">{u.role}</span>
                      <span className="demo-chip-user">{u.username}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="label">DID or Username:</label>
                <div className="input-with-icon">
                  <span className="input-field-icon" style={{ display: 'flex', alignItems: 'center' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  </span>
                  <input
                    type="text"
                    className="input input-has-icon"
                    value={identityInput}
                    onChange={(e) => setIdentityInput(e.target.value)}
                    placeholder={`e.g. ${targetRole}001 or did:sih26125:${targetRole}001`}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="label">Password:</label>
                <div className="input-with-icon" style={{ position: 'relative' }}>
                  <span className="input-field-icon" style={{ display: 'flex', alignItems: 'center' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </span>
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    className="input input-has-icon"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    style={{ paddingRight: '40px' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#64748b',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 2
                    }}
                    title={showLoginPassword ? 'Hide password' : 'View password'}
                    aria-label={showLoginPassword ? 'Hide password' : 'View password'}
                  >
                    {showLoginPassword ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-block btn-lg mt-2" disabled={loading}>
                <span>
                  {loading ? 'Authenticating on Fabric...' : `Log In to ${targetRole} Workspace`}
                </span>
                <span className="btn-arrow-right">→</span>
              </button>
            </div>
          )}

          {/* MODE 2: MULTI-CATEGORY REGISTRATION REQUEST */}
          {mode === 'register' && successInfo ? (
            <div className="form-layout" style={{ textAlign: 'center', padding: '10px 0' }}>
              <div style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                background: '#fef3c7',
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 14px auto',
                border: '2px solid #fde68a'
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>

              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
                Account Request Queued for Admin Approval
              </h3>

              <div style={{ marginBottom: '16px' }}>
                <span style={{
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  padding: '4px 12px',
                  borderRadius: '20px',
                  background: '#fef3c7',
                  color: '#92400e',
                  border: '1px solid #fde68a',
                  letterSpacing: '0.04em'
                }}>
                  PENDING MANUAL ADMIN APPROVAL
                </span>
              </div>

              <div className="admin-governance-notice" style={{ marginBottom: '1.25rem', textAlign: 'left' }}>
                <span className="notice-icon" style={{ display: 'flex', alignItems: 'center' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                </span>
                <div>
                  <strong>Mandatory Governance Policy:</strong> The System Administrator is the <u>sole authorized person</u> who manually approves or denies new account registrations. Your verification credentials have been securely queued on the ledger.
                </div>
              </div>

              <div style={{
                background: '#f8fafc',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                padding: '16px',
                textAlign: 'left',
                fontSize: '0.82rem',
                color: '#334155',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                marginBottom: '20px'
              }}>
                <div><strong>Requested Username:</strong> {successInfo.username}</div>
                <div><strong>Assigned DID Identifier:</strong> <code style={{ fontSize: '0.78rem' }}>{successInfo.did}</code></div>
                <div><strong>Requested Workspace Role:</strong> <span className={`role-pill role-${(successInfo.role || '').toLowerCase()}`}>{successInfo.role}</span></div>
                <div><strong>Current Ledger Status:</strong> <span style={{ color: '#d97706', fontWeight: 700 }}>Awaiting Administrator Review &amp; Activation</span></div>
              </div>

              <button
                type="button"
                className="btn btn-primary btn-block btn-lg"
                onClick={() => {
                  setIdentityInput(successInfo.did);
                  setPasswordInput(regPassword);
                  setMode('login');
                  setSuccessInfo(null);
                }}
              >
                <span>Return to Sign In</span>
                <span className="btn-arrow-right">→</span>
              </button>
            </div>
          ) : mode === 'register' && (
            <div className="form-layout">
              {/* Exclusive Admin Authority Policy Notice */}
              <div className="admin-governance-notice" style={{ marginBottom: '1.25rem' }}>
                <span className="notice-icon" style={{ display: 'flex', alignItems: 'center' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                </span>
                <div>
                  <strong>Enterprise Policy:</strong> In BlockShield, the System Administrator is the <u>sole authorized person</u> who can create accounts and issue DIDs for Users, Managers, and Auditors. Submitting this form sends your verification proofs to the Administrator's queue for review and ledger provisioning.
                </div>
              </div>

              {/* USER TYPE SELECTION */}
              <div className="user-type-selector">
                <label className="label">User Category &amp; Affiliation:</label>
                <div className="user-type-grid">
                  <button
                    type="button"
                    className={`user-type-card ${userCategory === 'DEFENCE' ? 'active' : ''}`}
                    onClick={() => handleSelectCategory('DEFENCE')}
                  >
                    <div className="user-type-icon" style={{ display: 'flex', alignItems: 'center', color: '#2563eb' }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      </svg>
                    </div>
                    <div className="user-type-title">Defence / Government</div>
                    <div className="user-type-desc">BEL, Ministry of Defence, Armed Forces &amp; PSUs</div>
                  </button>

                  <button
                    type="button"
                    className={`user-type-card ${userCategory === 'SOFTWARE' ? 'active' : ''}`}
                    onClick={() => handleSelectCategory('SOFTWARE')}
                  >
                    <div className="user-type-icon" style={{ display: 'flex', alignItems: 'center', color: '#2563eb' }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                        <line x1="8" y1="21" x2="16" y2="21"/>
                        <line x1="12" y1="17" x2="12" y2="21"/>
                      </svg>
                    </div>
                    <div className="user-type-title">Software / Tech</div>
                    <div className="user-type-desc">Defense engineering contractors &amp; tech partners</div>
                  </button>

                  <button
                    type="button"
                    className={`user-type-card ${userCategory === 'NON_DEFENCE' ? 'active' : ''}`}
                    onClick={() => handleSelectCategory('NON_DEFENCE')}
                  >
                    <div className="user-type-icon" style={{ display: 'flex', alignItems: 'center', color: '#2563eb' }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="2" y1="12" x2="22" y2="12"/>
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z"/>
                      </svg>
                    </div>
                    <div className="user-type-title">Non-Defence</div>
                    <div className="user-type-desc">Civilian, academic researchers &amp; general users</div>
                  </button>
                </div>
              </div>

              {/* IDENTITY PROOF */}
              <div className="form-section-box">
                <div className="form-section-header">
                  <div>
                    <h4 className="section-step-title">Identity Proof</h4>
                    <p className="section-step-subtitle">
                      {userCategory === 'DEFENCE'
                        ? 'Government ID or Passport required for official service personnel.'
                        : userCategory === 'SOFTWARE'
                        ? 'Aadhaar, Passport, or Driving Licence for tech contractors.'
                        : 'Aadhaar, Passport, Driving Licence, or Voter ID.'}
                    </p>
                  </div>
                </div>

                <div className="form-row-2col">
                  <div className="form-group">
                    <label className="label">Identity Proof Document Type:</label>
                    <select
                      className="input"
                      value={idProofType}
                      onChange={(e) => setIdProofType(e.target.value)}
                    >
                      {userCategory === 'DEFENCE' && (
                        <>
                          <option value="GOVERNMENT_ID">Government ID Card</option>
                          <option value="OFFICIAL_PASSPORT">Official / Diplomatic Passport</option>
                          <option value="REGULAR_PASSPORT">Regular Passport</option>
                        </>
                      )}
                      {userCategory === 'SOFTWARE' && (
                        <>
                          <option value="AADHAAR">Aadhaar Card</option>
                          <option value="PASSPORT">Passport</option>
                          <option value="DRIVING_LICENCE">Driving Licence</option>
                        </>
                      )}
                      {userCategory === 'NON_DEFENCE' && (
                        <>
                          <option value="AADHAAR">Aadhaar Card</option>
                          <option value="PASSPORT">Passport</option>
                          <option value="DRIVING_LICENCE">Driving Licence</option>
                          <option value="VOTER_ID">Voter ID Card</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="label">Identity Proof Number *:</label>
                    <input
                      type="text"
                      className="input"
                      placeholder={
                        idProofType === 'AADHAAR' ? 'e.g. 5421 9876 1234'
                        : idProofType.includes('PASSPORT') ? 'e.g. Z1234567'
                        : idProofType === 'GOVERNMENT_ID' ? 'e.g. GOV-IND-90214'
                        : idProofType === 'DRIVING_LICENCE' ? 'e.g. DL-0420110023456'
                        : 'e.g. VTR-994827'
                      }
                      value={idProofNumber}
                      onChange={(e) => setIdProofNumber(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* ORGANIZATION PROOF & VERIFICATION */}
              <div className="form-section-box">
                <div className="form-section-header">
                  <div>
                    <h4 className="section-step-title">Organization Proof &amp; Verification</h4>
                    <p className="section-step-subtitle">
                      {userCategory === 'DEFENCE'
                        ? 'Mandatory service credentials and unit verification for BEL-style governance.'
                        : userCategory === 'SOFTWARE'
                        ? 'Company employee verification and work authorization.'
                        : 'Optional organizational affiliation.'}
                    </p>
                  </div>
                </div>

                {userCategory === 'DEFENCE' && (
                  <div className="form-grid-fields">
                    <div className="form-row-2col">
                      <div className="form-group">
                        <label className="label">Official Service / Employee ID *:</label>
                        <input
                          type="text"
                          className="input"
                          placeholder="e.g. BEL-SRV-9042 or AR-77120"
                          value={serviceId}
                          onChange={(e) => setServiceId(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="label">Department / Unit / Command *:</label>
                        <input
                          type="text"
                          className="input"
                          placeholder="e.g. BEL Radar Systems"
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="label">Organization Verification Code / Token *:</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="e.g. BEL-SEC-2026"
                        value={orgAuthCode}
                        onChange={(e) => setOrgAuthCode(e.target.value)}
                        required
                      />
                      <small className="field-hint">
                        Instant demo verification token: <code>BEL-SEC-2026</code>
                      </small>
                    </div>
                  </div>
                )}

                {userCategory === 'SOFTWARE' && (
                  <div className="form-grid-fields">
                    <div className="form-row-2col">
                      <div className="form-group">
                        <label className="label">Employee ID *:</label>
                        <input
                          type="text"
                          className="input"
                          placeholder="e.g. TECH-EMP-4091"
                          value={employeeId}
                          onChange={(e) => setEmployeeId(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="label">Official Company Email *:</label>
                        <input
                          type="email"
                          className="input"
                          placeholder="e.g. engineer@techpartner.com"
                          value={companyEmail}
                          onChange={(e) => setCompanyEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="label">Organization Authorization Code *:</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="e.g. TECH-AUTH-2026"
                        value={orgAuthCode}
                        onChange={(e) => setOrgAuthCode(e.target.value)}
                        required
                      />
                      <small className="field-hint">
                        Instant demo verification token: <code>TECH-AUTH-2026</code>
                      </small>
                    </div>
                  </div>
                )}

                {userCategory === 'NON_DEFENCE' && (
                  <div className="form-grid-fields">
                    <div className="form-row-2col">
                      <div className="form-group">
                        <label className="label">Affiliation / Organization Name (Optional):</label>
                        <input
                          type="text"
                          className="input"
                          placeholder="e.g. IIT Madras or Independent"
                          value={orgName}
                          onChange={(e) => setOrgName(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="label">Organization ID / Roll (Optional):</label>
                        <input
                          type="text"
                          className="input"
                          placeholder="e.g. AFFIL-2026-99"
                          value={orgIdOptional}
                          onChange={(e) => setOrgIdOptional(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ACCOUNT CREDENTIALS & DID SETUP */}
              <div className="form-section-box">
                <div className="form-section-header">
                  <div>
                    <h4 className="section-step-title">Account Credentials &amp; DID Setup</h4>
                    <p className="section-step-subtitle">Your Decentralized Identifier (DID) will be issued upon verification.</p>
                  </div>
                </div>

                <div className="form-row-2col">
                  <div className="form-group">
                    <label className="label">Desired Username / Handle *:</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. rahul_sharma"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      required
                    />
                    <small className="field-hint">
                      Generated DID: <code>did:sih26125:{regUsername || 'username'}</code>
                    </small>
                  </div>

                  <div className="form-group">
                    <label className="label">Password *:</label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        className="input"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        style={{ paddingRight: '42px' }}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        style={{
                          position: 'absolute',
                          right: '8px',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#64748b',
                          padding: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title={showRegPassword ? 'Hide password' : 'View password'}
                        aria-label={showRegPassword ? 'Hide password' : 'View password'}
                      >
                        {showRegPassword ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                            <line x1="1" y1="1" x2="23" y2="23"/>
                          </svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                          </svg>
                        )}
                      </button>
                    </div>
                    <small className="field-hint">
                      Default password set: <code>password123</code>
                    </small>
                  </div>
                </div>

                <div className="form-group mt-2">
                  <label className="label">Document Scan Proof (Optional):</label>
                  <label className="upload-control">
                    <span className="upload-icon">↑</span>
                    <span>
                      <strong>{docFile ? docFile.name : 'Upload Identity or Organization proof scan'}</strong>
                      <small>PDF, JPG, or PNG · up to 10 MB</small>
                    </span>
                    <input
                      type="file"
                      accept="application/pdf,image/jpeg,image/png"
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-block btn-lg mt-2" disabled={loading}>
                <span>
                  {loading
                    ? 'Submitting Request to Administrator...'
                    : `Submit Access Request for Admin Approval & Creation`}
                </span>
                <span className="btn-arrow-right">→</span>
              </button>
            </div>
          )}

          {/* Bottom Toggle Row */}
          <div className="auth-toggle-row">
            {mode === 'login' ? (
              <p className="auth-toggle-text">
                Need an account on BlockShield?{' '}
                <button
                  type="button"
                  className="btn-link-action"
                  onClick={() => { setMode('register'); setErrorMsg(''); setSuccessInfo(null); }}
                >
                  Request Account (Admin Verified)
                </button>
              </p>
            ) : (
              <p className="auth-toggle-text">
                Already registered?{' '}
                <button
                  type="button"
                  className="btn-link-action"
                  onClick={() => { setMode('login'); setErrorMsg(''); setSuccessInfo(null); }}
                >
                  Return to Sign In
                </button>
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
