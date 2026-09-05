import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function TeacherDashboard() {
  const [teacher, setTeacher] = useState(null);
  const [loginInput, setLoginInput] = useState({ teacherId: '', password: '' });
  const [activeTab, setActiveTab] = useState('resources'); // 'resources' | 'qr'
  const [message, setMessage] = useState(null);

  // QR Generator Form States
  const [qrDetails, setQrDetails] = useState({
    dept: 'MCA',
    year: '1st Year',
    section: 'Sec A',
    hour: 'Hour 1 (09:00 AM)'
  });
  const [generatedQr, setGeneratedQr] = useState(null);

  // Subject PDF Publication Form States
  const [newResource, setNewResource] = useState({
    subject: '',
    dept: 'MCA',
    year: '1st Year',
    docType: 'Lecture Notes',
    title: '',
    fileUrl: '',
    size: '2.8 MB'
  });
  const [publishedResources, setPublishedResources] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem("teacher_session");
    if (saved) {
      const parsed = JSON.parse(saved);
      setTeacher(parsed);
      fetchUploadedResources();
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/login', loginInput);
      if (res.data && res.data.success) {
        localStorage.setItem("teacher_session", JSON.stringify(res.data.teacher));
        setTeacher(res.data.teacher);
        fetchUploadedResources();
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Login failed.' });
    }
  };

  const fetchUploadedResources = async () => {
    try {
      const res = await axios.get('/api/resources');
      if (res.data && res.data.success) {
        setPublishedResources(res.data.resources);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePublishPdf = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/resources/create', {
        ...newResource,
        uploadedBy: teacher.full_name
      });
      if (res.data && res.data.success) {
        setMessage({ type: 'success', text: '✅ Subject PDF successfully published to Academic Hub!' });
        setNewResource({ subject: '', dept: 'MCA', year: '1st Year', docType: 'Lecture Notes', title: '', fileUrl: '', size: '2.8 MB' });
        fetchUploadedResources();
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to publish resource.' });
    }
  };

  const handleDeleteResource = async (id) => {
    if (!window.confirm("Remove this document from Academic Hub?")) return;
    try {
      await axios.delete(`/api/resources/${id}`);
      setMessage({ type: 'success', text: 'Document removed from Hub.' });
      fetchUploadedResources();
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to delete.' });
    }
  };

  const handleGenerateQR = () => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await axios.post('/api/qr/generate-location', {
            ...qrDetails,
            date: new Date().toISOString().split('T')[0],
            teacherLat: pos.coords.latitude,
            teacherLng: pos.coords.longitude,
            teacherId: teacher.teacher_id
          });
          if (res.data && res.data.success) {
            setGeneratedQr(res.data.sessionId);
            setMessage({ type: 'success', text: 'Live Classroom QR session active!' });
          }
        } catch (err) {
          setMessage({ type: 'error', text: 'QR Generation failed.' });
        }
      },
      () => setMessage({ type: 'error', text: 'GPS Location permission required.' })
    );
  };

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '20px 16px', minHeight: '100vh' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--primary)', margin: 0 }}>👨‍🏫 FacultyPortal</h2>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Classroom & Syllabus Control</span>
        </div>
        {teacher && (
          <button
            onClick={() => { localStorage.removeItem("teacher_session"); setTeacher(null); }}
            className="btn btn-secondary"
            style={{ fontSize: '0.75rem', padding: '6px 12px', color: '#ef4444' }}
          >
            Sign Out
          </button>
        )}
      </div>

      {!teacher ? (
        <div className="card" style={{ padding: '28px', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>📚</div>
          <h3 style={{ marginBottom: '6px' }}>Faculty Account Link</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Enter your Teacher ID and Password to manage class sessions & PDFs.
          </p>
          <form onSubmit={handleLogin}>
            <input
              type="text"
              placeholder="Faculty ID (e.g. FAC101)"
              value={loginInput.teacherId}
              onChange={(e) => setLoginInput({ ...loginInput, teacherId: e.target.value.toUpperCase() })}
              style={{ width: '100%', padding: '12px', marginBottom: '10px', textAlign: 'center', fontWeight: '700' }}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={loginInput.password}
              onChange={(e) => setLoginInput({ ...loginInput, password: e.target.value })}
              style={{ width: '100%', padding: '12px', marginBottom: '16px', textAlign: 'center' }}
              required
            />
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px', borderRadius: '12px' }}>
              Sign In to Faculty Portal →
            </button>
          </form>
        </div>
      ) : (
        <div>
          {/* PROFILE CARD */}
          <div className="card" style={{ padding: '20px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.68rem', fontWeight: '800', color: '#818cf8', textTransform: 'uppercase', letterSpacing: '1px' }}>FACULTY PROFILE</span>
              <h3 style={{ margin: '2px 0', fontSize: '1.15rem' }}>{teacher.full_name}</h3>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>ID: <strong>{teacher.teacher_id}</strong> • {teacher.dept_code} Dept</span>
            </div>
            <button onClick={() => window.location.href = '/hub'} className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '6px 12px' }}>
              Open Hub ↗
            </button>
          </div>

          {/* TAB BAR */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button
              onClick={() => setActiveTab('resources')}
              className={activeTab === 'resources' ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{ flex: 1, padding: '10px', fontSize: '0.82rem' }}
            >
              📄 Upload Subject PDF
            </button>
            <button
              onClick={() => setActiveTab('qr')}
              className={activeTab === 'qr' ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{ flex: 1, padding: '10px', fontSize: '0.82rem' }}
            >
              📷 Live QR Session
            </button>
          </div>

          {message && (
            <div style={{ padding: '10px', borderRadius: '10px', marginBottom: '14px', fontSize: '0.82rem', background: message.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: message.type === 'success' ? '#10b981' : '#ef4444' }}>
              {message.text}
            </div>
          )}

          {/* TAB 1: UPLOAD SUBJECT PDF DIRECTLY */}
          {activeTab === 'resources' && (
            <div>
              <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem' }}>Publish Document to Academic Hub</h4>
                <form onSubmit={handlePublishPdf}>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Subject Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Distributed Operating Systems"
                      value={newResource.subject}
                      onChange={(e) => setNewResource({ ...newResource, subject: e.target.value })}
                      style={{ width: '100%', padding: '8px' }}
                      required
                    />
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Document Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Unit 3 - Synchronization & Deadlock Notes"
                      value={newResource.title}
                      onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                      style={{ width: '100%', padding: '8px' }}
                      required
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Department</label>
                      <select
                        value={newResource.dept}
                        onChange={(e) => setNewResource({ ...newResource, dept: e.target.value })}
                        style={{ width: '100%', padding: '8px' }}
                      >
                        <option value="MCA">MCA</option>
                        <option value="CSE">CSE</option>
                        <option value="IT">IT</option>
                        <option value="ECE">ECE</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Category</label>
                      <select
                        value={newResource.docType}
                        onChange={(e) => setNewResource({ ...newResource, docType: e.target.value })}
                        style={{ width: '100%', padding: '8px' }}
                      >
                        <option value="Lecture Notes">Lecture Notes</option>
                        <option value="Lab Manual">Lab Manual</option>
                        <option value="Question Bank">Question Bank</option>
                        <option value="Syllabus">Syllabus</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>PDF Direct Link (Google Drive / Cloudinary / URL)</label>
                    <input
                      type="url"
                      placeholder="https://.../notes.pdf"
                      value={newResource.fileUrl}
                      onChange={(e) => setNewResource({ ...newResource, fileUrl: e.target.value })}
                      style={{ width: '100%', padding: '8px' }}
                      required
                    />
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '10px', fontWeight: '700' }}>
                    + Publish to Academic Hub
                  </button>
                </form>
              </div>

              {/* LIST OF PUBLISHED PDFS */}
              <div className="card" style={{ padding: '20px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.92rem' }}>Currently Uploaded Documents</h4>
                <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                  {publishedResources.length === 0 ? (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No documents uploaded yet.</p>
                  ) : (
                    publishedResources.map((doc) => (
                      <div key={doc._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--glass-border)', fontSize: '0.8rem' }}>
                        <div>
                          <strong>{doc.subject}</strong>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{doc.title}</div>
                        </div>
                        <button
                          onClick={() => handleDeleteResource(doc._id)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: '700', fontSize: '0.78rem' }}
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LIVE QR CODE */}
          {activeTab === 'qr' && (
            <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem' }}>Broadcast Geofenced Classroom QR</h4>
              <button
                onClick={handleGenerateQR}
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px', borderRadius: '12px', fontWeight: '700', marginBottom: '14px' }}
              >
                ⚡ Start 10-Minute Class Session
              </button>

              {generatedQr && (
                <div style={{ padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>SESSION ACTIVE</span>
                  <div style={{ fontSize: '1rem', fontWeight: '800', color: '#34d399', margin: '4px 0' }}>{generatedQr}</div>
                  <small style={{ color: 'var(--text-muted)' }}>Students must be within 500m to verify.</small>
                </div>
              )}
            </div>
          )}
        </div>
      )}

    </div>
  );
}