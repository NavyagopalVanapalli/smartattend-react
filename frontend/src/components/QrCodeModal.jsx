import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function QrCodeModal({ isOpen, onClose, qrData, sessionInfo }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ textAlign: 'center' }}>
        <h3>Classroom Attendance QR Code</h3>
        
        <div style={{ margin: '20px auto', display: 'flex', justifyContent: 'center', background: '#fff', padding: '15px', borderRadius: '16px', width: 'fit-content' }}>
          <QRCodeSVG value={qrData} size={220} />
        </div>

        <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--primary)' }}>
          {sessionInfo?.dept} - {sessionInfo?.sec} | Scan to Mark Attendance 📍
        </p>

        <div className="modal-actions" style={{ justifyContent: 'center', marginTop: '20px' }}>
          <button onClick={onClose} className="btn btn-secondary">Close</button>
        </div>
      </div>
    </div>
  );
}