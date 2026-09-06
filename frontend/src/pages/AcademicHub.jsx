import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const INITIAL_RESOURCES = [
  {
    _id: 'preset_1',
    subject: 'Database Management Systems (DBMS)',
    dept: 'MCA',
    year: '1st Year',
    docType: 'Lecture Notes',
    title: 'Relational Algebra & Normalization (1NF to BCNF)',
    fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    size: '2.4 MB'
  },
  {
    _id: 'preset_2',
    subject: 'Full-Stack Web Development',
    dept: 'MCA',
    year: '1st Year',
    docType: 'Lab Manual',
    title: 'React.js, REST APIs & MongoDB Integration Guide',
    fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    size: '3.1 MB'
  }
];

const PRESET_EVENTS = [
  {
    _id: 'preset_event_1',
    type: 'Placement Drive',
    title: 'TCS Digital & Ninja On-Campus Recruitment',
    date: 'Sep 18, 2026',
    venue: 'Main Auditorium & Assessment Labs',
    eligible: 'Final Year MCA / B.Tech (CSE, IT, ECE)',
    badgeColor: '#10b981',
    description: 'Aptitude followed by coding evaluation in Java/Python. Package ranges up to 7.5 LPA.'
  },
  {
    _id: 'preset_event_2',
    type: 'Project Expo',
    title: 'InnovateX: Annual Technical Project Exhibition',
    date: 'Sep 25, 2026',
    venue: 'R&D Innovation Hall, Block B',
    eligible: 'Open to all years and branches',
    badgeColor: '#6366f1',
    description: 'Showcase working hardware or software prototypes. Cash prizes up to ₹25,000 for top 3 innovations.'
  }
];

const QUIZ_BANKS = {
  python: {
    name: 'Python Programming',
    questions: [
      {
        q: 'Which data structure in Python is immutable by default?',
        options: ['List', 'Dictionary', 'Set', 'Tuple'],
        correct: 3,
        explanation: 'Tuples are immutable sequences in Python; their elements cannot be modified once defined.'
      },
      {
        q: 'What is the output of bool([]) in Python?',
        options: ['True', 'False', 'None', 'TypeError'],
        correct: 1,
        explanation: 'Empty collections and sequences evaluate to False in Python truth-value testing.'
      }
    ]
  },
  javascript: {
    name: 'JavaScript & React',
    questions: [
      {
        q: 'What hook is used to execute side effects in functional React components?',
        options: ['useState', 'useEffect', 'useMemo', 'useReducer'],
        correct: 1,
        explanation: 'useEffect handles component lifecycles, subscriptions, and external data mutations.'
      },
      {
        q: 'What is the type of NaN in standard JavaScript?',
        options: ['number', 'NaN', 'undefined', 'object'],
        correct: 0,
        explanation: 'Under the IEEE 754 floating-point standard, NaN is formally typed as a number.'
      }
    ]
  },
  dbms: {
    name: 'Database Management Systems (DBMS)',
    questions: [
      {
        q: 'Which ACID property guarantees that a transaction executes completely or not at all?',
        options: ['Atomicity', 'Consistency', 'Isolation', 'Durability'],
        correct: 0,
        explanation: 'Atomicity enforces all-or-nothing execution for database transactions.'
      }
    ]
  }
};

export default function AcademicHub() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('resources'); // 'resources' | 'events' | 'quizzes'
  const [resources, setResources] = useState(INITIAL_RESOURCES);
  const [events, setEvents] = useState(PRESET_EVENTS);
  const [resourceSearch, setResourceSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');

  // Event Registration Form Modal States
  const [registeringEvent, setRegisteringEvent] = useState(null);
  const [demoRegForm, setDemoRegForm] = useState({
    studentName: '',
    rollNo: '',
    dept: 'MCA',
    year: '1st Year',
    email: '',
    phone: '',
    teamName: ''
  });
  const [regSuccessMessage, setRegSuccessMessage] = useState(null);

  // Quiz States
  const [activeQuizCategory, setActiveQuizCategory] = useState('python');
  const [userAnswers, setUserAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  useEffect(() => {
    // 1. Resolve User Identity across all login pathways
    const activeAdmin = localStorage.getItem('isAdminLoggedIn') === "true";
    const teacherSession = JSON.parse(localStorage.getItem("activeTeacher") || localStorage.getItem("teacher_session") || "{}");
    const hubUser = JSON.parse(localStorage.getItem('hub_user') || "{}");
    const linkedStudent = JSON.parse(localStorage.getItem('student_profile') || "{}");

    if (activeAdmin) {
      setCurrentUser({
        name: 'Administrator',
        id: 'ADMIN01',
        dept: 'Admin Bureau',
        year: 'HQ',
        role: 'Admin'
      });
    } else if (teacherSession.teacher_id) {
      setCurrentUser({
        name: teacherSession.full_name,
        id: teacherSession.teacher_id,
        dept: teacherSession.dept_code || 'MCA',
        year: 'Faculty',
        role: 'Faculty'
      });
    } else if (hubUser.name) {
      setCurrentUser({
        name: hubUser.name,
        id: hubUser.id,
        dept: hubUser.dept,
        year: hubUser.year || (hubUser.role === 'faculty' ? 'Faculty' : '1st Year'),
        role: hubUser.role === 'faculty' ? 'Faculty' : 'Student'
      });
    } else if (linkedStudent.full_name) {
      setCurrentUser({
        name: linkedStudent.full_name,
        id: linkedStudent.roll_no,
        dept: linkedStudent.dept_code,
        year: linkedStudent.year_level || '1st Year',
        role: 'Student'
      });
      // Pre-fill demo form with known student info
      setDemoRegForm(prev => ({
        ...prev,
        studentName: linkedStudent.full_name,
        rollNo: linkedStudent.roll_no,
        dept: linkedStudent.dept_code || 'MCA'
      }));
    } else {
      navigate('/hub-login');
    }

    fetchResources();
    fetchLiveEvents();
  }, [navigate]);

  const fetchResources = async () => {
    try {
      const res = await axios.get('/api/resources');
      if (res.data && res.data.success && res.data.resources.length > 0) {
        setResources([...res.data.resources, ...INITIAL_RESOURCES]);
      }
    } catch (err) {
      console.error('Error loading resources:', err);
    }
  };

  const fetchLiveEvents = async () => {
    try {
      const res = await axios.get('/api/events');
      if (res.data && res.data.success && res.data.events.length > 0) {
        setEvents([...res.data.events, ...PRESET_EVENTS]);
      }
    } catch (err) {
      console.error('Error loading events:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('hub_user');
    localStorage.removeItem('teacher_session');
    localStorage.removeItem('activeTeacher');
    navigate('/hub-login');
  };

  const handleDownloadFile = (fileUrl, title) => {
    try {
      if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
        const link = document.createElement('a');
        link.href = fileUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.download = `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      if (fileUrl.startsWith('data:')) {
        const arr = fileUrl.split(',');
        const mimeMatch = arr[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const blobUrl = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
        return;
      }

      window.open(fileUrl, '_blank');
    } catch (err) {
      console.error('Download error:', err);
      window.open(fileUrl, '_blank');
    }
  };

  const handleOpenDemoModal = (event) => {
    setRegisteringEvent(event);
    setRegSuccessMessage(null);
    if (currentUser && currentUser.role === 'Student') {
      setDemoRegForm(prev => ({
        ...prev,
        studentName: currentUser.name,
        rollNo: currentUser.id,
        dept: currentUser.dept
      }));
    }
  };

  const handleSubmitDemoRegistration = (e) => {
    e.preventDefault();
    setRegSuccessMessage(`🎉 Demo Registration Confirmed for ${demoRegForm.studentName} (${demoRegForm.rollNo}) in "${registeringEvent.title}"! Pass sent to ${demoRegForm.email || 'student email'}.`);
    setTimeout(() => {
      setRegisteringEvent(null);
      setRegSuccessMessage(null);
    }, 2800);
  };

  const filteredResources = resources.filter((res) => {
    const matchesDept = selectedDept === 'ALL' || res.dept === selectedDept;
    const matchesQuery =
      res.subject.toLowerCase().includes(resourceSearch.toLowerCase()) ||
      res.title.toLowerCase().includes(resourceSearch.toLowerCase()) ||
      res.docType.toLowerCase().includes(resourceSearch.toLowerCase());
    return matchesDept && matchesQuery;
  });

  const handleSelectAnswer = (qIdx, optIdx) => {
    if (quizSubmitted) return;
    setUserAnswers({ ...userAnswers, [qIdx]: optIdx });
  };

  const calculateScore = () => {
    const questions = QUIZ_BANKS[activeQuizCategory].questions;
    let score = 0;
    questions.forEach((q, idx) => {
      if (userAnswers[idx] === q.correct) score += 1;
    });
    return score;
  };

  return (
    <div style={{ width: '100%', maxWidth: '1120px', margin: '0 auto', padding: '16px 12px', minHeight: '100vh', boxSizing: 'border-box' }}>
      
      {/* USER PROFILE HEADER BANNER */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '220px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: currentUser?.role === 'Admin'
              ? 'linear-gradient(135deg, #ec4899, #8b5cf6)'
              : currentUser?.role === 'Faculty'
              ? 'linear-gradient(135deg, #10b981, #059669)'
              : 'linear-gradient(135deg, #6366f1, #4f46e5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.25rem',
            color: '#fff'
          }}>
            {currentUser?.role === 'Admin' ? '🛡️' : currentUser?.role === 'Faculty' ? '👨‍🏫' : '🎓'}
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 'clamp(1.2rem, 3.5vw, 1.4rem)', fontWeight: '800' }}>Academic Hub</h2>
            {currentUser && (
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Logged in as <strong>{currentUser.name}</strong> ({currentUser.id}) • {currentUser.dept} [{currentUser.role}]
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => navigate(-1)} className="btn btn-secondary" style={{ fontSize: '0.82rem', padding: '8px 14px' }}>
            ← Back
          </button>
          <button onClick={handleLogout} className="btn btn-secondary" style={{ fontSize: '0.82rem', padding: '8px 14px', color: '#ef4444' }}>
            Logout
          </button>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px', overflowX: 'auto' }}>
        {[
          { id: 'resources', label: '📚 Subject PDFs' },
          { id: 'events', label: '🎯 Expos & Drives' },
          { id: 'quizzes', label: '⚡ Technical Quizzes' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              fontSize: '0.84rem',
              fontWeight: '700',
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              background: activeTab === tab.id ? 'var(--primary)' : 'transparent',
              color: activeTab === tab.id ? '#ffffff' : 'var(--text-muted)'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: RESOURCES */}
      {activeTab === 'resources' && (
        <div>
          <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
              <input
                type="text"
                placeholder="🔍 Search subject or topic..."
                value={resourceSearch}
                onChange={(e) => setResourceSearch(e.target.value)}
                style={{ padding: '8px 12px', fontSize: '0.86rem' }}
              />

              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', overflowX: 'auto' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--text-muted)' }}>DEPT:</span>
                {['ALL', 'MCA', 'CSE', 'IT', 'ECE'].map((dept) => (
                  <button
                    key={dept}
                    onClick={() => setSelectedDept(dept)}
                    className={selectedDept === dept ? 'btn btn-primary' : 'btn btn-secondary'}
                    style={{ padding: '5px 10px', fontSize: '0.75rem', borderRadius: '6px' }}
                  >
                    {dept}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            {filteredResources.length === 0 ? (
              <div className="card" style={{ padding: '24px', textAlign: 'center', gridColumn: '1 / -1' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No syllabus PDFs match your filters.</p>
              </div>
            ) : (
              filteredResources.map((item) => (
                <div key={item._id} className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '4px' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#818cf8' }}>
                        {item.dept} • {item.year}
                      </span>
                      <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', fontWeight: '700' }}>
                        {item.docType}
                      </span>
                    </div>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '0.96rem', wordBreak: 'break-word' }}>{item.subject}</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '14px', wordBreak: 'break-word' }}>
                      {item.title}
                    </p>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--glass-border)', paddingTop: '10px' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>📦 {item.size}</span>
                    <button
                      type="button"
                      onClick={() => handleDownloadFile(item.fileUrl, item.title)}
                      className="btn btn-primary"
                      style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                    >
                      📥 Download
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: LIVE EVENTS & EXPOS */}
      {activeTab === 'events' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
          {events.map((event) => (
            <div key={event._id || event.id} className="card" style={{ padding: '18px', borderLeft: `4px solid ${event.badgeColor || '#6366f1'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: '800',
                  textTransform: 'uppercase',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: `${event.badgeColor || '#6366f1'}22`,
                  color: event.badgeColor || '#6366f1'
                }}>
                  {event.type}
                </span>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                  📅 {event.date}
                </span>
              </div>

              <h3 style={{ fontSize: '1rem', margin: '0 0 6px 0', wordBreak: 'break-word' }}>{event.title}</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: '1.4' }}>
                {event.description}
              </p>

              <div style={{ fontSize: '0.76rem', marginBottom: '4px' }}>
                <strong>📍 Venue:</strong> {event.venue}
              </div>
              <div style={{ fontSize: '0.76rem', marginBottom: '14px', color: '#a855f7' }}>
                <strong>🎓 Eligibility:</strong> {event.eligible}
              </div>

              <button
                onClick={() => handleOpenDemoModal(event)}
                className="btn btn-primary"
                style={{ width: '100%', padding: '9px', fontSize: '0.82rem' }}
              >
                Register For Event →
              </button>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: QUIZZES */}
      {activeTab === 'quizzes' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
          <div className="card" style={{ padding: '14px', height: 'fit-content' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '0.88rem' }}>🎯 Choose Domain</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {Object.entries(QUIZ_BANKS).map(([key, item]) => (
                <button
                  key={key}
                  onClick={() => { setActiveQuizCategory(key); setUserAnswers({}); setQuizSubmitted(false); }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    border: '1px solid var(--glass-border)',
                    background: activeQuizCategory === key ? 'var(--primary)' : 'transparent',
                    color: activeQuizCategory === key ? '#ffffff' : 'var(--text-main)',
                    fontWeight: activeQuizCategory === key ? '700' : '500'
                  }}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
                📝 {QUIZ_BANKS[activeQuizCategory].name}
              </h3>
              {quizSubmitted && (
                <span style={{
                  fontSize: '0.82rem',
                  fontWeight: '800',
                  padding: '3px 10px',
                  borderRadius: '16px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#10b981',
                  border: '1px solid #10b981'
                }}>
                  Score: {calculateScore()} / {QUIZ_BANKS[activeQuizCategory].questions.length}
                </span>
              )}
            </div>

            {QUIZ_BANKS[activeQuizCategory].questions.map((qItem, qIdx) => (
              <div key={qIdx} style={{ marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid var(--glass-border)' }}>
                <p style={{ fontWeight: '700', fontSize: '0.88rem', marginBottom: '10px' }}>
                  {qIdx + 1}. {qItem.q}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {qItem.options.map((opt, optIdx) => {
                    const isSelected = userAnswers[qIdx] === optIdx;
                    const isCorrect = optIdx === qItem.correct;
                    let bgColor = 'var(--card-bg)';
                    let borderColor = 'var(--glass-border)';

                    if (quizSubmitted) {
                      if (isCorrect) {
                        bgColor = 'rgba(16, 185, 129, 0.2)';
                        borderColor = '#10b981';
                      } else if (isSelected) {
                        bgColor = 'rgba(239, 68, 68, 0.2)';
                        borderColor = '#ef4444';
                      }
                    } else if (isSelected) {
                      bgColor = 'var(--primary-light)';
                      borderColor = 'var(--primary)';
                    }

                    return (
                      <button
                        key={optIdx}
                        onClick={() => handleSelectAnswer(qIdx, optIdx)}
                        disabled={quizSubmitted}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          textAlign: 'left',
                          fontSize: '0.82rem',
                          background: bgColor,
                          border: `1px solid ${borderColor}`,
                          color: 'var(--text-main)',
                          cursor: quizSubmitted ? 'default' : 'pointer'
                        }}
                      >
                        {String.fromCharCode(65 + optIdx)}. {opt}
                      </button>
                    );
                  })}
                </div>

                {quizSubmitted && (
                  <div style={{ marginTop: '8px', fontSize: '0.78rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)', padding: '8px', borderRadius: '6px' }}>
                    💡 <strong>Explanation:</strong> {qItem.explanation}
                  </div>
                )}
              </div>
            ))}

            <div style={{ display: 'flex', gap: '8px' }}>
              {!quizSubmitted ? (
                <button
                  onClick={() => setQuizSubmitted(true)}
                  disabled={Object.keys(userAnswers).length === 0}
                  className="btn btn-primary"
                  style={{ padding: '10px 18px', flex: 1, fontSize: '0.84rem' }}
                >
                  Submit & Check
                </button>
              ) : (
                <button
                  onClick={() => { setUserAnswers({}); setQuizSubmitted(false); }}
                  className="btn btn-secondary"
                  style={{ padding: '10px 18px', flex: 1, fontSize: '0.84rem' }}
                >
                  Retake Quiz
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DEMO EVENT REGISTRATION MODAL FORM */}
      {registeringEvent && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '440px', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem' }}>📝 Event Registration</h3>
              <button onClick={() => setRegisteringEvent(null)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>

            <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.25)', marginBottom: '16px' }}>
              <strong style={{ fontSize: '0.88rem', color: 'var(--primary)' }}>{registeringEvent.title}</strong>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                📅 {registeringEvent.date} • 📍 {registeringEvent.venue}
              </div>
            </div>

            {regSuccessMessage ? (
              <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981', color: '#10b981', fontWeight: '700', fontSize: '0.88rem', textAlign: 'center' }}>
                {regSuccessMessage}
              </div>
            ) : (
              <form onSubmit={handleSubmitDemoRegistration}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Student Name</label>
                    <input
                      type="text"
                      placeholder="e.g. John Doe"
                      value={demoRegForm.studentName}
                      onChange={e => setDemoRegForm({ ...demoRegForm, studentName: e.target.value })}
                      style={{ width: '100%', padding: '9px' }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Roll Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 2585351122"
                      value={demoRegForm.rollNo}
                      onChange={e => setDemoRegForm({ ...demoRegForm, rollNo: e.target.value.toUpperCase() })}
                      style={{ width: '100%', padding: '9px' }}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Department</label>
                    <select
                      value={demoRegForm.dept}
                      onChange={e => setDemoRegForm({ ...demoRegForm, dept: e.target.value })}
                      style={{ width: '100%', padding: '9px' }}
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
                      value={demoRegForm.year}
                      onChange={e => setDemoRegForm({ ...demoRegForm, year: e.target.value })}
                      style={{ width: '100%', padding: '9px' }}
                    >
                      <option value="1st Year">1st Year</option>
                      <option value="2nd Year">2nd Year</option>
                      <option value="3rd Year">3rd Year</option>
                      <option value="4th Year">4th Year</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>College Email Address</label>
                  <input
                    type="email"
                    placeholder="student@college.edu"
                    value={demoRegForm.email}
                    onChange={e => setDemoRegForm({ ...demoRegForm, email: e.target.value })}
                    style={{ width: '100%', padding: '9px' }}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>WhatsApp Number</label>
                    <input
                      type="tel"
                      placeholder="9876543210"
                      maxLength="10"
                      value={demoRegForm.phone}
                      onChange={e => setDemoRegForm({ ...demoRegForm, phone: e.target.value })}
                      style={{ width: '100%', padding: '9px' }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Team / Project Name</label>
                    <input
                      type="text"
                      placeholder="Optional (Team AI)"
                      value={demoRegForm.teamName}
                      onChange={e => setDemoRegForm({ ...demoRegForm, teamName: e.target.value })}
                      style={{ width: '100%', padding: '9px' }}
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', fontWeight: '700' }}>
                  Submit Demo Registration →
                </button>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}