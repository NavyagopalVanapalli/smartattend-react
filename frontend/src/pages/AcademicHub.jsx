import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SUBJECT_RESOURCES = [
  {
    id: 1,
    subject: 'Database Management Systems (DBMS)',
    dept: 'MCA',
    year: '1st Year',
    docType: 'Lecture Notes',
    title: 'Relational Algebra & Normalization (1NF to BCNF)',
    fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    size: '2.4 MB'
  },
  {
    id: 2,
    subject: 'Full-Stack Web Development',
    dept: 'MCA',
    year: '1st Year',
    docType: 'Lab Manual',
    title: 'React.js, REST APIs & MongoDB Integration Guide',
    fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    size: '3.1 MB'
  },
  {
    id: 3,
    subject: 'Data Structures & Algorithms',
    dept: 'CSE',
    year: '2nd Year',
    docType: 'Syllabus & Notes',
    title: 'Trees, Graphs & Dynamic Programming Handbook',
    fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    size: '4.8 MB'
  },
  {
    id: 4,
    subject: 'Cloud Computing & DevOps',
    dept: 'IT',
    year: '3rd Year',
    docType: 'Cheat Sheet',
    title: 'AWS Core Services, Docker & CI/CD Pipelines',
    fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    size: '1.9 MB'
  }
];

const CAMPUS_EVENTS = [
  {
    id: 1,
    type: 'Placement Drive',
    title: 'TCS Digital & Ninja On-Campus Recruitment',
    date: 'Sep 18, 2026',
    venue: 'Main Auditorium & Online Assessment Labs',
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
  },
  {
    id: 4,
    type: 'College Festival',
    title: 'Vibrance 2026: Annual Techno-Cultural Fest',
    date: 'Oct 28 - 29, 2026',
    venue: 'Campus Open Air Theatre (OAT)',
    eligible: 'All Students & Faculty',
    badgeColor: '#ec4899',
    description: 'Two days of technical paper presentations, LAN gaming tournaments, music concerts, and art competitions.'
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
        explanation: 'useEffect is specifically designed for side effects like data fetching, subscriptions, and manual DOM manipulations.'
      },
      {
        q: 'What is the type of NaN in standard JavaScript?',
        options: ['number', 'NaN', 'undefined', 'object'],
        correct: 0,
        explanation: 'In JavaScript, typeof NaN returns "number" according to the IEEE 754 floating-point specification.'
      }
    ]
  },
  dbms: {
    name: 'Database Management Systems (DBMS)',
    questions: [
      {
        q: 'Which normal form ensures that every non-trivial functional dependency X -> Y has X as a super key?',
        options: ['1NF', '2NF', '3NF', 'BCNF'],
        correct: 3,
        explanation: 'Boyce-Codd Normal Form (BCNF) requires that for every functional dependency X -> Y, X must be a super key.'
      },
      {
        q: 'Which ACID property guarantees that a transaction is either completely performed or not performed at all?',
        options: ['Atomicity', 'Consistency', 'Isolation', 'Durability'],
        correct: 0,
        explanation: 'Atomicity ensures all operations in a transaction succeed together or are rolled back completely.'
      }
    ]
  },
  java: {
    name: 'Core Java & OOP',
    questions: [
      {
        q: 'Which keyword prevents a class from being subclassed in Java?',
        options: ['static', 'abstract', 'final', 'synchronized'],
        correct: 2,
        explanation: 'Declaring a class with the "final" modifier prevents any class from inheriting or extending it.'
      },
      {
        q: 'Where are objects allocated in JVM memory during runtime?',
        options: ['Stack Memory', 'Heap Memory', 'Method Area', 'Native Method Stack'],
        correct: 1,
        explanation: 'In Java, all objects and arrays are dynamically allocated inside the Heap area.'
      }
    ]
  }
};

export default function AcademicHub() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('resources'); // 'resources' | 'events' | 'quizzes'

  // Resource Filter State
  const [resourceSearch, setResourceSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');

  // Quiz Execution States
  const [activeQuizCategory, setActiveQuizCategory] = useState('python');
  const [userAnswers, setUserAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  // Filtered Subject Resources
  const filteredResources = SUBJECT_RESOURCES.filter((res) => {
    const matchesDept = selectedDept === 'ALL' || res.dept === selectedDept;
    const matchesQuery =
      res.subject.toLowerCase().includes(resourceSearch.toLowerCase()) ||
      res.title.toLowerCase().includes(resourceSearch.toLowerCase()) ||
      res.docType.toLowerCase().includes(resourceSearch.toLowerCase());
    return matchesDept && matchesQuery;
  });

  const handleSelectAnswer = (qIndex, optionIndex) => {
    if (quizSubmitted) return;
    setUserAnswers({ ...userAnswers, [qIndex]: optionIndex });
  };

  const calculateScore = () => {
    const questions = QUIZ_BANKS[activeQuizCategory].questions;
    let score = 0;
    questions.forEach((q, idx) => {
      if (userAnswers[idx] === q.correct) score += 1;
    });
    return score;
  };

  const handleResetQuiz = () => {
    setUserAnswers({});
    setQuizSubmitted(false);
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 16px', minHeight: '100vh' }}>
      
      {/* PORTAL HEADER */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 24px',
        borderRadius: '16px',
        background: 'var(--card-bg)',
        border: '1px solid var(--glass-border)',
        boxShadow: 'var(--glass-shadow)',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800', color: 'var(--primary)' }}>
            🏛️ Campus & Academic Hub
          </h2>
          <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
            Course materials, campus drives, technical expos & skill quizzes
          </span>
        </div>

        <button
          onClick={() => navigate('/')}
          className="btn btn-secondary"
          style={{ padding: '8px 16px', fontSize: '0.86rem' }}
        >
          ← Back to Student Attendance
        </button>
      </div>

      {/* NAVIGATION TABS */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px', flexWrap: 'wrap' }}>
        {[
          { id: 'resources', label: '📚 Subject PDFs & Notes' },
          { id: 'events', label: '🎯 Expos, Drives & Fests' },
          { id: 'quizzes', label: '⚡ Programming & Subject Quizzes' }
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
              color: activeTab === tab.id ? '#ffffff' : 'var(--text-muted)',
              transition: 'all 0.2s ease'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ==================== TAB 1: SUBJECT PDFS & NOTES ==================== */}
      {activeTab === 'resources' && (
        <div>
          <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
              <input
                type="text"
                placeholder="🔍 Search by subject, topic or document type..."
                value={resourceSearch}
                onChange={(e) => setResourceSearch(e.target.value)}
                style={{ padding: '10px 14px' }}
              />

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)' }}>DEPT:</span>
                {['ALL', 'MCA', 'CSE', 'IT'].map((dept) => (
                  <button
                    key={dept}
                    onClick={() => setSelectedDept(dept)}
                    className={selectedDept === dept ? 'btn btn-primary' : 'btn btn-secondary'}
                    style={{ padding: '6px 14px', fontSize: '0.78rem' }}
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
                <p style={{ color: 'var(--text-muted)' }}>No syllabus PDFs match your filters.</p>
              </div>
            ) : (
              filteredResources.map((item) => (
                <div key={item.id} className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
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

      {/* ==================== TAB 2: EXPOS, DRIVES & FESTS ==================== */}
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
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: '1.4' }}>
                {event.description}
              </p>

              <div style={{ fontSize: '0.78rem', marginBottom: '6px' }}>
                <strong>📍 Venue:</strong> {event.venue}
              </div>
              <div style={{ fontSize: '0.78rem', marginBottom: '16px', color: '#a855f7' }}>
                <strong>🎓 Eligibility:</strong> {event.eligible}
              </div>

              <button
                onClick={() => alert(`Registration confirmed for ${event.title}! Check your college email for schedule passes.`)}
                className="btn btn-primary"
                style={{ width: '100%', padding: '10px', fontSize: '0.85rem' }}
              >
                Register For Event →
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ==================== TAB 3: QUIZZES ==================== */}
      {activeTab === 'quizzes' && (
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '20px' }}>
          
          {/* Quiz Topics Selector */}
          <div className="card" style={{ padding: '16px', height: 'fit-content' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem' }}>🎯 Choose Domain</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {Object.entries(QUIZ_BANKS).map(([key, item]) => (
                <button
                  key={key}
                  onClick={() => {
                    setActiveQuizCategory(key);
                    handleResetQuiz();
                  }}
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

          {/* Question Viewer */}
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
                      } else if (isSelected && !isCorrect) {
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
                  onClick={handleResetQuiz}
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