import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function TeacherDashboard({ darkMode, setDarkMode }) {
  const [teacher, setTeacher] = useState(null);
  const [loginInput, setLoginInput] = useState({ teacherId: '', password: '' });
  const [message, setMessage] = useState(null);

  // Upload Method Toggle: 'file' | 'link'
  const [uploadMode, setUploadMode] = useState('file');

  // Form State
  const [newResource, setNewResource] = useState({
    subject: '',
    dept: 'MCA',
    year: '1st Year',
    docType: 'Lecture Notes',
    title: '',
    fileUrl: '',
    size: '0 KB'
  });

  const [selectedFileName, setSelectedFileName] = useState('');
  const [publishedResources, setPublishedResources] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

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

  const handleOpenHub = () => {
    if (teacher) {
      localStorage.setItem("hub_user", JSON.stringify({
        role: 'faculty',
        name: teacher.full_name,
        id: teacher.teacher_id,
        dept: teacher.dept_code,
        year: 'Faculty'
      }));
    }
    window.location.href = '/hub';
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

  const handleLocalFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'File too large! Max file size is 25MB.' });
      return;
    }

    const readableSize = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
    setSelectedFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      setNewResource((prev) => ({
        ...prev,
        fileUrl: reader.result,
        size: readableSize,
        title: prev.title || file.name.replace(/\.[^/.]+$/, "")
      }));
    };
    reader.readAsDataURL(file);
  };

  const handlePublishPdf = async (e) => {
    e.preventDefault();
    if (!newResource.fileUrl) {
      setMessage({ type: 'error', text: 'Please choose a file or enter a valid URL.' });
      return;
    }

    setIsUploading(true);
    try {
      const res = await axios.post('/api/resources/create', {
        ...newResource,
        uploadedBy: teacher.full_name
      });
      if (res.data.success) {
        setMessage({ type: 'success', text: '✅ Subject file successfully published to Academic Hub!' });
        setNewResource({
          subject: '',
          dept: teacher.dept_code || 'MCA',
          year: '1st Year',
          docType: 'Lecture Notes',
          title: '',
          fileUrl: '',
          size: '0 KB'
        });
        setSelectedFileName('');
        fetchUploadedResources();
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to publish resource.' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteResource = async (id) => {
    if (!window.confirm("Remove this document from the Academic Hub?")) return;
    try {
      await axios.delete(`/api/resources/${id}`);
      setMessage({ type: 'success', text: 'Document removed from Hub.' });
      fetchUploadedResources();
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to delete document.' });
    }
  };

  return (
    <div style={{ maxWidth: '780px', margin: '0 auto', padding: '24px 16px', minHeight: '100vh' }}>
      
      {/* HEADER */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 20px',
        borderRadius: '16px',
        background: 'var(--card-bg)',
        border: '1px solid var(--glass-border)',
        boxShadow: 'var(--glass-shadow)',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.25rem',
            color: '#fff'
          }}>
            👨‍🏫
          </div>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>Faculty Hub Portal</h2>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Publish Course Notes, Manuals & Question Banks</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {setDarkMode && (
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="btn btn-secondary"
              style={{ padding: '8px 12px', fontSize: '0.82rem' }}
            >
              {darkMode ? '☀️ Light' : '🌙 Dark'}
            </button>
          )}

          <button
            onClick={handleOpenHub}
            className="btn btn-secondary"
            style={{ padding: '8px 12px', fontSize: '0.82rem' }}
          >
            Open Hub ↗
          </button>

          {teacher && (
            <button
              onClick={() => { localStorage.removeItem("teacher_session"); setTeacher(null); }}
              className="btn btn-secondary"
              style={{ fontSize: '0.82rem', padding: '8px 12px', color: '#ef4444' }}
            >
              Sign Out
            </button>
          )}
        </div>
      </div>

      {/* LOGIN CARD */}
      {!teacher ? (
        <div className="card" style={{ padding: '32px 24px', textAlign: 'center', maxWidth: '420px', margin: '40px auto' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>📚</div>
          <h3 style={{ marginBottom: '6px' }}>Faculty Account Link</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Sign in with your Faculty ID to upload course materials directly to students.
          </p>
          <form onSubmit={handleLogin}>
            <input
              type="text"
              placeholder="Faculty ID (e.g. FAC101)"
              value={loginInput.teacherId}
              onChange={(e) => setLoginInput({ ...loginInput, teacherId: e.target.value.toUpperCase() })}
              style={{ width: '100%', padding: '12px', marginBottom: '12px', textAlign: 'center', fontWeight: '700' }}
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
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px', borderRadius: '12px', fontWeight: '700' }}>
              Sign In to Faculty Portal →
            </button>
          </form>
        </div>
      ) : (
        <div>
          {/* PROFILE SUMMARY BAR */}
          <div className="card" style={{ padding: '18px 20px', marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <span style={{ fontSize: '0.68rem', fontWeight: '800', color: '#818cf8', textTransform: 'uppercase', letterSpacing: '1px' }}>AUTHENTICATED FACULTY</span>
              <h3 style={{ margin: '2px 0', fontSize: '1.2rem' }}>{teacher.full_name}</h3>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Faculty ID: <strong>{teacher.teacher_id}</strong> • Dept: <strong>{teacher.dept_code}</strong>
              </span>
            </div>
            <div style={{
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '0.82rem',
              fontWeight: '700',
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
              border: '1px solid rgba(16, 185, 129, 0.3)'
            }}>
              Active Instructor
            </div>
          </div>

          {/* STATUS NOTIFICATION */}
          {message && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '12px',
              marginBottom: '16px',
              fontSize: '0.85rem',
              fontWeight: '600',
              background: message.type === 'success' ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.18)',
              color: message.type === 'success' ? '#10b981' : '#ef4444',
              border: `1px solid ${message.type === 'success' ? '#10b981' : '#ef4444'}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>{message.text}</span>
              <button onClick={() => setMessage(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: '800' }}>✕</button>
            </div>
          )}

          {/* UPLOAD FORM CARD */}
          <div className="card" style={{ padding: '24px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>📤 Publish Document to Hub</h3>
              
              <div style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.06)', padding: '4px', borderRadius: '10px' }}>
                <button
                  type="button"
                  onClick={() => setUploadMode('file')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                    fontWeight: '700',
                    background: uploadMode === 'file' ? 'var(--primary)' : 'transparent',
                    color: uploadMode === 'file' ? '#fff' : 'var(--text-muted)'
                  }}
                >
                  📁 Device File (PC/Phone)
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode('link')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                    fontWeight: '700',
                    background: uploadMode === 'link' ? 'var(--primary)' : 'transparent',
                    color: uploadMode === 'link' ? '#fff' : 'var(--text-muted)'
                  }}
                >
                  🔗 Web/Cloud Link
                </button>
              </div>
            </div>

            <form onSubmit={handlePublishPdf}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Subject Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Distributed Database Systems"
                    value={newResource.subject}
                    onChange={(e) => setNewResource({ ...newResource, subject: e.target.value })}
                    style={{ width: '100%', padding: '10px' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Topic / Document Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Unit 2 - Concurrency Control Notes"
                    value={newResource.title}
                    onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                    style={{ width: '100%', padding: '10px' }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Department</label>
                  <select
                    value={newResource.dept}
                    onChange={(e) => setNewResource({ ...newResource, dept: e.target.value })}
                    style={{ width: '100%', padding: '10px' }}
                  >
                    <option value="MCA">MCA</option>
                    <option value="CSE">CSE</option>
                    <option value="IT">IT</option>
                    <option value="ECE">ECE</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Year Level</label>
                  <select
                    value={newResource.year}
                    onChange={(e) => setNewResource({ ...newResource, year: e.target.value })}
                    style={{ width: '100%', padding: '10px' }}
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Document Type</label>
                  <select
                    value={newResource.docType}
                    onChange={(e) => setNewResource({ ...newResource, docType: e.target.value })}
                    style={{ width: '100%', padding: '10px' }}
                  >
                    <option value="Lecture Notes">Lecture Notes</option>
                    <option value="Lab Manual">Lab Manual</option>
                    <option value="Question Bank">Question Bank</option>
                    <option value="Syllabus">Syllabus</option>
                  </select>
                </div>
              </div>

              {uploadMode === 'file' ? (
                <div style={{ marginBottom: '18px' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                    Select File From Device (PDF, DOCX, PPTX)
                  </label>
                  <div style={{
                    border: '2px dashed var(--glass-border)',
                    borderRadius: '14px',
                    padding: '24px 16px',
                    textAlign: 'center',
                    background: 'rgba(255,255,255,0.02)',
                    cursor: 'pointer'
                  }}>
                    <input
                      type="file"
                      id="facultyFileInput"
                      accept=".pdf,.doc,.docx,.ppt,.pptx"
                      onChange={handleLocalFileSelect}
                      style={{ display: 'none' }}
                    />
                    <label htmlFor="facultyFileInput" style={{ cursor: 'pointer', margin: 0, textTransform: 'none' }}>
                      <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📂</div>
                      <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--primary)' }}>
                        {selectedFileName ? `Selected: ${selectedFileName}` : 'Click to Browse Files on this Computer'}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {selectedFileName ? `File Size: ${newResource.size}` : 'Maximum file size: 25 MB'}
                      </span>
                    </label>
                  </div>
                </div>
              ) : (
                <div style={{ marginBottom: '18px' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                    Direct PDF Web / Cloud URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://example.com/syllabus.pdf"
                    value={newResource.fileUrl}
                    onChange={(e) => setNewResource({ ...newResource, fileUrl: e.target.value, size: 'Cloud File' })}
                    style={{ width: '100%', padding: '10px' }}
                    required
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isUploading}
                className="btn btn-primary"
                style={{ width: '100%', padding: '14px', borderRadius: '12px', fontWeight: '700', fontSize: '0.92rem' }}
              >
                {isUploading ? 'Publishing File...' : '🚀 Publish Material to Academic Hub'}
              </button>
            </form>
          </div>

          {/* LIST OF PUBLISHED DOCUMENTS */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem' }}>📚 Documents Currently in Academic Hub</h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{publishedResources.length} total document(s)</span>
            </div>

            <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
              {publishedResources.length === 0 ? (
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '8px 0' }}>
                  No materials uploaded yet. Use the form above to add your first PDF.
                </p>
              ) : (
                publishedResources.map((doc) => (
                  <div key={doc._id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 0',
                    borderBottom: '1px solid var(--glass-border)',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                        <strong style={{ fontSize: '0.88rem' }}>{doc.subject}</strong>
                        <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(99,102,241,0.15)', color: '#818cf8', fontWeight: '700' }}>
                          {doc.dept} • {doc.year}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {doc.title} ({doc.size || 'PDF'})
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <a
                        href={doc.fileUrl}
                        download={doc.title}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                      >
                        Preview
                      </a>
                      <button
                        onClick={() => handleDeleteResource(doc._id)}
                        className="btn btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '0.75rem', color: '#ef4444' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}