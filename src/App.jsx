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
  Search,
  Settings as SettingsIcon,
  Check,
  RotateCcw,
  Cpu,
  Layers,
  Code,
  Tv,
  Brain,
  ShieldCheck,
  Trash2,
  Star,
  LogOut,
  FolderOpen,
  Plus
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
          minHeight: '800px',
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

// --- Profile Components ---

const StatsSummary = ({ summary }) => {
  if (!summary) return null;
  return (
    <div className="stats-grid fade-in">
      <div className="stat-tile glass">
        <div className="stat-icon"><Trophy size={24} /></div>
        <div className="stat-info">
          <span className="stat-value text-glow">{summary.totalSolved}</span>
          <span className="stat-label">Problems Solved</span>
        </div>
      </div>
      <div className="stat-tile glass">
        <div className="stat-icon"><CheckCircle size={24} /></div>
        <div className="stat-info">
          <span className="stat-value text-glow">{summary.percentage}%</span>
          <span className="stat-label">Success Rate</span>
        </div>
      </div>
      <div className="stat-tile glass">
        <div className="stat-icon"><Zap size={24} /></div>
        <div className="stat-info">
          <span className="stat-value text-glow">{summary.totalProblems}</span>
          <span className="stat-label">Total in Plan</span>
        </div>
      </div>
    </div>
  );
};

const SVGProgressChart = ({ dailyData }) => {
  if (!dailyData) return <div className="loading-container glass"><div className="loader"></div></div>;

  const entries = Object.entries(dailyData);
  if (entries.length === 0) return <div className="glass" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No activity tracked yet. Start solving to see your progress!</div>;

  const last14 = entries.slice(-14);
  const maxVal = Math.max(...last14.map(([_, d]) => d.attempts + d.completed), 5);
  
  const width = 800;
  const height = 300;
  const padding = 40;
  const barWidth = (width - padding * 2) / last14.length - 10;

  return (
    <div className="chart-card glass fade-in">
      <div className="chart-header">
        <h3>Activity (Last 14 Days)</h3>
        <div className="difficulty-dots">
          <div className="dot-group"><div className="dot" style={{ background: 'var(--medium)', opacity: 0.6 }}></div> Attempts</div>
          <div className="dot-group"><div className="dot" style={{ background: 'var(--easy)' }}></div> Solved</div>
        </div>
      </div>
      <div className="chart-container">
        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
          {[0, 0.25, 0.5, 0.75, 1].map(p => (
            <line 
              key={p}
              x1={padding} y1={height - padding - (height - padding * 2) * p}
              x2={width - padding} y2={height - padding - (height - padding * 2) * p}
              stroke="var(--border)" strokeWidth="1" strokeDasharray="4"
            />
          ))}

          {last14.map(([date, data], i) => {
            const x = padding + i * (barWidth + 10);
            const totalH = ((data.attempts + data.completed) / maxVal) * (height - padding * 2);
            const successH = (data.completed / maxVal) * (height - padding * 2);
            const attemptH = (data.attempts / maxVal) * (height - padding * 2);
            
            return (
              <g key={date} className="chart-bar-group">
                <rect 
                  x={x} y={height - padding - totalH}
                  width={barWidth} height={attemptH}
                  fill="var(--medium)" opacity="0.3" rx="4"
                />
                <rect 
                  x={x} y={height - padding - successH}
                  width={barWidth} height={successH}
                  fill="var(--easy)" rx="4"
                />
                <text x={x + barWidth/2} y={height - padding + 20} fontSize="10" fill="var(--text-muted)" textAnchor="middle">
                  {date.split('-').slice(1).join('/')}
                </text>
                <title>{`${date}: ${data.completed} Solved, ${data.attempts} Attempts`}</title>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

const StudySettings = ({ settings, onUpdate }) => {
  const [localDays, setLocalDays] = useState(settings.planned_days);
  const [localRev, setLocalRev] = useState(settings.revisions_per_day);

  useEffect(() => {
    setLocalDays(settings.planned_days);
    setLocalRev(settings.revisions_per_day);
  }, [settings]);

  const handleApply = () => {
    onUpdate({ planned_days: localDays, revisions_per_day: localRev });
  };

  return (
    <div className="settings-panel glass fade-in">
      <div className="chart-header">
        <h3>Study Configuration</h3>
        <SettingsIcon size={18} className="text-muted" />
      </div>
      
      <div className="settings-group">
        <div className="range-input-wrapper">
          <div className="range-header">
            <span>Duration Scope</span>
            <span className="range-value">{localDays} Days</span>
          </div>
          <input 
            type="range" min="10" max="150" step="1"
            value={localDays}
            onChange={(e) => setLocalDays(parseInt(e.target.value))}
          />
          <p className="settings-hint">Spread 150 problems over {localDays} days ({Math.ceil(150/localDays)} per day).</p>
        </div>
      </div>

      <div className="settings-group">
        <div className="range-input-wrapper">
          <div className="range-header">
            <span>Daily Revisions</span>
            <span className="range-value">{localRev} Questions</span>
          </div>
          <input 
            type="range" min="0" max="10" step="1"
            value={localRev}
            onChange={(e) => setLocalRev(parseInt(e.target.value))}
          />
          <p className="settings-hint">Previous problems to revisit daily for spaced repetition.</p>
        </div>
      </div>

      <button 
        className="btn btn-primary" 
        style={{ width: '100%', marginTop: '1rem' }}
        onClick={handleApply}
        disabled={localDays === settings.planned_days && localRev === settings.revisions_per_day}
      >
        Update Schedule
      </button>
    </div>
  );
};

// ── Auth Utilities ─────────────────────────────────────────────────────────────

function apiFetch(url, options = {}, token, sessionId) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (sessionId) headers['X-Session-Id'] = String(sessionId);
  return fetch(url, { ...options, headers });
}

// ── Login / Register View ──────────────────────────────────────────────────────

const LoginView = ({ onSuccess, error: externalError }) => {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState(null);

  const displayError = localError || externalError;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setLocalError(null);
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });
      const data = await res.json();
      if (res.ok) {
        onSuccess(data.token, data.user, mode === 'register');
      } else {
        setLocalError(data.error || 'Something went wrong');
      }
    } catch {
      setLocalError('Connection error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="loading-container">
      <div className="glass" style={{ padding: '2.5rem', minWidth: '360px', maxWidth: '420px', width: '100%', borderRadius: '16px' }}>
        <div className="logo" style={{ justifyContent: 'center', marginBottom: '1.8rem', fontSize: '1.2rem' }}>
          <Sparkles size={26} /> NeetPractice
        </div>
        <h2 style={{ margin: '0 0 1.5rem', textAlign: 'center', fontSize: '1.1rem', fontWeight: 600 }}>
          {mode === 'login' ? 'Sign In' : 'Create Account'}
        </h2>
        {displayError && (
          <div style={{ color: 'var(--hard)', marginBottom: '1rem', textAlign: 'center', fontSize: '0.85rem', padding: '0.5rem', background: 'rgba(239,68,68,0.1)', borderRadius: '8px' }}>
            {displayError}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-muted)', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
              EMAIL
            </label>
            <input
              type="email" required value={email} autoComplete="email"
              onChange={e => setEmail(e.target.value)}
              style={{ width: '100%', background: 'var(--surface, rgba(30,41,59,0.8))', border: '1px solid var(--border)', color: 'var(--text)', padding: '0.65rem 0.9rem', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-muted)', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
              PASSWORD {mode === 'register' && <span style={{ color: 'var(--text-muted)' }}>(min 8 chars)</span>}
            </label>
            <input
              type="password" required minLength={8} value={password} autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              onChange={e => setPassword(e.target.value)}
              style={{ width: '100%', background: 'var(--surface, rgba(30,41,59,0.8))', border: '1px solid var(--border)', color: 'var(--text)', padding: '0.65rem 0.9rem', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}
            />
          </div>
          <button className="btn btn-primary" style={{ width: '100%', padding: '0.7rem' }} disabled={submitting}>
            {submitting ? 'Please wait…' : (mode === 'login' ? 'Sign In' : 'Create Account')}
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: '1.2rem' }}>
          <button
            onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setLocalError(null); }}
            style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            {mode === 'login' ? "Don't have an account? Register" : 'Already registered? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Session Selector View ──────────────────────────────────────────────────────

const SessionSelectView = ({ user, sessions, onSelectSession, onCreateSession, onLogout }) => {
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await onCreateSession(newName.trim());
      setNewName('');
    } catch (err) {
      setError('Failed to create session');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="loading-container">
      <div className="glass" style={{ padding: '2rem', minWidth: '440px', maxWidth: '560px', width: '100%', borderRadius: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <div className="logo" style={{ fontSize: '1rem' }}><Sparkles size={20} /> NeetPractice</div>
          <button
            onClick={onLogout}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem' }}
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.82rem' }}>
          Signed in as <strong style={{ color: 'var(--text)' }}>{user?.email}</strong>. Choose a study session to continue.
        </p>

        <h3 style={{ margin: '0 0 0.8rem', fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Sessions</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem', maxHeight: '280px', overflowY: 'auto' }}>
          {sessions.length === 0 && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>No sessions yet. Create one below.</p>
          )}
          {sessions.map(s => (
            <button
              key={s.id}
              onClick={() => onSelectSession(s)}
              style={{
                textAlign: 'left', padding: '0.9rem 1rem', borderRadius: '10px',
                border: '1px solid var(--border)', cursor: 'pointer',
                background: 'rgba(255,255,255,0.03)', color: 'var(--text)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                transition: 'all 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div>
                <div style={{ fontWeight: 600, marginBottom: '0.2rem' }}>
                  <FolderOpen size={14} style={{ marginRight: '0.4rem', opacity: 0.6 }} />
                  {s.name}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Created {new Date(s.createdAt).toLocaleDateString()}
                  {s.is_default ? ' · Default' : ''}
                </div>
              </div>
              <ChevronRight size={16} style={{ opacity: 0.4 }} />
            </button>
          ))}
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.2rem' }}>
          <h3 style={{ margin: '0 0 0.8rem', fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>New Session</h3>
          {error && <div style={{ color: 'var(--hard)', marginBottom: '0.6rem', fontSize: '0.8rem' }}>{error}</div>}
          <form onSubmit={handleCreate} style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              placeholder="e.g. Google Prep 2024"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              maxLength={100}
              style={{
                flex: 1, background: 'var(--surface, rgba(30,41,59,0.8))', border: '1px solid var(--border)',
                color: 'var(--text)', padding: '0.6rem 0.8rem', borderRadius: '8px', fontSize: '0.85rem'
              }}
            />
            <button className="btn btn-primary" type="submit" disabled={creating || !newName.trim()} style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Plus size={14} /> {creating ? '…' : 'Create'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

// ── Main App ───────────────────────────────────────────────────────────────────

const App = () => {
  // ── Auth State ──────────────────────────────────────────────────────────────
  const [authPhase, setAuthPhase] = useState(() =>
    localStorage.getItem('jwt') ? 'loading' : 'login'
  ); // 'loading' | 'login' | 'session-select' | 'app'
  const [authUser, setAuthUser] = useState(null);
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('jwt') || null);
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(() => {
    const s = localStorage.getItem('activeSession');
    return s ? JSON.parse(s) : null;
  });
  const [authError, setAuthError] = useState(null);

  const api = useCallback((url, opts = {}) =>
    apiFetch(url, opts, authToken, activeSession?.id),
  [authToken, activeSession]);

  // ── App State ───────────────────────────────────────────────────────────────
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
  const [librarySelectedTopic, setLibrarySelectedTopic] = useState(null);

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
  const [practiceCode, setPracticeCode] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({ planned_days: 25, revisions_per_day: 3 });
  const [stats, setStats] = useState(null);
  const [mockSession, setMockSession] = useState(() => {
    const saved = localStorage.getItem('mockSession');
    return saved ? JSON.parse(saved) : { isActive: false, problemIds: [], startTime: null };
  });
  const [timeRemaining, setTimeRemaining] = useState(() => {
    const saved = localStorage.getItem('mockSession');
    if (saved) {
      const session = JSON.parse(saved);
      const elapsed = Math.floor((Date.now() - session.startTime) / 1000);
      return Math.max(5400 - elapsed, 0);
    }
    return 5400;
  });

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

  const maxDay = useMemo(() => settings.planned_days || 25, [settings]);

  const categories = useMemo(() => [...new Set(problems.map(p => p.category))].sort(), [problems]);

  const browsedProblems = useMemo(() => problems.filter(p => {
    if (filterCategory && p.category !== filterCategory) return false;
    if (filterDifficulty && p.difficulty !== filterDifficulty) return false;
    return true;
  }), [problems, filterCategory, filterDifficulty]);

  const getDayForProblem = useCallback((problemId) => {
    const idx = problems.findIndex(p => p.id === problemId);
    if (idx === -1) return 1;
    const problemsPerDay = Math.ceil(problems.length / maxDay);
    return Math.floor(idx / problemsPerDay) + 1;
  }, [problems, maxDay]);

  const getProblemsForDay = useCallback((day) => {
    const problemsPerDay = Math.ceil(problems.length / maxDay);
    const startIdx = (day - 1) * problemsPerDay;
    const endIdx = startIdx + problemsPerDay;
    
    const newProbs = problems.slice(startIdx, endIdx).map(p => ({ 
      ...p, 
      day: day, // Override status with dynamic day
      isRevision: false 
    }));

    let revProbs = [];
    if (day > 1) {
      const prevProbs = problems.slice(0, startIdx);
      const revSource = prevProbs.filter(p => p.difficulty !== 'Easy');
      
      if (revSource.length > 0) {
        const selectedIndices = new Set();
        const primes = [31, 37, 41, 43, 47]; // More primes for more variety
        for (let i = 0; i < settings.revisions_per_day && selectedIndices.size < revSource.length; i++) {
          let idx = (day * primes[i % primes.length]) % revSource.length;
          while (selectedIndices.has(idx)) {
            idx = (idx + 1) % revSource.length;
          }
          selectedIndices.add(idx);
        }
        revProbs = Array.from(selectedIndices).map(idx => ({ ...revSource[idx], isRevision: true }));
      }
    }
    return [...newProbs, ...revProbs];
  }, [problems, maxDay, settings.revisions_per_day]);

  const dailyProblems = useMemo(() => getProblemsForDay(selectedDay), [selectedDay, getProblemsForDay]);

  const { prevProblem, nextProblem } = useMemo(() => {
    let list = [];
    if (navigationContext === 'browse') list = browsedProblems;
    else if (navigationContext === 'library') {
      const topic = activeProblem?.category || librarySelectedTopic;
      list = problems.filter(p => p.category === topic);
    } else {
      list = dailyProblems;
    }

    const idx = list.findIndex(p => p.id === activeProblemId);
    
    let prev = idx > 0 ? list[idx - 1] : null;
    let next = idx >= 0 && idx < list.length - 1 ? list[idx + 1] : null;

    // Boundary Logic
    if (navigationContext === 'dashboard') {
      if (!prev && selectedDay > 1) {
        const prevDayPool = getProblemsForDay(selectedDay - 1);
        prev = prevDayPool[prevDayPool.length - 1];
      }
      if (!next && selectedDay < maxDay) {
        const nextDayPool = getProblemsForDay(selectedDay + 1);
        next = nextDayPool[0];
      }
    } else if (navigationContext === 'library') {
      const currentTopic = activeProblem?.category || librarySelectedTopic;
      const topicIdx = categories.indexOf(currentTopic);
      
      if (!prev && topicIdx > 0) {
        const prevTopic = categories[topicIdx - 1];
        const prevPool = problems.filter(p => p.category === prevTopic);
        prev = prevPool[prevPool.length - 1];
      }
      if (!next && topicIdx < categories.length - 1 && topicIdx !== -1) {
        const nextTopic = categories[topicIdx + 1];
        const nextPool = problems.filter(p => p.category === nextTopic);
        next = nextPool[0];
      }
    }

    return { prevProblem: prev, nextProblem: next };
  }, [activeProblemId, dailyProblems, browsedProblems, navigationContext, activeView, selectedDay, maxDay, getProblemsForDay, activeProblem, librarySelectedTopic, categories, problems]);

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

  const libraryProblems = useMemo(() => {
    const topic = activeProblem?.category || librarySelectedTopic;
    if (!topic) return [];
    return problems.filter(p => p.category === topic);
  }, [problems, activeProblem, librarySelectedTopic]);

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

  const totalDays = maxDay;

  // --- Static Helpers ---
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // --- Action Handlers ---

  const startMockInterview = () => {
    const easy = problems.filter(p => p.difficulty === 'Easy');
    const medium = problems.filter(p => p.difficulty === 'Medium');
    const hard = problems.filter(p => p.difficulty === 'Hard');

    if (easy.length === 0 || medium.length === 0 || hard.length === 0) {
      alert("Loading problems... please wait a moment.");
      return;
    }

    const selected = [
      easy[Math.floor(Math.random() * easy.length)],
      medium[Math.floor(Math.random() * medium.length)],
      hard[Math.floor(Math.random() * hard.length)]
    ];

    const session = { 
      isActive: true, 
      problemIds: selected.map(p => p.id), 
      startTime: Date.now() 
    };
    
    setMockSession(session);
    setTimeRemaining(5400);
    localStorage.setItem('mockSession', JSON.stringify(session));
    
    // Switch to first problem in mock context
    setActiveProblemId(selected[0].id);
    setNavigationContext('mock-interview');
    setActiveView('mock-interview');
    setInterfaceMode('practice');
    setCodeTab('practice');
  };

  const endMockInterview = () => {
    setMockSession({ isActive: false, problemIds: [], startTime: null });
    localStorage.removeItem('mockSession');
    setNavigationContext('dashboard');
    setActiveView('dashboard');
    setActiveProblemId(null);
    setTimeRemaining(0);
  };

  const switchMockProblem = () => {
    if (!mockSession.isActive) return;
    const mockProblems = problems.filter(p => mockSession.problemIds.includes(p.id));
    // Find unsolved problems that are not the current one
    const unsolved = mockProblems.filter(p => p.user_status !== 'completed' && p.id !== activeProblemId);
    if (unsolved.length > 0) {
      setActiveProblemId(unsolved[0].id);
      setActiveView('mock-interview');
      setNavigationContext('mock-interview');
    }
  };

  const canSwitchMockProblem = useMemo(() => {
    if (!mockSession.isActive) return false;
    const mockProblems = problems.filter(p => mockSession.problemIds.includes(p.id));
    const unsolved = mockProblems.filter(p => p.user_status !== 'completed' && p.id !== activeProblemId);
    return unsolved.length > 0;
  }, [mockSession, problems, activeProblemId]);

  useEffect(() => {
    let timer;
    if (mockSession.isActive && timeRemaining > 0) {
      timer = setInterval(() => {
        setTimeRemaining(prev => Math.max(prev - 1, 0));
      }, 1000);
    } else if (timeRemaining === 0 && mockSession.isActive) {
      alert("Time is up! The mock session has ended.");
      setMockSession({ isActive: false, problemIds: [], startTime: null });
      localStorage.removeItem('mockSession');
      setNavigationContext('dashboard');
      setActiveView('dashboard');
    }
    return () => clearInterval(timer);
  }, [mockSession.isActive, timeRemaining]);

  const updateBackend = useCallback(async (problemId, status, code, practiceCode, notes) => {
    try {
      await api('/api/progress', {
        method: 'POST',
        body: JSON.stringify({ problemId, status, code, practiceCode, notes }),
      });
      setProblems(prev => prev.map(p => 
        p.id === problemId 
          ? { ...p, user_status: status, user_code: code, practice_code: practiceCode, user_notes: notes } 
          : p
      ));
    } catch (err) {
      console.error('Failed to update backend:', err);
    }
  }, [api]);

  const handleAgentReview = async () => {
    if (!activeProblem) return;
    const currentCode = interfaceMode === 'practice' ? practiceCode : localUserCode;
    
    if (!currentCode || currentCode.length < 10) {
      setAgentError('Please write some code before asking for a review.');
      return;
    }

    try {
      setAgentLoading(true);
      setAgentError(null);
      setAgentResponse(null);

      const res = await api('/api/agent/review', {
        method: 'POST',
        body: JSON.stringify({
          problemTitle: activeProblem.title,
          statement: activeProblem.statement,
          localUserCode: currentCode,
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
          setLocalUserCode(codeMatch[1].trim());
        }
        setAgentResponse(null);
      }
    } else {
      alert('No clear code block found in the suggestion to automatically apply.');
    }
  };

  const navigateToProblem = useCallback((problem, context = null, targetDay = null) => {
    if (!problem) return;
    setActiveProblemId(problem.id);
    
    // Smart Context Sync: 
    // Synchronize selectedDay if:
    // 1. A targetDay is explicitly provided (forced boundary transition)
    // 2. OR we're in dashboard context AND it's not a revision (prevents jumping on revision clicks)
    const effectiveContext = context || navigationContext;
    const pDay = getDayForProblem(problem.id);
    const effectiveDay = targetDay || (problem.isRevision ? null : pDay);
    
    if (effectiveDay && effectiveDay !== selectedDay && effectiveContext === 'dashboard') {
      setSelectedDay(effectiveDay);
    }

    if (context) setNavigationContext(context);
    else if (activeView === 'dashboard' || activeView === 'browse') {
      setNavigationContext(activeView);
    }
    
    // Clear other active states to avoid overlaps
    setActiveSdId(null);
    setActiveMlNoteId(null);
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [selectedDay, navigationContext, activeView]);

  const resetCode = () => {
    if (window.confirm('Reset this problem to its original state? This will clear your current code and hints.')) {
      const scaffold = generatePracticeScaffold(activeProblem.python_code, activeProblem.guided_hints);
      setLocalUserCode('');
      setPracticeCode(scaffold);
      updateBackend(activeProblem.id, 'not-started', '', scaffold, localNotes);
    }
  };

  const handleGlobalReset = async () => {
    if (window.confirm('CRITICAL: This will permanently delete ALL your progress, code edits, and notes across the entire application. Are you absolutely sure?')) {
      try {
        const res = await api('/api/settings/reset', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          alert('All progress has been reset. The application will now reload.');
          window.location.reload();
        }
      } catch (err) {
        alert('Failed to reset progress: ' + err.message);
      }
    }
  };

  const handleCopyToDraft = () => {
    if (window.confirm('Copy this scaffold to your drafting area? This will overwrite your current draft.')) {
      setLocalUserCode(practiceCode);
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
    const newStatus = activeProblem.user_status === 'completed' ? 'not-started' : 'completed';
    setProblems(prev => prev.map(p => 
      p.id === activeProblemId 
        ? { ...p, user_status: newStatus, user_code: localUserCode, practice_code: practiceCode, user_notes: localNotes } 
        : p
    ));
    await updateBackend(activeProblemId, newStatus, localUserCode, practiceCode, localNotes);
  };

  const toggleFavorite = async () => {
    if (!activeProblem) return;
    const newFav = !activeProblem.is_favorite;
    setProblems(prev => prev.map(p => 
      p.id === activeProblemId ? { ...p, is_favorite: newFav } : p
    ));
    try {
      await api(`/api/problems/${activeProblemId}/favorite`, {
        method: 'POST',
        body: JSON.stringify({ is_favorite: newFav })
      });
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const toggleSdComplete = async () => {
    const currentProblem = sdProblems.find(p => p.id === activeSdId) || sdToday;
    if (!currentProblem) return;
    
    const newStatus = currentProblem.status === 'completed' ? 'not_started' : 'completed';
    try {
      await api('/api/system-design/progress', {
        method: 'POST',
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
        await updateBackend(activeProblemId, activeProblem.user_status, localUserCode, '');
      } catch (err) {
        console.error('Failed to reset notes:', err);
      }
    }
  };

  const closeSidebar = () => setSidebarOpen(false);

  const handleNavClick = (view) => {
    setActiveView(view);
    if (view === 'library') {
      setActiveProblemId(null);
      setLibrarySelectedTopic(null);
    }
    closeSidebar();
    if (view === 'dashboard' || view === 'browse' || view === 'library') {
      setNavigationContext(view);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api('/api/stats');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await api('/api/settings');
      const data = await res.json();
      setSettings(data);
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
  };

  const updateSettings = async (newSettings) => {
    try {
      const res = await api('/api/settings', {
        method: 'POST',
        body: JSON.stringify(newSettings)
      });
      const data = await res.json();
      setSettings(data);
      // Wait a bit for DB to catch up if needed, though redistribution is local
    } catch (err) {
      console.error('Failed to update settings:', err);
    }
  };


  // Bootstrap: validate persisted JWT and session
  useEffect(() => {
    if (!authToken) { setAuthPhase('login'); return; }
    (async () => {
      try {
        const res = await apiFetch('/api/auth/me', {}, authToken, null);
        if (!res.ok) throw new Error('Token invalid');
        const user = await res.json();
        setAuthUser(user);

        // Fetch sessions list
        const sRes = await apiFetch('/api/sessions', {}, authToken, null);
        if (sRes.ok) setSessions(await sRes.json());

        if (activeSession) {
          const vRes = await apiFetch(`/api/sessions/${activeSession.id}`, {}, authToken, null);
          if (vRes.ok) {
            setAuthPhase('app');
          } else {
            localStorage.removeItem('activeSession');
            setActiveSession(null);
            setAuthPhase('session-select');
          }
        } else {
          setAuthPhase('session-select');
        }
      } catch {
        localStorage.removeItem('jwt');
        localStorage.removeItem('activeSession');
        setAuthToken(null);
        setActiveSession(null);
        setAuthPhase('login');
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (authPhase !== 'app') return;
    const fetchData = async () => {
      try {
        setLoading(true);
        const [pRes, sdRes, mlRes, allMlRes] = await Promise.all([
          api('/api/problems'),
          api('/api/system-design/today'),
          api('/api/ml-design/today'),
          api('/api/ml-design')
        ]);

        await Promise.all([
          fetchSettings(),
          fetchStats()
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
  }, [authPhase]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!activeProblem) return;
    if (activeProblemId) {
      setLocalUserCode(activeProblem.user_code || '');
      // Use saved practice_code if available, otherwise generate from scaffold
      setPracticeCode(activeProblem.practice_code || generatePracticeScaffold(activeProblem.python_code, activeProblem.guided_hints));
      setInterfaceMode('practice');
      setAgentResponse(null);
      setAgentError(null);
      setLocalNotes(activeProblem.user_notes || '');
    }
  }, [activeProblemId, activeProblem]);

  useEffect(() => {
    if (!activeProblem) return;
    const timer = setTimeout(async () => {
      const hasUserCodeChanged = localUserCode !== activeProblem.user_code;
      const hasPracticeCodeChanged = practiceCode !== activeProblem.practice_code;
      const hasNotesChanged = localNotes !== activeProblem.user_notes;

      if (hasUserCodeChanged || hasPracticeCodeChanged || hasNotesChanged) {
        updateBackend(activeProblem.id, activeProblem.user_status, localUserCode, practiceCode, localNotes);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [localUserCode, practiceCode, activeProblemId, activeProblem, updateBackend, localNotes]);

  useEffect(() => {
    if (dayPickerRef.current) {
      const selected = dayPickerRef.current.querySelector('.day-tile.selected');
      if (selected) selected.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [selectedDay]);

  // --- Specialized View Renderers ---

  const renderLibraryView = () => {
    const categories = {};
    problems.forEach(p => {
      if (!categories[p.category]) categories[p.category] = [];
      categories[p.category].push(p);
    });

    const starredProblems = problems.filter(p => p.is_favorite);

    return (
      <div className="library-view-container fade-in">
        <div className="library-header-section">
          <h1>Mastery Library</h1>
          <p>Differentiate your practice by topic and master each category.</p>
        </div>

        {starredProblems.length > 0 && (
          <div className="library-section starred">
            <h2><Star size={22} fill="var(--accent)" color="var(--accent)" /> Starred Problems</h2>
            <div className="library-grid">
              {starredProblems.map(p => (
                <div key={p.id} className="library-tile glass highlight-hover" onClick={() => navigateToProblem(p, 'library')}>
                  <div className="tile-header">
                    <span className={`difficulty-tag ${p.difficulty.toLowerCase()}`}>{p.difficulty}</span>
                    <span className={`status-dot ${p.user_status}`}></span>
                  </div>
                  <h3>{p.title}</h3>
                  <span className="tile-category">{p.category}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="library-topics-list">
          {Object.entries(categories).sort((a,b) => a[0].localeCompare(b[0])).map(([name, items]) => {
            const completedCount = items.filter(i => i.user_status === 'completed').length;
            const progress = (completedCount / items.length) * 100;
            return (
              <div 
                key={name} 
                className={`topic-group glass highlight-hover ${librarySelectedTopic === name ? 'active' : ''}`}
                onClick={() => {
                  setLibrarySelectedTopic(name);
                  if (items.length > 0) {
                    navigateToProblem(items[0], 'library');
                  }
                }}
              >
                <div className="topic-info">
                  <div className="topic-text">
                    <h3>{name}</h3>
                    <span>{completedCount} / {items.length} Mastered</span>
                  </div>
                  <div className="progress-bar-container">
                    <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                  </div>
                </div>
                <div className="topic-problems-inline">
                  {items.map(p => (
                    <button 
                      key={p.id} 
                      className={`topic-problem-dot ${p.user_status} ${activeProblemId === p.id ? 'active' : ''}`}
                      onClick={() => navigateToProblem(p, 'library')}
                      title={p.title}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMockInterviewView = () => {
    if (mockSession.isActive) {
      if (activeProblemId && mockSession.problemIds.includes(activeProblemId)) {
        return renderAlgorithmView();
      }

      const selectedProblems = problems.filter(p => mockSession.problemIds.includes(p.id));
      
      return (
        <div className="active-mock-view fade-in">
          <div className="mock-session-header glass">
            <div className="session-info">
              <Zap size={24} className="mock-accent-icon" />
              <div>
                <h2>Active Mock Simulation</h2>
                <p>Complete all three problems before the timer expires.</p>
              </div>
            </div>
            <div className={`mock-timer ${timeRemaining < 300 ? 'pulse-danger' : ''}`}>
              <Clock size={20} />
              <span>{formatTime(timeRemaining)}</span>
            </div>
            <button className="btn btn-danger" onClick={endMockInterview}>Quit Session</button>
          </div>

          <div className="mock-problem-progress-grid">
            {selectedProblems.map((p, idx) => (
              <div 
                key={p.id} 
                className={`mock-problem-card glass highlight-hover ${activeProblemId === p.id ? 'active' : ''}`}
                onClick={() => navigateToProblem(p, 'mock-interview')}
              >
                <div className="mock-problem-meta">
                  <span className="question-number">Question {idx + 1}</span>
                  <span className={`difficulty-tag ${p.difficulty.toLowerCase()}`}>{p.difficulty}</span>
                </div>
                <h3>{p.title}</h3>
                <div className="problem-outcome">
                  {p.user_status === 'completed' ? (
                    <span className="status-badge completed"><CheckCircle size={14} /> Solved</span>
                  ) : (
                    <span className="status-badge pending">In Progress</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mock-instructions glass">
            <h4><Info size={18} /> Mock Environment Rules</h4>
            <ul>
              <li>Solutions and hints are disabled.</li>
              <li>You may switch between problems at any time.</li>
              <li>Progress is saved automatically as you complete problems.</li>
            </ul>
          </div>
        </div>
      );
    }

    return (
      <div className="mock-setup fade-in">
        <div className="hero-content">
          <Zap size={48} className="mock-icon" />
          <h1>Professional Mock Simulator</h1>
          <p>Select a challenge set to simulate a real-world coding interview.</p>
          <div className="mock-details-grid">
            <div className="mock-card glass">
              <h3>The Neet Set</h3>
              <div className="difficulty-pills">
                <span className="pill easy">E</span>
                <span className="pill medium">M</span>
                <span className="pill hard">H</span>
              </div>
              <ul>
                <li>90 Minute Time Limit</li>
                <li>Randomized Categories</li>
                <li>No Hints / No Reference</li>
              </ul>
              <button className="btn btn-primary full-width" onClick={startMockInterview}>
                Attempt Mock Interview
              </button>
            </div>
            <div className="mock-card glass disabled">
              <h3>System Design Loop</h3>
              <p>Complete 5 System Design problems to unlock.</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAlgorithmView = () => {
    if (!activeProblem) return (
      <div className="empty-state">
        <Trophy size={64} style={{ color: 'var(--accent)', opacity: 0.5 }} />
        <h2>Ready to level up?</h2>
        <p>Select a problem to begin.</p>
      </div>
    );

    const isMock = navigationContext === 'mock-interview';

    return (
      <div className="problem-view fade-in">
        {isMock && (
          <div className="mock-timer-row">
            <div className="m-status">
              <Zap size={16} />
              <span>Mock Simulation Active</span>
            </div>
            <div className={`m-timer ${timeRemaining < 300 ? 'pulse-danger' : ''}`}>
              <Clock size={16} />
              <span>{formatTime(timeRemaining)}</span>
            </div>
            <div className="m-actions">
              <button 
                className="m-btn-secondary" 
                onClick={switchMockProblem}
                disabled={!canSwitchMockProblem}
                title={canSwitchMockProblem ? 'Switch to next unsolved problem' : 'No other unsolved problems'}
              >
                Switch Problem
              </button>
              <button 
                className="m-btn-danger" 
                onClick={endMockInterview}
              >
                Quit Session
              </button>
            </div>
          </div>
        )}

        {!isMock && navigationContext === 'dashboard' && (
          <div className="day-picker">
            <div className="day-picker-header">
              <button 
                className="day-nav-btn" 
                onClick={() => {
                  const newDay = Math.max(1, selectedDay - 1);
                  setSelectedDay(newDay);
                  const dayProbs = getProblemsForDay(newDay);
                  if (dayProbs.length > 0) setActiveProblemId(dayProbs[0].id);
                }}
                disabled={selectedDay === 1}
              >
                <ChevronLeft size={16} />
              </button>
              <span className="day-picker-label">{formatDateShort(selectedDay)} <span className="day-picker-total">({selectedDay} of {maxDay})</span></span>
              <button 
                className="day-nav-btn" 
                onClick={() => {
                  const newDay = Math.min(maxDay, selectedDay + 1);
                  setSelectedDay(newDay);
                  const dayProbs = getProblemsForDay(newDay);
                  if (dayProbs.length > 0) setActiveProblemId(dayProbs[0].id);
                }}
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
                    onClick={() => {
                      setSelectedDay(day);
                      const dayProbs = getProblemsForDay(day);
                      if (dayProbs.length > 0) setActiveProblemId(dayProbs[0].id);
                    }}
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
                onClick={() => {
                  const dayJump = (activeView === 'dashboard' && !dailyProblems.find(p => p.id === prevProblem.id)) ? selectedDay - 1 : null;
                  navigateToProblem(prevProblem, 'dashboard', dayJump);
                }}
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
                onClick={() => {
                  const dayJump = (activeView === 'dashboard' && !dailyProblems.find(p => p.id === nextProblem.id)) ? selectedDay + 1 : null;
                  navigateToProblem(nextProblem, 'dashboard', dayJump);
                }}
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

            <div className="quick-actions-bar">
              <button 
                className={`btn btn-secondary ${activeProblem.is_favorite ? 'starred' : ''}`} 
                onClick={toggleFavorite}
                title={activeProblem.is_favorite ? "Remove from Library" : "Add to Library"}
              >
                <Star size={16} fill={activeProblem.is_favorite ? "var(--accent)" : "none"} color={activeProblem.is_favorite ? "var(--accent)" : "currentColor"} />
                <span>Star</span>
              </button>

              <button className="btn btn-secondary" onClick={resetCode} title="Reset solution to original scaffold">
                <RotateCcw size={16} />
                <span>Reset Problem</span>
              </button>
            </div>
          </div>
        </div>

        <div className="problem-view-master-grid">
          <div className="problem-content-enriched glass">
            <div className="content-section">
              <h3>Problem Statement</h3>
              <div
                className="problem-statement"
                dangerouslySetInnerHTML={{ __html: activeProblem.statement && activeProblem.statement !== "" ? activeProblem.statement : '<div class="placeholder-statement">Problem statement details are being fetched... Please refer to NeetCode.io link above in the meantime.</div>' }}
              />
            </div>
          </div>

          <div className="problem-interface-enriched glass fade-in">
            <div className="content-section">
              <div className="interface-header">
                <div className="interface-header-left">
                  <h3>
                    {interfaceMode === 'edit' ? 'Draft Your Solution' : 
                     interfaceMode === 'practice' ? 'Practice' : 'Reference Solution'}
                  </h3>
                  {!isMock && <SolutionToggle mode={interfaceMode} onModeChange={setInterfaceMode} />}
                </div>
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
                    code={localUserCode}
                    onChange={setLocalUserCode}
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

              <div className="interface-footer">
                <button
                  className={`btn status-btn ${activeProblem.user_status === 'completed' ? 'btn-secondary' : 'btn-primary'}`}
                  onClick={toggleComplete}
                >
                  {activeProblem.user_status === 'completed' ? <CheckCircle size={18} /> : <Circle size={18} />}
                  <span>{activeProblem.user_status === 'completed' ? 'Completed' : 'Mark as Done'}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="video-mnemonic-row">
            {!isMock && activeProblem.youtube_url && (
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

            {!isMock && (
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
            )}
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
      </div>
    );
  };

  useEffect(() => {
    const container = document.querySelector('.active-problem-view');
    if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeProblemId, activeView]);

  // ── Auth Phase Gates ─────────────────────────────────────────────────────────

  if (authPhase === 'loading') {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Verifying session…</p>
      </div>
    );
  }

  if (authPhase === 'login') {
    return (
      <LoginView
        error={authError}
        onSuccess={async (token, user, isRegister) => {
          setAuthError(null);
          setAuthToken(token);
          setAuthUser(user);
          localStorage.setItem('jwt', token);

          const sRes = await apiFetch('/api/sessions', {}, token, null);
          const sess = sRes.ok ? await sRes.json() : [];
          setSessions(sess);

          if (isRegister && sess.length > 0) {
            // Auto-select the default session created on register
            const defaultSess = sess.find(s => s.is_default) || sess[0];
            setActiveSession(defaultSess);
            localStorage.setItem('activeSession', JSON.stringify(defaultSess));
            setAuthPhase('app');
          } else {
            setAuthPhase('session-select');
          }
        }}
      />
    );
  }

  if (authPhase === 'session-select') {
    return (
      <SessionSelectView
        user={authUser}
        sessions={sessions}
        onSelectSession={(session) => {
          setActiveSession(session);
          localStorage.setItem('activeSession', JSON.stringify(session));
          setProblems([]);
          setLoading(true);
          setAuthPhase('app');
        }}
        onCreateSession={async (name) => {
          const res = await apiFetch('/api/sessions', {
            method: 'POST',
            body: JSON.stringify({ name })
          }, authToken, null);
          if (!res.ok) throw new Error('Failed to create');
          const newSession = await res.json();
          setSessions(prev => [newSession, ...prev]);
        }}
        onLogout={() => {
          localStorage.removeItem('jwt');
          localStorage.removeItem('activeSession');
          setAuthToken(null);
          setAuthUser(null);
          setActiveSession(null);
          setSessions([]);
          setAuthPhase('login');
        }}
      />
    );
  }

  // ── App Phase ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Initializing practice session…</p>
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
          {authUser && activeSession && (
            <div style={{ marginTop: '0.5rem', padding: '0.4rem 0.6rem', background: 'rgba(16,185,129,0.08)', borderRadius: '8px', fontSize: '0.7rem' }}>
              <div style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {authUser.email}
              </div>
              <div style={{ color: 'var(--accent)', fontWeight: 600, marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <FolderOpen size={11} /> {activeSession.name}
              </div>
            </div>
          )}
        </div>

        <nav className="sidebar-nav">
          <button className={`nav-item ${activeView === 'dashboard' ? 'active' : ''}`} onClick={() => handleNavClick('dashboard')}>
            <LayoutGrid size={18} /> Dashboard
          </button>
          <button className={`nav-item ${activeView === 'calendar' ? 'active' : ''}`} onClick={() => handleNavClick('calendar')}>
            <CalendarIcon size={18} /> Calendar View
          </button>
          <button className={`nav-item ${activeView === 'browse' ? 'active' : ''}`} onClick={() => handleNavClick('browse')}>
            <Search size={18} /> Browse Problems
          </button>
          <button className={`nav-item ${activeView === 'library' ? 'active' : ''}`} onClick={() => handleNavClick('library')}>
            <Star size={18} /> Library
          </button>
          <button className={`nav-item ${activeView === 'mock-interview' ? 'active' : ''}`} onClick={() => handleNavClick('mock-interview')}>
            <Zap size={18} /> Mock Interview
          </button>
          <button className={`nav-item ${activeView === 'system-design' ? 'active' : ''}`} onClick={() => handleNavClick('system-design')}>
            <BrainCircuit size={18} /> System Design
          </button>
          <button className={`nav-item ${activeView === 'profile' ? 'active' : ''}`} onClick={() => handleNavClick('profile')}>
            <BarChart3 size={18} /> Stats
          </button>
          <div className="divider"></div>
          <button className="nav-item settings-nav-item" onClick={() => setShowSettings(true)}>
            <SettingsIcon size={18} /> Settings
          </button>
          <button
            className="nav-item"
            style={{ color: 'var(--text-muted)' }}
            onClick={() => {
              setAuthPhase('session-select');
              setActiveSession(null);
              localStorage.removeItem('activeSession');
              setProblems([]);
              setStats(null);
              closeSidebar();
            }}
          >
            <FolderOpen size={18} /> Switch Session
          </button>
          <button
            className="nav-item"
            style={{ color: 'var(--hard)' }}
            onClick={() => {
              localStorage.removeItem('jwt');
              localStorage.removeItem('activeSession');
              setAuthToken(null);
              setAuthUser(null);
              setActiveSession(null);
              setSessions([]);
              setProblems([]);
              setStats(null);
              setAuthPhase('login');
              closeSidebar();
            }}
          >
            <LogOut size={18} /> Sign Out
          </button>
          <div className="divider"></div>
          {mockSession.isActive && (
            <div className="sidebar-mock-timer glass">
              <div className="timer-label">Mock Time Remaining</div>
              <div className={`timer-value ${timeRemaining < 300 ? 'urgent' : ''}`}>
                <Zap size={14} className="timer-icon" />
                {formatTime(timeRemaining)}
              </div>
              <button className="btn-text-small" onClick={switchMockProblem} disabled={!canSwitchMockProblem}>Switch Problem</button>
              <button className="sidebar-quit-btn" onClick={endMockInterview}>
                <X size={14} /> Quit Session
              </button>
            </div>
          )}
        </nav>

        <div className="sidebar-body">
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
        {activeView === 'library' && (activeProblemId || librarySelectedTopic) && (
          <div className="problem-list-container">
            <h1 className="day-title">{activeProblem?.category || librarySelectedTopic}</h1>
            <div className="problem-list">
              {libraryProblems.map(p => (
                <div
                  key={p.id}
                  className={`problem-item ${activeProblemId === p.id ? 'active' : ''} ${p.user_status === 'completed' ? 'completed' : ''}`}
                  onClick={() => navigateToProblem(p, 'library')}
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
      </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)}>
          <Menu size={20} />
        </button>

        {activeView === 'browse' ? (
          activeProblemId ? renderAlgorithmView() : (
            <div className="empty-state">
              <Search size={64} style={{ color: 'var(--accent)', opacity: 0.5 }} />
              <h3>Explore Problems</h3>
              <p>Select a topic and problem from the sidebar to begin practicing.</p>
            </div>
          )
        ) : activeView === 'library' ? (
          activeProblemId ? renderAlgorithmView() : renderLibraryView()
        ) : activeView === 'mock-interview' ? (
          renderMockInterviewView()
        ) : activeView === 'profile' ? (
          <div className="profile-dashboard fade-in">
            <div className="day-picker-header" style={{ marginBottom: '2rem' }}>
              <div className="logo"><BarChart3 size={24} /> User Insight & Statistics</div>
            </div>
            
            <StatsSummary summary={stats?.summary} />
            
            <div className="analytics-row">
              <SVGProgressChart dailyData={stats?.daily} />
              <StudySettings settings={settings} onUpdate={updateSettings} />
            </div>

            <div className="activity-table-wrapper glass">
              <table className="activity-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Engagement Summary</th>
                    <th>Activity Level</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.daily ? Object.entries(stats.daily).reverse().map(([date, data]) => (
                    <tr key={date}>
                      <td><span className="day-badge">{new Date(date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                          <span className="count-badge success"><Check size={14} /> {data.completed} Solved</span>
                          <span className="count-badge attempt"><RotateCcw size={14} /> {data.attempts} Attempts</span>
                        </div>
                      </td>
                      <td>
                        <div className="progress-bar" style={{ width: '100px', marginBottom: 0 }}>
                          <div className="progress-fill" style={{ width: `${Math.min(100, (data.completed + data.attempts) * 10)}%` }}></div>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="3" style={{ textAlign: 'center', padding: '2rem' }}>No historical activity found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeView === 'calendar' ? (
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
                      const dayProbs = getProblemsForDay(day);
                      if (dayProbs.length > 0) setActiveProblemId(dayProbs[0].id);
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
        ) : activeView === 'dashboard' ? (
          <div className="master-home-layout fade-in">
            {/* Section 1: Algorithms (LeetCode) */}
            <div className="home-section home-section-leetcode">
              <div className="section-label-main">
                <LayoutGrid size={16} /> Data Structures & Algorithms
              </div>
              <div className="track-summary-tags">
                <span className="summary-pill"><Code size={12} /> Practice</span>
                <span className="summary-pill"><Tv size={12} /> Video</span>
                <span className="summary-pill"><Brain size={12} /> Mnemonics</span>
                <span className="summary-pill"><ShieldCheck size={12} /> Solution</span>
              </div>
              {renderAlgorithmView()}
            </div>

            {/* Section 2: System Design */}
            <div className="home-section home-section-sd">
              <div className="section-label-main">
                <BrainCircuit size={16} /> System Design Track
              </div>
              <div className="home-section-scrollable">
                {sdToday ? (
                  <div className="sd-today-card glass fade-in">
                    <div className="sd-card-header">
                      <div className="sd-card-tag">DAILY CHALLENGE</div>
                      <button 
                        className={`sd-status-toggle ${sdToday.status === 'completed' ? 'done' : ''}`}
                        onClick={toggleSdComplete}
                      >
                        {sdToday.status === 'completed' ? <CheckCircle size={16} /> : <Circle size={16} />}
                      </button>
                    </div>
                    <div className="sd-card-body">
                      <h3>{sdToday.title}</h3>
                      <div className="sd-category-pill">{sdToday.difficulty}</div>
                      
                      <div className="sd-preview-content">
                        {(() => {
                          const parsed = parseSystemDesignContent(sdToday.content);
                          return (
                            <div className="sd-brief-stack">
                              {parsed.overview && parsed.overview.length > 0 && (
                                <div className="sd-brief-item">
                                  <div className="brief-label">PROBLEM STATEMENT</div>
                                  <div className="brief-text truncate-lines-2">
                                    {parsed.overview.join(' ')}
                                  </div>
                                </div>
                              )}
                              {parsed.functional && parsed.functional.length > 0 && (
                                <div className="sd-brief-item">
                                  <div className="brief-label">FUNCTIONAL REQUIREMENTS</div>
                                  <ul className="brief-list-compact">
                                    {parsed.functional.slice(0, 3).map((item, i) => (
                                      <li key={i}>{item.replace(/^[-*•]\s*/, '')}</li>
                                    ))}
                                    {parsed.functional.length > 3 && <li className="more-items">+{parsed.functional.length - 3} more...</li>}
                                  </ul>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="sd-card-footer">
                      <button className="btn btn-primary full-width" onClick={() => navigateToSystemDesign(sdToday.id)}>
                        Read Full Breakdown <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="empty-state">No System Design challenge for today.</div>
                )}
                
                <div className="dashboard-stats-card glass mt-4">
                  <h4>Track Progress</h4>
                  <div className="mini-stat">
                    <span>Breakdowns Read</span>
                    <span>{sdProblems.filter(p => p.status === 'completed').length} / {sdProblems.length}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Machine Learning */}
            <div className="home-section home-section-ml">
              <div className="section-label-main">
                <Cpu size={16} /> Machine Learning Insights
              </div>
              <div className="home-section-scrollable">
                {mlToday ? (
                  <div className="ml-today-card glass fade-in" onClick={() => setActiveView('machine-learning')}>
                    <div className="ml-card-header">
                      <div className="ml-card-tag">STAFF RECOMMENDATION</div>
                      <div className="ml-card-badge">ML DESIGN</div>
                    </div>
                    <div className="ml-card-body">
                      <h3>{mlToday.title}</h3>
                      <div className="ml-insight-grid-dashboard">
                        <div className="ml-insight-item">
                          <div className="ml-insight-label">CONTEXT</div>
                          <div className="ml-insight-text">{mlToday.history}</div>
                        </div>
                        <div className="ml-insight-item">
                          <div className="ml-insight-label">TECHNICAL DEEP DIVE</div>
                          <div className="ml-insight-text truncate-lines-4">
                            {mlToday.technical_deep_dive}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="ml-card-footer">
                      <span className="learn-more">Open ML Library <ChevronRight size={14} /></span>
                    </div>
                  </div>
                ) : (
                  <div className="empty-state">No ML insights for today.</div>
                )}
              </div>
            </div>
          </div>
        ) : activeView === 'sd-detail' && activeSdId ? (
          <SystemDesignView
            problemId={activeSdId}
            onBack={() => setActiveView('system-design')}
            apiFetch={api}
          />
        ) : activeProblem ? (
          renderAlgorithmView()
        ) : (
          <div className="empty-state">
            <Trophy size={64} style={{ color: 'var(--accent)', opacity: 0.5 }} />
            <h2>Ready to level up?</h2>
            <p>Select a day from the calendar to view your daily challenges.</p>
            <button className="btn btn-primary" onClick={() => setActiveView('calendar')}>View Calendar</button>
          </div>
        )}

        {/* Global Settings Modal */}
        {showSettings && (
          <div className="modal-overlay fade-in" onClick={() => setShowSettings(false)}>
            <div className="modal-content glass settings-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Application Settings</h2>
                <button className="close-modal-btn" onClick={() => setShowSettings(false)}>
                  <X size={20} />
                </button>
              </div>
              <div className="settings-body">
                <section className="settings-section">
                  <h3>Data & Persistence</h3>
                  <p className="settings-description">Manage your stored progress and custom code edits.</p>
                  
                  <div className="settings-card destructive">
                    <div className="card-info">
                      <h4>Global Reset</h4>
                      <p>Wipe all progress, code changes, and notes across all problems.</p>
                    </div>
                    <button className="btn btn-danger" onClick={handleGlobalReset}>
                      <Trash2 size={16} /> Reset Everything
                    </button>
                  </div>
                </section>

                <section className="settings-section">
                  <h3>About</h3>
                  <p className="settings-description">NeetCode Practice - v1.2</p>
                  <p className="settings-hint">All edits are automatically saved to your local database as you type.</p>
                </section>
              </div>
            </div>
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

  // We keep them as arrays for flexible usage (e.g. lists in dash, strings in detail)
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

const SystemDesignView = ({ problemId, onBack, apiFetch: apiFetchProp }) => {
  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await apiFetchProp('/api/system-design');
        const all = await res.json();
        const found = all.find(p => p.id === problemId);
        setProblem(found);
      } catch (err) {
        console.error('SD Detail Fetch Err:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [problemId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div className="loading-container glass"><div className="loader"></div></div>;

  const toggleComplete = async () => {
    try {
      const newStatus = problem.status === 'completed' ? 'started' : 'completed';
      await apiFetchProp('/api/system-design/progress', {
        method: 'POST',
        body: JSON.stringify({ problem_id: problemId, status: newStatus })
      });
      setProblem(prev => ({ ...prev, status: newStatus }));
    } catch (err) {
      console.error('SD Progress Toggle Err:', err);
    }
  };

  return (
    <div className="sd-detail-wrapper">
      <button className="btn btn-secondary back-btn" onClick={onBack}>
        <ChevronLeft size={16} /> Back to Library
      </button>
      <SystemDesignDetail problem={problem} onToggleComplete={toggleComplete} />
    </div>
  );
};

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
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{parsed.overview.join('\n')}</ReactMarkdown>
          </div>
        )}

        {/* Requirements */}
        {(parsed.functional || parsed.nonFunctional) && (
          <div className="content-section">
            <SectionHeader icon={ListChecks} title="Requirements" id="reqs" />
            <div className="req-grid-harmonized">
              {parsed.functional && parsed.functional.length > 0 && (
                <RequirementCard title="Functional" content={parsed.functional.join('\n')} type="functional" />
              )}
              {parsed.nonFunctional && parsed.nonFunctional.length > 0 && (
                <RequirementCard title="Non-Functional" content={parsed.nonFunctional.join('\n')} type="non-functional" />
              )}
            </div>
          </div>
        )}

        {/* Technical Specs */}
        {(parsed.entities || parsed.api) && (
          <div className="content-section">
            <SectionHeader icon={Database} title="Entities & API" id="tech" />
            <div className="tech-specs-flex">
              {parsed.entities && parsed.entities.length > 0 && (
                <div className="tech-block">
                  <span className="tech-label">Core Entities</span>
                  <ReactMarkdown>{parsed.entities.join('\n')}</ReactMarkdown>
                </div>
              )}
              {parsed.api && parsed.api.length > 0 && (
                <div className="tech-block">
                  <span className="tech-label">Interface</span>
                  <ReactMarkdown>{parsed.api.join('\n')}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        )}

        {/* High-Level Design */}
        {parsed.hld && parsed.hld.length > 0 && (
          <div className="content-section">
            <SectionHeader icon={Cpu} title="High-Level Design" id="hld" />
            <div className="markdown-content">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{parsed.hld.join('\n')}</ReactMarkdown>
            </div>
          </div>
        )}

        {/* Deep Dives */}
        {parsed.deepDives && parsed.deepDives.length > 0 && (
          <div className="content-section">
            <SectionHeader icon={Search} title="Expert Deep Dives" id="deep-dives" />
            <div className="markdown-content">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{parsed.deepDives.join('\n')}</ReactMarkdown>
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
