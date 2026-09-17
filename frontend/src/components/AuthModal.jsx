import React, { useState } from 'react';
import { loginUser, registerUserAcc } from '../services/api';

export default function AuthModal({ role = 'USER', onLoginSuccess, onClose }) {
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [identityInput, setIdentityInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const targetRole = role || 'USER';

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
          });
        }
      } else {
        const res = await registerUserAcc({
          username: identityInput.trim(),
          password: passwordInput.trim(),
          role: targetRole,
        });

        if (res.success) {
          // Auto login upon successful registration
          onLoginSuccess({
            did: res.did,
            role: res.role || targetRole,
            username: res.username,
          });
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
      <div className="glass-card modal-container auth-modal-box">
        <div className="flex-between card-header-row mb-3">
          <div>
            <h3 className="card-title">
              {mode === 'login' ? `${targetRole} Portal Access` : `Register New ${targetRole} Account`}
            </h3>
            <p className="card-desc">
              {mode === 'login'
                ? `Enter credentials to access the ${targetRole} workspace.`
                : `Create a ${targetRole} account to access digital assets & operations.`}
            </p>
          </div>
          {onClose && (
            <button className="btn btn-xs btn-outline" onClick={onClose}>
              Cancel
            </button>
          )}
        </div>

        {errorMsg && (
          <div className="alert alert-error mb-3">
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="form-layout">
          <div className="form-group">
            <label className="label">
              {mode === 'login' ? 'DID or Username:' : 'Choose Username / DID:'}
            </label>
            <input
              type="text"
              className="input"
              value={identityInput}
              onChange={(e) => setIdentityInput(e.target.value)}
              placeholder={mode === 'login' ? `e.g. ${targetRole}001 or did:sih26125:${targetRole}001` : 'e.g. rajesh_kumar'}
              required
            />
          </div>

          <div className="form-group">
            <label className="label">Password:</label>
            <input
              type="password"
              className="input"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="••••••••••••"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading
              ? 'Authenticating...'
              : mode === 'login'
              ? `Log In to ${targetRole} Workspace`
              : 'Create Account & Proceed'}
          </button>
        </form>

        <div className="auth-toggle-row mt-3 text-center">
          {mode === 'login' ? (
            <p className="text-sm text-muted">
              Don't have a registered account yet?{' '}
              <button
                type="button"
                className="btn-link"
                onClick={() => { setMode('register'); setErrorMsg(''); }}
              >
                Sign Up / Register
              </button>
            </p>
          ) : (
            <p className="text-sm text-muted">
              Already have an account?{' '}
              <button
                type="button"
                className="btn-link"
                onClick={() => { setMode('login'); setErrorMsg(''); }}
              >
                Log In
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
