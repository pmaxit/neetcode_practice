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
  Clock,
  Menu,
  X,
  Info,
  ListChecks,
  Zap,
  Database,
  Cpu,
  Layers,
  Search
} from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import problemsData from './data/problems.json';
import './styles/Dashboard.css';

// Code Editor Imports
import Editor from 'react-simple-code-editor';
import prism from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/themes/prism-tomorrow.css';

const PythonEditor = ({ code, onChange, placeholder, className = "" }) => {
  return (
    <div className={`python-editor-wrapper ${className}`}>
      <Editor
        value={code || ""}
        onValueChange={onChange}
        highlight={code => prism.highlight(code || "", prism.languages.python, 'python')}
        padding={20}
        placeholder={placeholder}
        style={{
          fontFamily: '"JetBrains Mono", "Fira Code", monospace',
          fontSize: 14,
          minHeight: '400px',
        }}
      />
    </div>
  );
};

const SolutionToggle = ({ mode, onModeChange }) => (
  <div className="solution-toggle-container glass">
    <button 
      className={`toggle-btn ${mode === 'reference' ? 'active' : ''}`}
      onClick={() => onModeChange('reference')}
    >
      <Sparkles size={16} /> Reference
    </button>
    <button 
      className={`toggle-btn ${mode === 'practice' ? 'active' : ''}`}
      onClick={() => onModeChange('practice')}
    >
      <Lock size={16} /> Practice
    </button>
    <button 
      className={`toggle-btn ${mode === 'edit' ? 'active' : ''}`}
      onClick={() => onModeChange('edit')}
    >
      <Code2 size={16} /> Edit
    </button>
  </div>
);

const App = () => {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDay, setSelectedDay] = useState(1);
  const [activeProblemId, setActiveProblemId] = useState(null);
  const [activeView, setActiveView] = useState('dashboard'); // 'dashboard' | 'calendar' | 'browse'
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [navigationContext, setNavigationContext] = useState('dashboard'); // 'dashboard' | 'browse'

  // Code panel tab state
  const [codeTab, setCodeTab] = useState('edit'); // 'reference' | 'practice' | 'edit'
  const [localUserCode, setLocalUserCode] = useState('');
  const [agentResponse, setAgentResponse] = useState(null);
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentError, setAgentError] = useState(null);
  const [codeCopied, setCodeCopied] = useState(false);

  // System Design state
  const [sdProblems, setSdProblems] = useState([]);
  const [sdToday, setSdToday] = useState(null);
  const [mlToday, setMlToday] = useState(null);
  const [mlNotes, setMlNotes] = useState([]);
  const [mlCategoryFilter, setMlCategoryFilter] = useState('');
  const [activeSdId, setActiveSdId] = useState(null);
  const [activeMlNoteId, setActiveMlNoteId] = useState(null);
  const [sdLoading, setSdLoading] = useState(false);
  const [interfaceMode, setInterfaceMode] = useState('practice'); // 'reference' | 'practice' | 'edit'
  const [userCode, setUserCode] = useState('');
  const [practiceCode, setPracticeCode] = useState('');

  // --- Refs ---
  const dayPickerRef = useRef(null);
  const notesDebounceRef = useRef(null);
  const [localNotes, setLocalNotes] = useState('');

  // --- Static Helpers ---
  const getDateForDay = (dayIndex) => {
    const date = new Date();
    date.setDate(date.getDate() + dayIndex); 
    return date;
  };

  const generatePracticeScaffold = (code, hints) => {
    if (!code) return '# No solution available yet.';
    
    // If hints already looks like a Python scaffold (contains code structure), use it directly
    if (hints && (hints.includes('class Solution') || hints.includes('def '))) {
      return hints;
    }

    const lines = code.split('\n');
    let scaffold = [];
    let foundMainFunction = false;
    let signaturePending = false;

    for (let line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('import ') || trimmed.startsWith('from ') || 
          trimmed.startsWith('class ') || trimmed.startsWith('def ')) {
        scaffold.push(line);
        if (trimmed.startsWith('def ')) foundMainFunction = true;
        if (!trimmed.endsWith(':')) signaturePending = true;
        continue;
      }
      if (signaturePending) {
        scaffold.push(line);
        if (trimmed.endsWith(':')) signaturePending = false;
        continue;
      }
      if (foundMainFunction && !signaturePending) {
        scaffold.push('');
        if (hints) {
          const hintLines = hints.split('\n').map(h => `    # ${h.trim()}`);
          scaffold.push('    # GUIDED HINTS:');
          scaffold.push(...hintLines);
        }
        scaffold.push('');
        scaffold.push('    # TODO: Implement your logic here');
        scaffold.push('    pass');
        break;
      } else if (!foundMainFunction) {
        scaffold.push(line);
      }
    }
    return scaffold.join('\n');
  };

  // --- Derived State & Memos ---
  const activeProblem = useMemo(() => {
    return problems.find(p => p.id === activeProblemId) || problems[0];
  }, [activeProblemId, problems]);

  const maxDay = useMemo(() => problems.reduce((max, p) => Math.max(max, p.day || 0), 0), [problems]);

  const categories = useMemo(() => [...new Set(problems.map(p => p.category))].sort(), [problems]);

  const browsedProblems = useMemo(() => problems.filter(p => {
    if (filterCategory && p.category !== filterCategory) return false;
    if (filterDifficulty && p.difficulty !== filterDifficulty) return false;
    return true;
  }), [problems, filterCategory, filterDifficulty]);

  const getProblemsForDay = useCallback((day) => {
    const newProbs = problems.filter(p => p.day === day).map(p => ({ ...p, isRevision: false }));
    let revProbs = [];
    if (day > 1) {
      const prevProbs = problems.filter(p => p.day < day);
      const revSource = prevProbs.filter(p => p.difficulty !== 'Easy');
      
      if (revSource.length > 0) {
        const selectedIndices = new Set();
        const primes = [31, 37, 41];
        for (let i = 0; i < 3 && selectedIndices.size < revSource.length; i++) {
          let idx = (day * primes[i]) % revSource.length;
          while (selectedIndices.has(idx)) {
            idx = (idx + 1) % revSource.length;
          }
          selectedIndices.add(idx);
        }
        revProbs = Array.from(selectedIndices).map(idx => ({ ...revSource[idx], isRevision: true }));
      }
    }
    return [...newProbs, ...revProbs];
  }, [problems]);

  const dailyProblems = useMemo(() => getProblemsForDay(selectedDay), [selectedDay, getProblemsForDay]);

  const { prevProblem, nextProblem } = useMemo(() => {
    const list = navigationContext === 'browse' ? browsedProblems : dailyProblems;
    const idx = list.findIndex(p => p.id === activeProblemId);
    
    let prev = idx > 0 ? list[idx - 1] : null;
    let next = idx >= 0 && idx < list.length - 1 ? list[idx + 1] : null;

    if (activeView === 'dashboard' && !prev && selectedDay > 1) {
      const prevDayPool = getProblemsForDay(selectedDay - 1);
      prev = prevDayPool[prevDayPool.length - 1];
    }
    if (activeView === 'dashboard' && !next && selectedDay < maxDay) {
      const nextDayPool = getProblemsForDay(selectedDay + 1);
      next = nextDayPool[0];
    }

    return { prevProblem: prev, nextProblem: next };
  }, [activeProblemId, dailyProblems, browsedProblems, navigationContext, activeView, selectedDay, maxDay, getProblemsForDay]);

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

  const formatDateShort = (dayIndex) => {
    const date = getDateForDay(dayIndex);
    const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date);
    const dayNumeric = date.getDate();
    return `${weekday}, ${dayNumeric}`;
  };

  const formatDateFull = (dayIndex) => {
    const date = getDateForDay(dayIndex);
    return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(date);
  };

  const newCountPerDay = 6;
  const totalDays = Math.ceil(problems.length / newCountPerDay);

  // --- Action Handlers ---

  const updateBackend = useCallback(async (problemId, status, code, notes) => {
    try {
      await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemId, status, code, notes }),
      });
      setProblems(prev => prev.map(p => p.id === problemId ? { ...p, user_status: status, user_code: code, user_notes: notes } : p));
    } catch (err) {
      console.error('Failed to update backend:', err);
    }
  }, []);

  const handleAgentReview = async () => {
    if (!activeProblem) return;
    const currentCode = interfaceMode === 'practice' ? practiceCode : userCode;
    
    if (!currentCode || currentCode.length < 10) {
      setAgentError('Please write some code before asking for a review.');
      return;
    }

    try {
      setAgentLoading(true);
      setAgentError(null);
      setAgentResponse(null);

      const res = await fetch('/api/agent/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemTitle: activeProblem.title,
          description: activeProblem.description,
          userCode: currentCode,
          hints: activeProblem.guided_hints,
          difficulty: activeProblem.difficulty,
          category: activeProblem.category
        })
      });

      const data = await res.json();
      if (res.ok) {
        setAgentResponse(data.feedback);
      } else {
        setAgentError(data.error || 'Failed to get feedback');
      }
    } catch (err) {
      setAgentError('An error occurred. Please try again.');
    } finally {
      setAgentLoading(false);
    }
  };

  const applySuggestion = () => {
    if (!agentResponse) return;
    const codeMatch = agentResponse.match(/```(?:python)?\n([\s\S]*?)```/);
    if (codeMatch && codeMatch[1]) {
      if (window.confirm('Apply the suggested code to your editor? This will overwrite your current draft.')) {
        if (interfaceMode === 'practice') {
          setPracticeCode(codeMatch[1].trim());
        } else {
          setUserCode(codeMatch[1].trim());
        }
        setAgentResponse(null);
      }
    } else {
      alert('No clear code block found in the suggestion to automatically apply.');
    }
  };

  const navigateToProblem = useCallback((problem, context = null) => {
    if (!problem) return;
    setActiveProblemId(problem.id);
    if (context) setNavigationContext(context);
    else if (activeView === 'dashboard' || activeView === 'browse') {
      setNavigationContext(activeView);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeView]);

  const resetCode = () => {
    if (window.confirm('Reset your progress to the initial scaffold? This will overwrite your current draft.')) {
      setUserCode(practiceCode || '');
    }
  };

  const handleCopyToDraft = () => {
    if (window.confirm('Copy this scaffold to your drafting area? This will overwrite your current draft.')) {
      setUserCode(practiceCode);
      setInterfaceMode('edit');
    }
  };

  const navigateToSystemDesign = (problemId) => {
    setActiveSdId(problemId);
    setActiveView('system-design');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

  const toggleComplete = async () => {
    if (!activeProblem) return;
    const newStatus = activeProblem.user_status === 'completed' ? 'not_started' : 'completed';
    try {
      await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemId: activeProblem.id,
          status: newStatus,
          code: activeProblem.user_code,
          notes: activeProblem.user_notes
        })
      });
      setProblems(problems.map(p => p.id === activeProblem.id ? { ...p, user_status: newStatus } : p));
    } catch (err) {
      console.error('Error updating progress:', err);
    }
  };

  const toggleSdComplete = async () => {
    const currentProblem = sdProblems.find(p => p.id === activeSdId) || sdToday;
    if (!currentProblem) return;
    
    const newStatus = currentProblem.status === 'completed' ? 'not_started' : 'completed';
    try {
      await fetch('/api/system-design/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem_id: currentProblem.id, status: newStatus })
      });
      setSdProblems(sdProblems.map(p => p.id === currentProblem.id ? { ...p, status: newStatus } : p));
      if (sdToday?.id === currentProblem.id) {
        setSdToday({ ...sdToday, status: newStatus });
      }
    } catch (err) {
      console.error('Error updating SD progress:', err);
    }
  };

  const getDayStatus = (day) => {
    const probs = getProblemsForDay(day).filter(p => !p.isRevision);
    if (probs.length === 0) return 'not-started';
    const completedCount = probs.filter(p => p.user_status === 'completed').length;
    if (completedCount === 0) return 'not-started';
    if (completedCount === probs.length) return 'completed';
    return 'in-progress';
  };

  const handleResetNotes = async () => {
    if (!activeProblemId) return;
    if (window.confirm('Reset your notes for this problem?')) {
      try {
        setLocalNotes('');
        await updateBackend(activeProblemId, activeProblem.user_status, userCode, '');
      } catch (err) {
        console.error('Failed to reset notes:', err);
      }
    }
  };

  const closeSidebar = () => setSidebarOpen(false);

  const handleNavClick = (view) => {
    setActiveView(view);
    if (view === 'dashboard' || view === 'browse') {
      setNavigationContext(view);
    }
    closeSidebar();
  };

  // --- Effects ---

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [pRes, sdRes, mlRes, allMlRes] = await Promise.all([
          fetch('/api/problems'),
          fetch('/api/system-design/today'),
          fetch('/api/ml-design/today'),
          fetch('/api/ml-design')
        ]);
        
        const pData = await pRes.json();
        setProblems(pData);
        if (pData.length > 0 && !activeProblemId) {
          setActiveProblemId(pData[0].id);
        }

        if (sdRes.ok) setSdToday(await sdRes.json());
        if (mlRes.ok) {
          const mlData = await mlRes.json();
          setMlToday(mlData);
          if (!activeMlNoteId) setActiveMlNoteId(mlData.id);
        }
        if (allMlRes.ok) setMlNotes(await allMlRes.json());
        
        setError(null);
      } catch (err) {
        setError('Connection error: Make sure the local database is connected.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!activeProblem) return;
    if (activeProblemId) {
      setUserCode(activeProblem.user_code || '');
      setPracticeCode(generatePracticeScaffold(activeProblem.python_code, activeProblem.guided_hints));
      setInterfaceMode('practice');
      setAgentResponse(null);
      setAgentError(null);
      setLocalNotes(activeProblem.user_notes || '');
    }
  }, [activeProblemId, activeProblem]);

  useEffect(() => {
    if (!activeProblem) return;
    const timer = setTimeout(async () => {
      if (userCode !== activeProblem.user_code) {
        updateBackend(activeProblem.id, activeProblem.user_status, userCode, localNotes);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [userCode, activeProblemId, activeProblem, updateBackend, localNotes]);

  useEffect(() => {
    if (dayPickerRef.current) {
      const selected = dayPickerRef.current.querySelector('.day-tile.selected');
      if (selected) selected.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [selectedDay]);

  useEffect(() => {
    const container = document.querySelector('.active-problem-view');
    if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeProblemId, activeView]);

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
          <button className={`nav-item ${activeView === 'system-design' ? 'active' : ''}`} onClick={() => handleNavClick('system-design')}>
            <BrainCircuit size={18} /> System Design
          </button>
          <button className={`nav-item ${activeView === 'machine-learning' ? 'active' : ''}`} onClick={() => handleNavClick('machine-learning')}>
            <Cpu size={18} /> ML Library
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
            <h1 className="day-title">{formatDateFull(selectedDay)}</h1>
            <div className="problem-list">
              {dailyProblems.map(p => (
                <div
                  key={`${p.id}-${p.isRevision}`}
                  className={`problem-item ${activeProblemId === p.id ? 'active' : ''} ${p.user_status === 'completed' ? 'completed' : ''}`}
                  onClick={() => navigateToProblem(p, 'dashboard')}
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
            <div className="specialized-library-links">
              <div className="lib-link glass" onClick={() => setActiveView('system-design')}>
                <BrainCircuit size={16} /> <span>System Design</span> <ChevronRight size={14} />
              </div>
              <div className="lib-link glass" onClick={() => { setActiveView('machine-learning'); setActiveMlNoteId(null); }}>
                <Cpu size={16} /> <span>ML Library</span> <ChevronRight size={14} />
              </div>
            </div>
            
            <div className="category-quick-filters">
              <span className="qf-label">EXPERT DOMAINS:</span>
              <button className="qf-pill" onClick={() => { setActiveView('machine-learning'); setMlCategoryFilter('NLP'); setActiveMlNoteId(null); }}>NLP</button>
              <button className="qf-pill" onClick={() => { setActiveView('machine-learning'); setMlCategoryFilter('Recommender Systems'); setActiveMlNoteId(null); }}>Recommender Systems</button>
              <button className="qf-pill" onClick={() => { setActiveView('machine-learning'); setMlCategoryFilter('ML Infrastructure'); setActiveMlNoteId(null); }}>ML Infra</button>
            </div>

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
                  onClick={() => navigateToProblem(p, 'browse')}
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

        {activeView === 'system-design' && (
          <div className="problem-list-container">
            <div className="problem-count-label">{sdProblems.length} breakdowns</div>
            <div className="problem-list">
              {sdProblems.map(p => (
                <div
                  key={p.id}
                  className={`problem-item ${activeSdId === p.id ? 'active' : ''} ${p.status === 'completed' ? 'completed' : ''}`}
                  onClick={() => navigateToSystemDesign(p.id)}
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
        {activeView === 'machine-learning' && (
          <div className="problem-list-container">
            <div className="library-header-flex">
              <h1 className="day-title">ML Design Library</h1>
              {mlCategoryFilter && (
                <button className="clear-filter-btn" onClick={() => setMlCategoryFilter('')}>
                  <X size={14} /> Clear: {mlCategoryFilter}
                </button>
              )}
            </div>
            <div className="problem-list">
              {['NLP', 'Recommender Systems', 'ML Infrastructure', 'General'].filter(cat => !mlCategoryFilter || cat === mlCategoryFilter).map(cat => (
                <div key={cat} className="category-group">
                  <div className="category-label">{cat}</div>
                  {mlNotes.filter(n => (n.category || 'General') === cat || (cat === 'General' && !n.category)).map(n => (
                    <div
                      key={n.id}
                      className={`problem-item ${activeMlNoteId === n.id ? 'active' : ''}`}
                      onClick={() => setActiveMlNoteId(n.id)}
                    >
                      <div className="problem-title">{n.title}</div>
                    </div>
                  ))}
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
                  <div className="day-tile-content">
                    <span className="day-label">{formatDateShort(day)}</span>
                  </div>
                    <div className="day-progress-dots">
                      {getProblemsForDay(day).filter(p => !p.isRevision).map(p => (
                        <div key={p.id} className={`p-dot ${p.user_status === 'completed' ? 'filled' : ''}`}></div>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : activeView === 'system-design' ? (
          <SystemDesignDetail 
            problem={sdProblems.find(p => p.id === activeSdId) || sdToday} 
            onToggleComplete={toggleSdComplete}
          />
        ) : activeView === 'machine-learning' ? (
          <div className="ml-library-view-enhanced fade-in">
            {mlNotes.find(n => n.id === activeMlNoteId) ? (
              <div className="ml-detail-view-container">
                <div className="problem-header ml-header-special">
                  <div className="problem-meta">
                    <div className="breadcrumb">
                      <span>Machine Learning</span>
                      <ChevronRight size={14} />
                      <span className="difficulty-tag expert">Staff Engineer Insight</span>
                    </div>
                    <h1>{mlNotes.find(n => n.id === activeMlNoteId).title}</h1>
                    <div className="ml-category-badge">{mlNotes.find(n => n.id === activeMlNoteId).category || 'GENERAL'}</div>
                  </div>
                </div>

                <div className="ml-technical-grid">
                  <div className="ml-card-main glass">
                    <div className="ml-section-label"><Clock size={16} /> HISTORY & CONTEXT</div>
                    <div className="ml-section-body">{mlNotes.find(n => n.id === activeMlNoteId).history}</div>
                  </div>
                  
                  <div className="ml-card-main glass">
                    <div className="ml-section-label"><Zap size={16} /> CORE EXAMPLE</div>
                    <div className="ml-section-body">{mlNotes.find(n => n.id === activeMlNoteId).example}</div>
                  </div>

                  <div className="ml-card-main glass">
                    <div className="ml-section-label"><ExternalLink size={16} /> REAL-WORLD USAGE</div>
                    <div className="ml-section-body">{mlNotes.find(n => n.id === activeMlNoteId).where_it_is_used}</div>
                  </div>
                </div>

                <div className="ml-deep-dive-block glass-inset shadow-xl">
                  <div className="deep-dive-header-ribbon">
                    <Sparkles size={18} /> TECHNICAL DEEP DIVE
                  </div>
                  <div className="deep-dive-inner-content">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {mlNotes.find(n => n.id === activeMlNoteId).technical_deep_dive}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <Cpu size={64} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                <h3>ML Library</h3>
                <p>Select a technical note from the sidebar to begin deep diving.</p>
              </div>
            )}
          </div>
        ) : activeProblem ? (
          <div className="problem-view fade-in">

            {navigationContext === 'dashboard' && (
              <div className="day-picker">
                <div className="day-picker-header">
                  <button
                    className="day-nav-btn"
                    onClick={() => setSelectedDay(d => Math.max(1, d - 1))}
                    disabled={selectedDay === 1}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="day-picker-label">{formatDateShort(selectedDay)} <span className="day-picker-total">({selectedDay} of {maxDay})</span></span>
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
                        {formatDateShort(day)}
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
              <div className="action-bar-wrapper">
                <div className="problem-nav-horizontal">
                  <button
                    className="nav-link-tile prev"
                    disabled={!prevProblem}
                    onClick={() => navigateToProblem(prevProblem)}
                  >
                    <div className="nav-tile-icon"><ChevronLeft size={20} /></div>
                    <div className="nav-tile-content">
                      <span className="nav-tile-label">Previous</span>
                      <span className="nav-tile-title">
                        {prevProblem ? (
                          <>
                            {navigationContext === 'dashboard' && prevProblem.day !== selectedDay && (
                              <span className="nav-day-tag">{formatDateShort(prevProblem.day)}</span>
                            )}
                            {prevProblem.title}
                          </>
                        ) : 'Beginning'}
                      </span>
                    </div>
                  </button>

                  <button
                    className="nav-link-tile next"
                    disabled={!nextProblem}
                    onClick={() => navigateToProblem(nextProblem)}
                  >
                    <div className="nav-tile-content">
                      <span className="nav-tile-label">Next Up</span>
                      <span className="nav-tile-title">
                        {nextProblem ? (
                          <>
                            {navigationContext === 'dashboard' && nextProblem.day !== selectedDay && (
                              <span className="nav-day-tag">{formatDateShort(nextProblem.day)}</span>
                            )}
                            {nextProblem.title}
                          </>
                        ) : 'All Caught Up!'}
                      </span>
                    </div>
                    <div className="nav-tile-icon"><ChevronRight size={20} /></div>
                  </button>
                </div>
                
                <SolutionToggle mode={interfaceMode} onModeChange={setInterfaceMode} />

                <button
                  className={`btn status-btn ${activeProblem.user_status === 'completed' ? 'btn-secondary' : 'btn-primary'}`}
                  onClick={toggleComplete}
                >
                  {activeProblem.user_status === 'completed' ? <CheckCircle size={18} /> : <Circle size={18} />}
                  {activeProblem.user_status === 'completed' ? 'Completed' : 'Mark as Done'}
                </button>
              </div>
            </div>

            <div className="problem-content-layout">
              <div className="problem-content-enriched glass">
                <div className="content-section">
                  <h3>Problem Statement</h3>
                  <div
                    className="problem-statement"
                    dangerouslySetInnerHTML={{ __html: activeProblem.statement && activeProblem.statement !== "" ? activeProblem.statement : '<div class="placeholder-statement">Problem statement details are being fetched... Please refer to NeetCode.io link above in the meantime.</div>' }}
                  />
                </div>
              </div>

              {true && (
                <div className="problem-interface-enriched glass fade-in">
                  <div className="content-section">
                    <div className="interface-header">
                      <h3>
                        {interfaceMode === 'edit' ? 'Draft Your Solution' : 
                         interfaceMode === 'practice' ? 'Practice' : 'Reference Solution'}
                      </h3>
                      <div className="interface-actions">
                        {(interfaceMode === 'practice' || interfaceMode === 'edit') && (
                          <button 
                            className={`btn coach-btn ${agentLoading ? 'loading' : ''}`}
                            onClick={handleAgentReview}
                            disabled={agentLoading}
                          >
                            <BrainCircuit size={16} /> 
                            {agentLoading ? 'Reviewing...' : 'Review with AI Coach'}
                          </button>
                        )}
                        {interfaceMode === 'edit' && (
                          <button 
                            className="btn reset-btn"
                            onClick={resetCode}
                            title="Reset to Scaffold"
                          >
                            <X size={14} /> Reset
                          </button>
                        )}
                        {interfaceMode === 'edit' && <span className="auto-save-tag">Auto-saving...</span>}
                      </div>
                    </div>
                    {interfaceMode === 'practice' ? (
                      <div className="code-editor-container practice-mode">
                        <PythonEditor
                          code={practiceCode}
                          onChange={setPracticeCode}
                          placeholder="# Guided implementation..."
                        />
                      </div>
                    ) : interfaceMode === 'reference' ? (
                      <div className="solution-container">
                        <SyntaxHighlighter
                          language="python"
                          style={atomDark}
                          customStyle={{
                            borderRadius: '12px',
                            padding: '1.5rem',
                            fontSize: '0.9rem',
                            margin: 0,
                            background: 'rgba(0,0,0,0.3)'
                          }}
                        >
                          {activeProblem.python_code || '# No solution available yet.'}
                        </SyntaxHighlighter>
                      </div>
                    ) : (
                      <div className="code-editor-container">
                        <PythonEditor
                          code={userCode}
                          onChange={setUserCode}
                          placeholder="# Start typing your solution here..."
                        />
                      </div>
                    )}

                    {interfaceMode === 'edit' && activeProblem.guided_hints && (
                      <div className="guided-hints-section glass-inset">
                        <div className="hints-header">
                          <Zap size={14} /> GUIDED APPROACH HINTS
                        </div>
                        <pre className="hints-content">
                          {activeProblem.guided_hints}
                        </pre>
                      </div>
                    )}

                    {(agentResponse || agentError) && (
                      <div className={`agent-feedback-panel glass ${agentError ? 'error' : ''} fade-in`}>
                         <div className="feedback-header">
                           <div className="feedback-title">
                             <Sparkles size={16} /> COACHING FEEDBACK
                           </div>
                           <div className="feedback-actions">
                             {!agentError && agentResponse && agentResponse.includes('```') && (
                               <button 
                                 className="btn apply-suggestion-btn"
                                 onClick={applySuggestion}
                                 title="Apply code block from suggestion"
                               >
                                 <Check size={14} /> Apply Code
                               </button>
                             )}
                             <button className="close-feedback" onClick={() => setAgentResponse(null)}>×</button>
                           </div>
                         </div>
                        <div className="feedback-content markdown-body">
                          {agentError ? (
                            <div className="agent-error-msg">{agentError}</div>
                          ) : (
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {agentResponse}
                            </ReactMarkdown>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {activeView === 'dashboard' && (sdToday || mlToday) && (
              <div className="dashboard-cards-row">
                {sdToday && (
                  <div className="sd-today-card glass fade-in" onClick={() => navigateToSystemDesign(sdToday.id)}>
                    <div className="sd-card-header">
                      <div className="sd-card-tag">SYSTEM DESIGN OF THE DAY</div>
                      <div className="sd-card-status">
                        {sdToday.status === 'completed' ? <CheckCircle size={16} className="completed" /> : <Clock size={16} />}
                      </div>
                    </div>
                    <div className="sd-card-body">
                      <h3>{sdToday.title}</h3>
                      <p>Learn how to design {sdToday.title.toLowerCase()} from scratch.</p>
                    </div>
                    <div className="sd-card-footer">
                      <span className={`difficulty-tag ${sdToday.difficulty.toLowerCase()}`}>{sdToday.difficulty}</span>
                      <span className="learn-more">Read Breakdown <ChevronRight size={14} /></span>
                    </div>
                  </div>
                )}

                {mlToday && (
                  <div className="ml-today-card glass fade-in">
                    <div className="ml-card-header">
                      <div className="ml-card-tag"><Zap size={14} strokeWidth={3} /> ML SYSTEM DESIGN NOTE</div>
                      <div className="ml-card-badge">STAFF ENGINEER INSIGHTS</div>
                    </div>
                    <div className="ml-card-body">
                      <div className="ml-title-row">
                        <h3>{mlToday.title}</h3>
                        <div className="ml-browse-link" onClick={() => setActiveView('machine-learning')}>
                          Browse Library <ChevronRight size={14} />
                        </div>
                      </div>

                      <div className="expert-domain-filters">
                        <button className="qf-pill" onClick={() => { setActiveView('machine-learning'); setMlCategoryFilter('NLP'); setActiveMlNoteId(null); }}>NLP</button>
                        <button className="qf-pill" onClick={() => { setActiveView('machine-learning'); setMlCategoryFilter('Recommender Systems'); setActiveMlNoteId(null); }}>RecSys</button>
                        <button className="qf-pill" onClick={() => { setActiveView('machine-learning'); setMlCategoryFilter('ML Infrastructure'); setActiveMlNoteId(null); }}>ML Infra</button>
                      </div>
                      
                      <div className="ml-insight-grid">
                        <div className="ml-insight-item">
                          <div className="ml-insight-label">HISTORY & MOTIVATION</div>
                          <div className="ml-insight-text">{mlToday.history}</div>
                        </div>
                        <div className="ml-insight-item">
                          <div className="ml-insight-label">CORE EXAMPLE</div>
                          <div className="ml-insight-text">{mlToday.example}</div>
                        </div>
                        <div className="ml-insight-item">
                          <div className="ml-insight-label">WHERE IT IS USED</div>
                          <div className="ml-insight-text">{mlToday.where_it_is_used}</div>
                        </div>
                      </div>

                      <div className="ml-deep-dive">
                        <div className="ml-deep-dive-header">
                          <BrainCircuit size={16} /> TECHNICAL DEEP DIVE
                        </div>
                        <div className="ml-deep-dive-content">
                          {mlToday.technical_deep_dive}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

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

              <div className="card glass mnemonic-card fade-in">
                <div className="card-header-with-actions">
                  <h3><BrainCircuit size={16} /> Mnemonics & Notes</h3>
                  <button className="btn-text-small" onClick={handleResetNotes}>
                    Reset
                  </button>
                </div>
                <p className="instruction-text">Core pattern and your personal practice notes.</p>
                
                <div className="mnemonic-display">
                  {activeProblem.mnemonic || 'No mnemonic pattern available.'}
                </div>

                <textarea
                  className="mnemonic-notes"
                  placeholder="Notes on corner cases, time complexity, or personal tips..."
                  value={localNotes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                />
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

// Helper: Parse System Design Markdown into logical sections
const parseSystemDesignContent = (markdown) => {
  if (!markdown) return {};
  
  // Aggressive Noise Stripping: Truncate at common Hello Interview footer markers
  let cleanMarkdown = markdown;
  const footerMarkers = [
    "What is Expected at Each Level",
    "Unlock this article",
    "Schedule a mock interview",
    "Buy Premium",
    "Meet with a FAANG senior+",
    "Learn System Design Learn DSA"
  ];
  
  for (const marker of footerMarkers) {
    const index = cleanMarkdown.indexOf(marker);
    if (index !== -1) {
      // Find the start of the current paragraph/section or just truncate here
      cleanMarkdown = cleanMarkdown.substring(0, index).trim();
    }
  }

  const sections = {
    overview: [],
    functional: [],
    nonFunctional: [],
    entities: [],
    api: [],
    hld: [],
    deepDives: [],
  };

  const lines = cleanMarkdown.split('\n');
  let currentKey = 'overview';
  
  const matchers = [
    { pattern: /Functional Requirements/i, key: 'functional' },
    { pattern: /Non-Functional Requirements/i, key: 'nonFunctional' },
    { pattern: /Core Entities/i, key: 'entities' },
    { pattern: /API or System Interface/i, key: 'api' },
    { pattern: /High-Level Design/i, key: 'hld' },
    { pattern: /Potential Deep Dives/i, key: 'deepDives' }
  ];

  for (const line of lines) {
    let matched = false;
    const trimmedLine = line.trim();
    
    // Check if line is a header (### or [Link Header]) or contains a key pattern
    if (trimmedLine.startsWith('###') || trimmedLine.startsWith('[') || trimmedLine.match(/Requirements/i)) {
      for (const matcher of matchers) {
        if (trimmedLine.match(matcher.pattern)) {
          currentKey = matcher.key;
          matched = true;
          break;
        }
      }
    }
    
    if (!matched) {
      sections[currentKey].push(line);
    }
  }

  Object.keys(sections).forEach(key => {
    sections[key] = sections[key].join('\n').trim();
  });

  return sections;
};

// Sub-component: Requirement Card (Styled for Theme Parity)
const RequirementCard = ({ title, content, type }) => (
  <div className={`req-card ${type}`}>
    <div className="req-card-header">
      {type === 'functional' ? <Zap size={16} /> : <Info size={16} />}
      <h3>{title}</h3>
    </div>
    <div className="req-card-body">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  </div>
);

// Sub-component: Section Header (Aligned with ProblemView content-section h3)
const SectionHeader = ({ icon: Icon, title, id }) => (
  <div className="section-divider-clean" id={id}>
    <Icon size={18} />
    <h3>{title}</h3>
  </div>
);

const SystemDesignDetail = ({ problem, onToggleComplete }) => {
  if (!problem) return (
    <div className="loading-container">
      <div className="loader"></div>
      <p>Loading breakdown...</p>
    </div>
  );

  const parsed = parseSystemDesignContent(problem.content);

  return (
    <div className="problem-view sd-view-harmonized fade-in">
      <div className="problem-header">
        <div className="problem-meta">
          <div className="breadcrumb">
            <span>System Design</span>
            <ChevronRight size={14} />
            <span className={`difficulty-tag ${problem.difficulty.toLowerCase()}`}>{problem.difficulty}</span>
          </div>
          <h1>{problem.title}</h1>
          <div className="external-link">Hello Interview Breakdown</div>
        </div>
        <div className="action-bar-wrapper">
          <button
            className={`btn status-btn ${problem.status === 'completed' ? 'btn-secondary' : 'btn-primary'}`}
            onClick={onToggleComplete}
          >
            {problem.status === 'completed' ? <CheckCircle size={18} /> : <Circle size={18} />}
            {problem.status === 'completed' ? 'Completed' : 'Mark as Started'}
          </button>
        </div>
      </div>

      <div className="problem-content-enriched glass">
        {/* Overview (No Header) */}
        {parsed.overview && (
          <div className="content-section no-border-top">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{parsed.overview}</ReactMarkdown>
          </div>
        )}

        {/* Requirements */}
        {(parsed.functional || parsed.nonFunctional) && (
          <div className="content-section">
            <SectionHeader icon={ListChecks} title="Requirements" id="reqs" />
            <div className="req-grid-harmonized">
              {parsed.functional && (
                <RequirementCard title="Functional" content={parsed.functional} type="functional" />
              )}
              {parsed.nonFunctional && (
                <RequirementCard title="Non-Functional" content={parsed.nonFunctional} type="non-functional" />
              )}
            </div>
          </div>
        )}

        {/* Technical Specs */}
        {(parsed.entities || parsed.api) && (
          <div className="content-section">
            <SectionHeader icon={Database} title="Entities & API" id="tech" />
            <div className="tech-specs-flex">
              {parsed.entities && (
                <div className="tech-block">
                  <span className="tech-label">Core Entities</span>
                  <ReactMarkdown>{parsed.entities}</ReactMarkdown>
                </div>
              )}
              {parsed.api && (
                <div className="tech-block">
                  <span className="tech-label">Interface</span>
                  <ReactMarkdown>{parsed.api}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        )}

        {/* High-Level Design */}
        {parsed.hld && (
          <div className="content-section">
            <SectionHeader icon={Cpu} title="High-Level Design" id="hld" />
            <div className="markdown-content">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{parsed.hld}</ReactMarkdown>
            </div>
          </div>
        )}

        {/* Deep Dives */}
        {parsed.deepDives && (
          <div className="content-section">
            <SectionHeader icon={Search} title="Expert Deep Dives" id="deep-dives" />
            <div className="markdown-content">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{parsed.deepDives}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
// Trigger commit for GitHub Actions
// Verifying automated deployment after IAM fix
