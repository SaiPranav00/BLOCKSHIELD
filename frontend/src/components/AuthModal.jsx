import React, { useState } from 'react';
import { loginUser, registerUserAcc } from '../services/api';

export default function AuthModal({ role = 'USER', onLoginSuccess, onClose }) {
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [identityInput, setIdentityInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [docFile, setDocFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const targetRole = role || 'USER';

  const roleIcons = {
    ADMIN: '🛡️',
    MANAGER: '💼',
    AUDITOR: '🔍',
    USER: '👤',
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!identityInput.trim() || !passwordInput.trim()) {
      return setErrorMsg('Please fill in both identity/username and password');
    }

    setLoading(true);
    try {
      if (mode === 'login') {
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
      } else {
        const res = await registerUserAcc({
          username: identityInput.trim(),
          password: passwordInput.trim(),
          role: targetRole,
        });

        if (res.success) {
          setMode('login');
          setErrorMsg(`✅ Registration request submitted for '${res.username}'! Access is locked until Admin approves your request and issues your DID (${res.did}).`);
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-container auth-modal-box">
        <form onSubmit={handleSubmit} className="modal-form-padded">
          {/* Header Row */}
          <div className="modal-header-row">
            <div className="modal-title-group">
              <span className="modal-kicker-tag">BLOCKSHIELD FABRIC AUTHENTICATION</span>
              <h2 className="auth-modal-title">
                <span className="role-icon-inline">{roleIcons[targetRole] || '🔐'}</span>
                {mode === 'login' ? `${targetRole} Portal Access` : `Register New ${targetRole} Account`}
              </h2>
              <p className="modal-intro">
                {mode === 'login'
                  ? `Enter credentials to access the ${targetRole} workspace.`
                  : `Create a ${targetRole} account to access digital assets & operations.`}
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
              onClick={() => { setMode('login'); setErrorMsg(''); }}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`segmented-tab ${mode === 'register' ? 'active' : ''}`}
              onClick={() => { setMode('register'); setErrorMsg(''); }}
            >
              Create Account
            </button>
          </div>

          {errorMsg && (
            <div className="form-error-alert" role="alert">
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form Fields */}
          <div className="form-layout">
            <div className="form-group">
              <label className="label">
                {mode === 'login' ? 'DID or Username:' : 'Choose Username / DID:'}
              </label>
              <div className="input-with-icon">
                <span className="input-field-icon">👤</span>
                <input
                  type="text"
                  className="input input-has-icon"
                  value={identityInput}
                  onChange={(e) => setIdentityInput(e.target.value)}
                  placeholder={mode === 'login' ? `e.g. ${targetRole}001 or did:sih26125:${targetRole}001` : 'e.g. rajesh_kumar'}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="label">Password:</label>
              <div className="input-with-icon">
                <span className="input-field-icon">🔒</span>
                <input
                  type="password"
                  className="input input-has-icon"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••••••"
                  required
                />
              </div>
            </div>

            {mode === 'register' && (
              <div className="form-group">
                <label className="label">Verification Document (Optional):</label>
                <label className="upload-control">
                  <span className="upload-icon">↑</span>
                  <span>
                    <strong>{docFile ? docFile.name : 'Choose a PDF or image'}</strong>
                    <small>PDF, JPG, or PNG · up to 10 MB</small>
                  </span>
                  <input
                    id="auth-document"
                    name="document"
                    type="file"
                    accept="application/pdf,image/jpeg,image/png"
                    onChange={handleFileChange}
                    onClick={(e) => e.stopPropagation()}
                  />
                </label>
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-block btn-lg mt-2" disabled={loading}>
              <span>
                {loading
                  ? 'Authenticating...'
                  : mode === 'login'
                  ? `Log In to ${targetRole} Workspace`
                  : 'Create Account & Proceed'}
              </span>
              <span className="btn-arrow-right">→</span>
            </button>
          </div>

          <div className="auth-toggle-row">
            {mode === 'login' ? (
              <p className="auth-toggle-text">
                Don't have a registered account yet?{' '}
                <button
                  type="button"
                  className="btn-link-action"
                  onClick={() => { setMode('register'); setErrorMsg(''); }}
                >
                  Sign Up / Register
                </button>
              </p>
            ) : (
              <p className="auth-toggle-text">
                Already have an account?{' '}
                <button
                  type="button"
                  className="btn-link-action"
                  onClick={() => { setMode('login'); setErrorMsg(''); }}
                >
                  Log In
                </button>
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
