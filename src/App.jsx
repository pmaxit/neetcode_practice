import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  CheckCircle,
  Circle,
  ExternalLink,
  BrainCircuit,
  Code2,
  MessageSquare,
  Calendar as CalendarIcon,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  BarChart3,
  Trophy,
  LayoutGrid,
  Lock,
  Filter,
  Menu,
  X
} from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import problemsData from './data/problems.json';
import './styles/Dashboard.css';

const App = () => {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDay, setSelectedDay] = useState(1);
  const [activeProblemId, setActiveProblemId] = useState(null);
  const [activeView, setActiveView] = useState('dashboard'); // 'dashboard' | 'calendar' | 'browse'
  const [isSolutionVisible, setIsSolutionVisible] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fetch all data from Backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/problems');
        const data = await res.json();
        
        if (Array.isArray(data)) {
          setProblems(data);
          setError(null);
          if (data.length > 0) {
            setActiveProblemId(data[0].id);
          }
        } else {
          setError(data.error || 'Failed to fetch problems');
          setProblems([]);
        }
      } catch (err) {
        console.error('Failed to load problems:', err);
        setError('Connection error: Make sure the local database is connected.');
        setProblems([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const newCountPerDay = 8;
  const totalDays = Math.ceil(problems.length / newCountPerDay);

  const getProblemsForDay = (day) => {
    const newProbs = problems.filter(p => p.day === day).map(p => ({ ...p, isRevision: false }));
    let revProbs = [];
    if (day > 1) {
      const prevProbs = problems.filter(p => p.day < day);
      const revSource = prevProbs.filter(p => p.difficulty !== 'Easy');
      const source = revSource.length >= 2 ? revSource : prevProbs;
      if (source.length > 0) {
        const p1 = source[(day * 7) % source.length];
        const p2 = source[(day * 13) % source.length];
        revProbs = [
          { ...p1, isRevision: true },
          { ...(p1.id === p2.id ? source[(day * 17) % source.length] : p2), isRevision: true }
        ];
      }
    }
    return [...newProbs, ...revProbs];
  };

  const dailyProblems = useMemo(() => getProblemsForDay(selectedDay), [selectedDay, problems]);

  const maxDay = useMemo(() => problems.reduce((max, p) => Math.max(max, p.day || 0), 0), [problems]);

  const dayPickerRef = useRef(null);
  useEffect(() => {
    if (dayPickerRef.current) {
      const selected = dayPickerRef.current.querySelector('.day-tile.selected');
      if (selected) selected.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [selectedDay]);

  const categories = useMemo(() => [...new Set(problems.map(p => p.category))].sort(), [problems]);

  const browsedProblems = useMemo(() => problems.filter(p => {
    if (filterCategory && p.category !== filterCategory) return false;
    if (filterDifficulty && p.difficulty !== filterDifficulty) return false;
    return true;
  }), [problems, filterCategory, filterDifficulty]);

  const activeProblem = useMemo(() => {
    const list = activeView === 'browse' ? browsedProblems : dailyProblems;
    return list.find(p => p.id === activeProblemId) || list[0];
  }, [activeProblemId, dailyProblems, browsedProblems, activeView]);

  const { prevProblem, nextProblem } = useMemo(() => {
    const list = activeView === 'browse' ? browsedProblems : dailyProblems;
    const idx = list.findIndex(p => p.id === activeProblemId);
    return {
      prevProblem: idx > 0 ? list[idx - 1] : null,
      nextProblem: idx >= 0 && idx < list.length - 1 ? list[idx + 1] : null,
    };
  }, [activeProblemId, dailyProblems, browsedProblems, activeView]);

  useEffect(() => {
    setIsSolutionVisible(false);
  }, [activeProblemId, activeView]);

  // Analytics
  const analytics = useMemo(() => {
    const stats = { Easy: 0, Medium: 0, Hard: 0, TotalDone: 0, Categories: {} };
    problems.forEach(p => {
      if (p.user_status === 'completed') {
        stats.TotalDone++;
        stats[p.difficulty]++;
        stats.Categories[p.category] = (stats.Categories[p.category] || 0) + 1;
      }
    });
    return stats;
  }, [problems]);

  // Local notes state — debounced save
  const [localNotes, setLocalNotes] = useState('');
  const notesDebounceRef = useRef(null);

  useEffect(() => {
    setLocalNotes(activeProblem?.user_notes || '');
  }, [activeProblemId]);

  const updateBackend = useCallback(async (problemId, status, code, notes) => {
    try {
      await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemId, status, code, notes })
      });
      setProblems(prev => prev.map(p =>
        p.id === problemId ? { ...p, user_status: status, user_code: code, user_notes: notes } : p
      ));
    } catch (err) {
      console.error('Update failed:', err);
    }
  }, []);

  const handleNotesChange = (value) => {
    setLocalNotes(value);
    if (notesDebounceRef.current) clearTimeout(notesDebounceRef.current);
    notesDebounceRef.current = setTimeout(() => {
      const p = activeProblem;
      if (p) updateBackend(p.id, p.user_status, p.user_code, value);
    }, 800);
  };

  const handleUpdateField = (field, value) => {
    const p = activeProblem;
    const update = {
      status: field === 'status' ? value : p.user_status,
      code: field === 'code' ? value : p.user_code,
      notes: p.user_notes
    };
    updateBackend(p.id, update.status, update.code, update.notes);
  };

  const toggleComplete = () => {
    const newStatus = activeProblem.user_status === 'completed' ? 'not-started' : 'completed';
    handleUpdateField('status', newStatus);
  };

  const getDayStatus = (day) => {
    const probs = getProblemsForDay(day);
    const completedCount = probs.filter(p => p.user_status === 'completed').length;
    if (completedCount === 0) return 'not-started';
    if (completedCount === probs.length) return 'completed';
    return 'in-progress';
  };

  const handleResetNotes = async () => {
    if (!activeProblemId) return;
    try {
      const res = await fetch('/api/problems');
      const allProblems = await res.json();
      setProblems(allProblems);
    } catch (err) {
      console.error('Failed to reset notes:', err);
    }
  };

  const closeSidebar = () => setSidebarOpen(false);

  const handleNavClick = (view) => {
    setActiveView(view);
    closeSidebar();
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Initializing practice session...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="loading-container">
        <div className="error-icon" style={{ color: 'var(--hard)', fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
        <h2 style={{ margin: '0 0 1rem' }}>Database Connection Failed</h2>
        <p style={{ color: 'var(--text-muted)', maxWidth: '400px', textAlign: 'center', lineHeight: '1.6' }}>
          {error}
          <br /><br />
          Please ensure the <strong>Cloud SQL Proxy</strong> is running and you have an active internet connection.
        </p>
        <button 
          className="btn btn-primary" 
          style={{ marginTop: '2rem' }}
          onClick={() => window.location.reload()}
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Mobile backdrop */}
      {sidebarOpen && <div className="sidebar-backdrop" onClick={closeSidebar} />}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo" onClick={() => handleNavClick('dashboard')}>
            <Sparkles size={24} />
            NeetPractice
          </div>
          <button className="sidebar-close-btn" onClick={closeSidebar}>
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <button className={`nav-item ${activeView === 'dashboard' ? 'active' : ''}`} onClick={() => handleNavClick('dashboard')}>
            <LayoutGrid size={18} /> Dashboard
          </button>
          <button className={`nav-item ${activeView === 'calendar' ? 'active' : ''}`} onClick={() => handleNavClick('calendar')}>
            <CalendarIcon size={18} /> Calendar View
          </button>
          <button className={`nav-item ${activeView === 'browse' ? 'active' : ''}`} onClick={() => handleNavClick('browse')}>
            <Filter size={18} /> Browse Problems
          </button>
          <div className="divider"></div>
        </nav>

        <div className="stats-mini">
          <div className="stat-row">
            <span>Overall Progress</span>
            <span>{analytics.TotalDone} / {problems.length}</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${(analytics.TotalDone / Math.max(1, problems.length)) * 100}%` }}></div>
          </div>
          <div className="difficulty-dots">
            <div className="dot-group"><span className="dot easy"></span> {analytics.Easy}</div>
            <div className="dot-group"><span className="dot medium"></span> {analytics.Medium}</div>
            <div className="dot-group"><span className="dot hard"></span> {analytics.Hard}</div>
          </div>
        </div>

        {activeView === 'dashboard' && (
          <div className="problem-list-container">
            <h3 className="section-title">DAY {selectedDay} TASKS</h3>
            <div className="problem-list">
              {dailyProblems.map(p => (
                <div
                  key={`${p.id}-${p.isRevision}`}
                  className={`problem-item ${activeProblemId === p.id ? 'active' : ''} ${p.user_status === 'completed' ? 'completed' : ''}`}
                  onClick={() => { setActiveProblemId(p.id); closeSidebar(); }}
                >
                  <div className="problem-title">
                    {p.isRevision && <span className="revision-tag">↺</span>}
                    {p.title}
                  </div>
                  <span className={`difficulty-badge ${p.difficulty.toLowerCase()}`}>
                    {p.difficulty[0]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeView === 'browse' && (
          <div className="problem-list-container">
            <div className="filter-controls">
              <select
                className="filter-select"
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
              >
                <option value="">All Topics</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select
                className="filter-select"
                value={filterDifficulty}
                onChange={e => setFilterDifficulty(e.target.value)}
              >
                <option value="">All Difficulties</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
            <div className="problem-count-label">{browsedProblems.length} problems</div>
            <div className="problem-list">
              {browsedProblems.map(p => (
                <div
                  key={p.id}
                  className={`problem-item ${activeProblemId === p.id ? 'active' : ''} ${p.user_status === 'completed' ? 'completed' : ''}`}
                  onClick={() => { setActiveProblemId(p.id); closeSidebar(); }}
                >
                  <div className="problem-title">{p.title}</div>
                  <span className={`difficulty-badge ${p.difficulty.toLowerCase()}`}>
                    {p.difficulty[0]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)}>
          <Menu size={20} />
        </button>

        {activeView === 'calendar' ? (
          <div className="calendar-view fade-in">
            <div className="view-header">
              <h1>Practice Calendar</h1>
              <p>Choose any day to practice. Colors indicate completion status.</p>
            </div>
            <div className="calendar-grid">
              {Array.from({ length: totalDays }, (_, i) => i + 1).map(day => {
                const status = getDayStatus(day);
                return (
                  <button
                    key={day}
                    className={`calendar-day ${status} ${selectedDay === day ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedDay(day);
                      setActiveView('dashboard');
                    }}
                  >
                    <span className="day-number">Day {day}</span>
                    <div className="day-progress-dots">
                      {getProblemsForDay(day).map(p => (
                        <div key={p.id} className={`p-dot ${p.user_status === 'completed' ? 'filled' : ''}`}></div>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : activeProblem ? (
          <div className="problem-view fade-in">

            {activeView === 'dashboard' && (
              <div className="day-picker">
                <div className="day-picker-header">
                  <button
                    className="day-nav-btn"
                    onClick={() => setSelectedDay(d => Math.max(1, d - 1))}
                    disabled={selectedDay === 1}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="day-picker-label">Day {selectedDay} <span className="day-picker-total">/ {maxDay}</span></span>
                  <button
                    className="day-nav-btn"
                    onClick={() => setSelectedDay(d => Math.min(maxDay, d + 1))}
                    disabled={selectedDay === maxDay}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
                <div className="day-picker-scroll" ref={dayPickerRef}>
                  {Array.from({ length: maxDay }, (_, i) => i + 1).map(day => {
                    const status = getDayStatus(day);
                    return (
                      <button
                        key={day}
                        className={`day-tile ${status} ${selectedDay === day ? 'selected' : ''}`}
                        onClick={() => setSelectedDay(day)}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="problem-header">
              <div className="problem-meta">
                <div className="breadcrumb">
                  <span>{activeProblem.category}</span>
                  <ChevronRight size={14} />
                  <span className={`difficulty-tag ${activeProblem.difficulty.toLowerCase()}`}>{activeProblem.difficulty}</span>
                </div>
                <h1>{activeProblem.title}</h1>
                <a href={activeProblem.neetcode_url} target="_blank" rel="noopener noreferrer" className="external-link">
                  Open in NeetCode.io <ExternalLink size={14} />
                </a>
              </div>
              <div className="action-bar">
                <div className="problem-nav">
                  <button
                    className="problem-nav-btn"
                    disabled={!prevProblem}
                    onClick={() => prevProblem && setActiveProblemId(prevProblem.id)}
                    title={prevProblem ? prevProblem.title : ''}
                  >
                    <ChevronLeft size={14} />
                    <span className="problem-nav-label">
                      {prevProblem ? prevProblem.title : 'First problem'}
                    </span>
                  </button>
                  <button
                    className="problem-nav-btn problem-nav-next"
                    disabled={!nextProblem}
                    onClick={() => nextProblem && setActiveProblemId(nextProblem.id)}
                    title={nextProblem ? nextProblem.title : ''}
                  >
                    <span className="problem-nav-label">
                      {nextProblem ? nextProblem.title : 'Last problem'}
                    </span>
                    <ChevronRight size={14} />
                  </button>
                </div>
                <button
                  className={`btn ${activeProblem.user_status === 'completed' ? 'btn-secondary' : 'btn-primary'}`}
                  onClick={toggleComplete}
                >
                  {activeProblem.user_status === 'completed' ? <CheckCircle size={18} /> : <Circle size={18} />}
                  {activeProblem.user_status === 'completed' ? 'Completed' : 'Mark as Done'}
                </button>
              </div>
            </div>

            <div className="problem-content-enriched glass">
              <div className="content-section">
                <h3>Problem Statement</h3>
                <div
                  className="problem-statement"
                  dangerouslySetInnerHTML={{ __html: activeProblem.statement && activeProblem.statement !== "" ? activeProblem.statement : '<div class="placeholder-statement">Problem statement details are being fetched... Please refer to NeetCode.io link above in the meantime.</div>' }}
                />
              </div>
            </div>

            <div className="solution-media-grid">
              {activeProblem.youtube_url && (
                <div className="video-section glass fade-in">
                  <h3><span className="yt-icon">▶</span> Solution Walkthrough</h3>
                  <div className="video-wrapper shadow-lg">
                    <iframe
                      src={`https://www.youtube.com/embed/${(() => {
                        try {
                          const url = new URL(activeProblem.youtube_url);
                          if (url.hostname === 'youtu.be') return url.pathname.slice(1);
                          return url.searchParams.get('v');
                        } catch (e) {
                          return activeProblem.youtube_url.split('/').pop().split('v=').pop();
                        }
                      })()}`}
                      title={`${activeProblem.title} - NeetCode Solution`}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}

              <div className="card code-container glass">
                <div className="solution-header">
                  <h3><Code2 size={16} /> Reference Solution</h3>
                  <button
                    className={`solution-toggle-btn ${isSolutionVisible ? 'active' : ''}`}
                    onClick={() => setIsSolutionVisible(!isSolutionVisible)}
                  >
                    {isSolutionVisible ? 'Hide Solution' : 'Show Solution'}
                  </button>
                </div>
                <div className={`editor-wrapper ${!isSolutionVisible ? 'code-hidden' : 'code-visible'}`}>
                  {isSolutionVisible ? (
                    <SyntaxHighlighter
                      language="python"
                      style={atomDark}
                      className="code-display"
                      customStyle={{ background: 'transparent', padding: '1rem' }}
                    >
                      {activeProblem.python_code || '# No solution available yet.'}
                    </SyntaxHighlighter>
                  ) : (
                    <div className="hidden-placeholder">
                      <Lock size={32} />
                      <p>Solution is hidden to encourage practice.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="sections-grid">
              <div className="card glass">
                <h3><BrainCircuit size={16} /> Mnemonics</h3>
                <p className="instruction-text">Core pattern to remember for this problem type.</p>
                <div className="mnemonic-display">
                  {activeProblem.mnemonic || 'No mnemonic available'}
                </div>
              </div>

              <div className="card glass">
                <h3><MessageSquare size={16} /> Practice Notes</h3>
                <textarea
                  placeholder="Notes on corner cases, time complexity, etc..."
                  value={localNotes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                />
                <button className="btn btn-secondary reset-button" onClick={handleResetNotes}>
                  Reset Notes
                </button>
              </div>
            </div>

            <div className="analytics-section">
              <h2 className="section-title"><BarChart3 size={20} /> Category Breakdown</h2>
              <div className="category-tags">
                {Object.entries(analytics.Categories).map(([cat, count]) => (
                  <div key={cat} className="cat-pill">
                    <span className="cat-name">{cat}</span>
                    <span className="cat-count">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <Trophy size={64} style={{ color: 'var(--accent)', opacity: 0.5 }} />
            <h2>Ready to level up?</h2>
            <p>Select a day from the calendar to view your daily challenges.</p>
            <button className="btn btn-primary" onClick={() => setActiveView('calendar')}>View Calendar</button>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
