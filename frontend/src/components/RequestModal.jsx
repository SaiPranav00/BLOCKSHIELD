import React, { useState } from 'react';

export default function RequestModal({ type = 'DID', onSubmitRequest, onClose }) {
  const isDID = type === 'DID';
  const [nameInput, setNameInput] = useState('');
  const [roleInput, setRoleInput] = useState('USER');
  const [refInput, setRefInput] = useState('');
  const [docFile, setDocFile] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

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

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!nameInput.trim()) {
      return setErrorMsg(`Please enter a valid ${isDID ? 'identity identifier' : 'asset name'}`);
    }

    if (!docFile) {
      return setErrorMsg('Attach a supporting verification document to continue.');
    }

    onSubmitRequest({
      kind: type,
      title: nameInput.trim(),
      reference: isDID ? `Role: ${roleInput}` : refInput.trim() || 'BEL-CERT-001',
      fileName: docFile.name,
    });
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="modal-topline">
            <span className="modal-kicker">DOCUMENT-BACKED REQUEST</span>
            <button
              type="button"
              className="icon-close"
              onClick={onClose}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <h2>{isDID ? 'Prepare DID verification' : 'Prepare NFT verification'}</h2>
          <p className="modal-intro">
            {isDID
              ? 'Provide the proposed identity details and attach supporting evidence.'
              : 'Provide the proposed asset details and attach supporting evidence.'}
          </p>

          {isDID ? (
            <>
              <label className="field-label" htmlFor="request-name">
                Identity identifier
              </label>
              <input
                className="field-control"
                id="request-name"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Example: BEL_EMPLOYEE_001"
                required
              />

              <label className="field-label" htmlFor="request-role">
                Requested organization role
              </label>
              <select
                className="field-control"
                id="request-role"
                value={roleInput}
                onChange={(e) => setRoleInput(e.target.value)}
              >
                <option value="USER">USER</option>
                <option value="MANAGER">MANAGER</option>
                <option value="AUDITOR">AUDITOR</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </>
          ) : (
            <>
              <label className="field-label" htmlFor="request-name">
                Asset name
              </label>
              <input
                className="field-control"
                id="request-name"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Enter asset or certificate name"
                required
              />

              <label className="field-label" htmlFor="request-reference">
                Asset reference
              </label>
              <input
                className="field-control"
                id="request-reference"
                value={refInput}
                onChange={(e) => setRefInput(e.target.value)}
                placeholder="Example: BEL-CERT-001"
                required
              />
            </>
          )}

          <label className="field-label" htmlFor="request-document">
            Supporting verification document <span>REQUIRED</span>
          </label>
          <label className="upload-control">
            <span className="upload-icon">↑</span>
            <span>
              <strong>{docFile ? docFile.name : 'Choose a PDF or image'}</strong>
              <small>PDF, JPG, or PNG · up to 10 MB</small>
            </span>
            <input
              id="request-document"
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              onChange={handleFileChange}
              onClick={(e) => e.stopPropagation()}
              required
            />
          </label>
          <p className="privacy-note">
            The verification document is referenced along with your transaction record.
          </p>

          {errorMsg && (
            <p className="form-error" role="alert">
              {errorMsg}
            </p>
          )}

          <button className="form-submit" type="submit">
            <span>Prepare for review</span>
            <span aria-hidden="true">→</span>
          </button>
        </form>
      </div>
    </div>
  );
}
