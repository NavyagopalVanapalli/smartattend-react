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

const CAMPUS_EVENTS = [
  {
    id: 1,
    type: 'Placement Drive',
    title: 'TCS Digital & Ninja On-Campus Recruitment',
    date: 'Sep 18, 2026',
    venue: 'Main Auditorium & Assessment Labs',
    eligible: 'Final Year MCA / B.Tech (CSE, IT, ECE)',
    badgeColor: '#10b981',
    description: 'Aptitude followed by coding evaluation in Java/Python. Package ranges up to 7.5 LPA.'
  },
  {
    id: 2,
    type: 'Project Expo',
    title: 'InnovateX: Annual Technical Project Exhibition',
    date: 'Sep 25, 2026',
    venue: 'R&D Innovation Hall, Block B',
    eligible: 'Open to all years and branches',
    badgeColor: '#6366f1',
    description: 'Showcase working hardware or software prototypes. Cash prizes up to ₹25,000 for top 3 innovations.'
  },
  {
    id: 3,
    type: 'Hackathon',
    title: 'CodeSprint 24-Hour AI & IoT Hackathon',
    date: 'Oct 08, 2026',
    venue: 'Computer Center Lab 3',
    eligible: 'Teams of 2 to 4 members',
    badgeColor: '#f59e0b',
    description: 'Solve real-world problem statements submitted by industry partners within 24 hours.'
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
        explanation: 'Tuples are immutable sequences in Python; their elements cannot be changed after creation.'
      },
      {
        q: 'What is the output of bool([]) in Python?',
        options: ['True', 'False', 'None', 'TypeError'],
        correct: 1,
        explanation: 'Empty sequences or collections evaluate to False in a boolean context.'
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
        explanation: 'useEffect is specifically designed for side effects like data fetching and timers.'
      },
      {
        q: 'What is the type of NaN in standard JavaScript?',
        options: ['number', 'NaN', 'undefined', 'object'],
        correct: 0,
        explanation: 'In JavaScript, typeof NaN returns "number".'
      }
    ]
  },
  dbms: {
    name: 'Database Management Systems (DBMS)',
    questions: [
      {
        q: 'Which ACID property guarantees that a transaction is completely performed or rolled back entirely?',
        options: ['Atomicity', 'Consistency', 'Isolation', 'Durability'],
        correct: 0,
        explanation: 'Atomicity ensures all operations in a transaction execute or are reverted.'
      }
    ]
  }
};

export default function AcademicHub() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('resources');
  const [resources, setResources] = useState(INITIAL_RESOURCES);
  const [resourceSearch, setResourceSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');

  // Quiz States
  const [activeQuizCategory, setActiveQuizCategory] = useState('python');
  const [userAnswers, setUserAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  useEffect(() => {
    // 1. Resolve User Context (Linked Student Profile or Dedicated Hub Login)
    const linkedStudent = localStorage.getItem('student_profile');
    const directHubUser = localStorage.getItem('hub_user');

    if (linkedStudent) {
      const parsed = JSON.parse(linkedStudent);
      setCurrentUser({
        name: parsed.full_name,
        id: parsed.roll_no,
        dept: parsed.dept_code,
        year: parsed.year_level || '1st Year',
        role: 'Student'
      });
    } else if (directHubUser) {
      const parsed = JSON.parse(directHubUser);
      setCurrentUser({
        name: parsed.name,
        id: parsed.id,
        dept: parsed.dept,
        year: parsed.year || '',
        role: parsed.role === 'faculty' ? 'Faculty' : 'Student'
      });
    } else {
      navigate('/hub-login');
    }

    // 2. Fetch Live Uploaded PDFs from Faculty
    fetchResources();
  }, [navigate]);

  const fetchResources = async () => {
    try {
      const res = await axios.get('/api/resources');
      if (res.data && res.data.success && res.data.resources.length > 0) {
        setResources([...res.data.resources, ...INITIAL_RESOURCES]);
      }
    } catch (err) {
      console.error('Error fetching resources:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('hub_user');
    navigate('/hub-login');
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
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 16px', minHeight: '100vh' }}>
      
      {/* HEADER WITH USER PROFILE BANNER */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 24px',
        borderRadius: '16px',
        background: 'var(--card-bg)',
        border: '1px solid var(--glass-border)',
        boxShadow: 'var(--glass-shadow)',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.3rem',
            color: '#fff'
          }}>
            🏛️
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800' }}>Academic Hub</h2>
            {currentUser && (
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Welcome, <strong>{currentUser.name}</strong> ({currentUser.id}) • {currentUser.dept} {currentUser.year}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={() => navigate('/')} className="btn btn-secondary" style={{ fontSize: '0.84rem', padding: '8px 14px' }}>
            ← Attendance Portal
          </button>
          <button onClick={handleLogout} className="btn btn-secondary" style={{ fontSize: '0.84rem', padding: '8px 14px', color: '#ef4444' }}>
            Logout
          </button>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px', flexWrap: 'wrap' }}>
        {[
          { id: 'resources', label: '📚 Subject PDFs & Lab Manuals' },
          { id: 'events', label: '🎯 Expos, Drives & Fests' },
          { id: 'quizzes', label: '⚡ Technical Quizzes' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              fontSize: '0.88rem',
              fontWeight: '700',
              border: 'none',
              cursor: 'pointer',
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
          <div className="card" style={{ padding: '18px', marginBottom: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
              <input
                type="text"
                placeholder="🔍 Search by subject, topic or document title..."
                value={resourceSearch}
                onChange={(e) => setResourceSearch(e.target.value)}
                style={{ padding: '10px 14px' }}
              />

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)' }}>DEPT:</span>
                {['ALL', 'MCA', 'CSE', 'IT', 'ECE'].map((dept) => (
                  <button
                    key={dept}
                    onClick={() => setSelectedDept(dept)}
                    className={selectedDept === dept ? 'btn btn-primary' : 'btn btn-secondary'}
                    style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                  >
                    {dept}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {filteredResources.length === 0 ? (
              <div className="card" style={{ padding: '30px', textAlign: 'center', gridColumn: '1 / -1' }}>
                <p style={{ color: 'var(--text-muted)' }}>No resources found matching your search.</p>
              </div>
            ) : (
              filteredResources.map((item) => (
                <div key={item._id} className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#818cf8' }}>
                        {item.dept} • {item.year}
                      </span>
                      <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', fontWeight: '700' }}>
                        {item.docType}
                      </span>
                    </div>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem' }}>{item.subject}</h4>
                    <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                      {item.title}
                    </p>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--glass-border)', paddingTop: '12px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>📦 {item.size}</span>
                    <a
                      href={item.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary"
                      style={{ padding: '6px 14px', fontSize: '0.8rem', textDecoration: 'none' }}
                    >
                      📥 Download PDF
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: EVENTS */}
      {activeTab === 'events' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {CAMPUS_EVENTS.map((event) => (
            <div key={event.id} className="card" style={{ padding: '22px', borderLeft: `4px solid ${event.badgeColor}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: '800',
                  textTransform: 'uppercase',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: `${event.badgeColor}22`,
                  color: event.badgeColor
                }}>
                  {event.type}
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                  📅 {event.date}
                </span>
              </div>

              <h3 style={{ fontSize: '1.08rem', margin: '0 0 8px 0' }}>{event.title}</h3>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                {event.description}
              </p>

              <div style={{ fontSize: '0.78rem', marginBottom: '6px' }}>
                <strong>📍 Venue:</strong> {event.venue}
              </div>
              <div style={{ fontSize: '0.78rem', marginBottom: '16px', color: '#a855f7' }}>
                <strong>🎓 Eligibility:</strong> {event.eligible}
              </div>

              <button
                onClick={() => alert(`Registration confirmed for ${event.title}!`)}
                className="btn btn-primary"
                style={{ width: '100%', padding: '10px', fontSize: '0.85rem' }}
              >
                Register For Event →
              </button>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: QUIZZES */}
      {activeTab === 'quizzes' && (
        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '20px' }}>
          <div className="card" style={{ padding: '16px', height: 'fit-content' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem' }}>🎯 Choose Domain</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {Object.entries(QUIZ_BANKS).map(([key, item]) => (
                <button
                  key={key}
                  onClick={() => { setActiveQuizCategory(key); setUserAnswers({}); setQuizSubmitted(false); }}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    fontSize: '0.84rem',
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

          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem' }}>
                📝 {QUIZ_BANKS[activeQuizCategory].name} Quiz
              </h3>
              {quizSubmitted && (
                <span style={{
                  fontSize: '0.88rem',
                  fontWeight: '800',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#10b981',
                  border: '1px solid #10b981'
                }}>
                  Score: {calculateScore()} / {QUIZ_BANKS[activeQuizCategory].questions.length}
                </span>
              )}
            </div>

            {QUIZ_BANKS[activeQuizCategory].questions.map((qItem, qIdx) => (
              <div key={qIdx} style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--glass-border)' }}>
                <p style={{ fontWeight: '700', fontSize: '0.92rem', marginBottom: '12px' }}>
                  {qIdx + 1}. {qItem.q}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                          padding: '10px 14px',
                          borderRadius: '10px',
                          textAlign: 'left',
                          fontSize: '0.85rem',
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
                  <div style={{ marginTop: '10px', fontSize: '0.8rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)', padding: '10px', borderRadius: '8px' }}>
                    💡 <strong>Explanation:</strong> {qItem.explanation}
                  </div>
                )}
              </div>
            ))}

            <div style={{ display: 'flex', gap: '10px' }}>
              {!quizSubmitted ? (
                <button
                  onClick={() => setQuizSubmitted(true)}
                  disabled={Object.keys(userAnswers).length === 0}
                  className="btn btn-primary"
                  style={{ padding: '12px 24px', flex: 1 }}
                >
                  Submit & Check Answers
                </button>
              ) : (
                <button
                  onClick={() => { setUserAnswers({}); setQuizSubmitted(false); }}
                  className="btn btn-secondary"
                  style={{ padding: '12px 24px', flex: 1 }}
                >
                  Retake Quiz
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}