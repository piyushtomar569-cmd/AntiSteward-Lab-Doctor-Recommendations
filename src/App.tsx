import { useEffect, useMemo, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Alert, CaseReview, Page, Patient, Prescription, Profile, QuizQuestion, Role } from '@/lib/types';
import {
  initialPatients,
  initialPrescriptions,
  initialReviews,
  initialAlerts,
  initialQuestions,
  initialProfiles,
} from '@/lib/initialData';
import { interpretReport, sampleReports, type LabInterpretationResult } from '@/lib/labInterpreter';
import { AuthScreen } from '@/components/AuthScreen';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  BookOpen,
  Check,
  ChevronRight,
  ClipboardList,
  Clock3,
  FilePlus2,
  FlaskConical,
  LayoutDashboard,
  Menu,
  Pill,
  Plus,
  Search,
  ShieldCheck,
  Stethoscope,
  Target,
  Trophy,
  UserRound,
  Users,
  X,
  Moon,
  Sun,
  Upload,
  Mic,
  FileText,
  Volume2,
  Pause,
  Square,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Database,
  WifiOff,
  LogOut,
} from 'lucide-react';

const navItems: { id: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'prescriptions', label: 'Prescriptions', icon: Pill },
  { id: 'reviews', label: 'Case reviews', icon: ClipboardList },
  { id: 'alerts', label: 'Alerts', icon: Bell },
  { id: 'learning', label: 'Learning', icon: BookOpen },
  { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  { id: 'analytics', label: 'Hospital analytics', icon: BarChart3 },
  { id: 'lab-report', label: 'AI Lab Report', icon: FileText },
];

const demoProfile = (role: Role): Profile => {
  return role === 'admin' ? initialProfiles[1] : initialProfiles[0];
};

function App() {
  const [page, setPage] = useState<Page>('overview');
  const [role, setRole] = useState<Role>('doctor');
  const [profile, setProfile] = useState<Profile>(demoProfile('doctor'));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [reviews, setReviews] = useState<CaseReview[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLiveBackend, setIsLiveBackend] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('antisteward-theme') === 'dark');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authChecking, setAuthChecking] = useState<boolean>(true);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('antisteward-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    let isMounted = true;

    const checkCurrentSession = async () => {
      try {
        if (isSupabaseConfigured()) {
          const { data } = await supabase.auth.getSession();
          if (data?.session?.user) {
            const user = data.session.user;
            const meta = user.user_metadata || {};
            const userRole = (meta.role as Role) || 'doctor';
            if (isMounted) {
              setProfile({
                id: user.id,
                email: user.email || '',
                full_name: meta.full_name || 'Dr. ' + (user.email?.split('@')[0] || 'Clinician'),
                role: userRole,
                specialty: meta.specialty || 'General Medicine',
                points: 120,
                avatar_color: '#0ea5e9',
              });
              setRole(userRole);
              setIsAuthenticated(true);
              setAuthChecking(false);
            }
            return;
          }
        }

        const storedDemo = localStorage.getItem('antisteward_demo_session');
        if (storedDemo) {
          const parsed = JSON.parse(storedDemo) as Profile;
          if (parsed && parsed.id && parsed.full_name) {
            if (isMounted) {
              setProfile(parsed);
              setRole(parsed.role || 'doctor');
              setIsAuthenticated(true);
              setAuthChecking(false);
            }
            return;
          }
        }
      } catch {
        /* ignore session load failure */
      }

      if (isMounted) {
        setIsAuthenticated(false);
        setAuthChecking(false);
      }
    };

    void checkCurrentSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const user = session.user;
        const meta = user.user_metadata || {};
        const userRole = (meta.role as Role) || 'doctor';
        if (isMounted) {
          setProfile({
            id: user.id,
            email: user.email || '',
            full_name: meta.full_name || 'Dr. ' + (user.email?.split('@')[0] || 'Clinician'),
            role: userRole,
            specialty: meta.specialty || 'General Medicine',
            points: 120,
            avatar_color: '#0ea5e9',
          });
          setRole(userRole);
          setIsAuthenticated(true);
        }
      } else if (event === 'SIGNED_OUT') {
        if (isMounted) {
          setIsAuthenticated(false);
          try {
            localStorage.removeItem('antisteward_demo_session');
          } catch {
            /* ignore */
          }
        }
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const loadData = async () => {
    setLoading(true);

    if (isSupabaseConfigured()) {
      try {
        const [patientRes, prescriptionRes, reviewRes, alertRes, questionRes] = await Promise.all([
          supabase.from('patients').select('*').order('created_at'),
          supabase.from('prescriptions').select('*, patient:patients(*), prescriber:profiles(*)').order('created_at', { ascending: false }),
          supabase.from('case_reviews').select('*, prescription:prescriptions(*, patient:patients(*))').order('created_at', { ascending: false }),
          supabase.from('alerts').select('*, patient:patients(*), prescription:prescriptions(*)').order('created_at', { ascending: false }),
          supabase.from('quiz_questions').select('*').order('created_at'),
        ]);

        if (patientRes.data && patientRes.data.length > 0) {
          setPatients(patientRes.data);
          setPrescriptions(prescriptionRes.data ?? []);
          setReviews(reviewRes.data ?? []);
          setAlerts(alertRes.data ?? []);
          setQuestions(questionRes.data ?? initialQuestions);
          setIsLiveBackend(true);
          setLoading(false);
          return;
        }
      } catch {
        // Fall back gracefully to local clinical dataset
      }
    }

    // Local / Demo Mode with LocalStorage persistence
    setIsLiveBackend(false);
    try {
      const storedPatients = localStorage.getItem('ams_patients');
      const storedRx = localStorage.getItem('ams_prescriptions');
      const storedReviews = localStorage.getItem('ams_reviews');
      const storedAlerts = localStorage.getItem('ams_alerts');

      setPatients(storedPatients ? JSON.parse(storedPatients) : initialPatients);
      setPrescriptions(storedRx ? JSON.parse(storedRx) : initialPrescriptions);
      setReviews(storedReviews ? JSON.parse(storedReviews) : initialReviews);
      setAlerts(storedAlerts ? JSON.parse(storedAlerts) : initialAlerts);
      setQuestions(initialQuestions);
    } catch {
      setPatients(initialPatients);
      setPrescriptions(initialPrescriptions);
      setReviews(initialReviews);
      setAlerts(initialAlerts);
      setQuestions(initialQuestions);
    }

    setLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const switchRole = (nextRole: Role) => {
    setRole(nextRole);
    setProfile((prev) => ({
      ...prev,
      role: nextRole,
    }));
  };

  const handleLogout = async () => {
    try {
      if (isSupabaseConfigured()) {
        await supabase.auth.signOut();
      }
    } catch {
      /* ignore signout network error */
    }
    try {
      localStorage.removeItem('antisteward_demo_session');
    } catch {
      /* ignore storage error */
    }
    setIsAuthenticated(false);
    setProfile(demoProfile('doctor'));
    setRole('doctor');
    setPage('overview');
  };

  const handlePrescriptionSaved = async (newRx: Prescription) => {
    const updated = [newRx, ...prescriptions];
    setPrescriptions(updated);
    try {
      localStorage.setItem('ams_prescriptions', JSON.stringify(updated));
    } catch {
      /* ignore storage errors */
    }
  };

  const handleReviewUpdated = async (reviewId: string, decision: string) => {
    const updated = reviews.map((r) =>
      r.id === reviewId ? { ...r, decision, reviewed_at: new Date().toISOString() } : r
    );
    setReviews(updated);
    try {
      localStorage.setItem('ams_reviews', JSON.stringify(updated));
    } catch {
      /* ignore storage errors */
    }
  };

  const handleAlertResolved = async (alertId: string) => {
    const updated = alerts.map((a) =>
      a.id === alertId ? { ...a, is_resolved: true, resolved_at: new Date().toISOString() } : a
    );
    setAlerts(updated);
    try {
      localStorage.setItem('ams_alerts', JSON.stringify(updated));
    } catch {
      /* ignore storage errors */
    }
  };

  const unresolvedAlerts = alerts.filter((alert) => !alert.is_resolved);
  const pendingReviews = reviews.filter((review) => review.decision === 'pending');

  const content = () => {
    if (loading) return <LoadingState />;
    switch (page) {
      case 'overview':
        return (
          <Overview
            profile={profile}
            role={role}
            prescriptions={prescriptions}
            reviews={reviews}
            alerts={alerts}
            patients={patients}
            onNavigate={setPage}
          />
        );
      case 'prescriptions':
        return (
          <Prescriptions
            prescriptions={prescriptions}
            patients={patients}
            profile={profile}
            onSaved={handlePrescriptionSaved}
            onRefresh={loadData}
          />
        );
      case 'reviews':
        return (
          <Reviews
            reviews={reviews}
            onReviewUpdated={handleReviewUpdated}
            onRefresh={loadData}
          />
        );
      case 'alerts':
        return (
          <Alerts
            alerts={alerts}
            onAlertResolved={handleAlertResolved}
            onRefresh={loadData}
          />
        );
      case 'learning':
        return <Learning questions={questions} profile={profile} />;
      case 'leaderboard':
        return <Leaderboard profile={profile} />;
      case 'analytics':
        return <Analytics prescriptions={prescriptions} />;
      case 'lab-report':
        return <LabReportInterpreter />;
    }
  };

  if (authChecking) {
    return <LoadingState />;
  }

  if (!isAuthenticated) {
    return (
      <AuthScreen
        onAuthenticated={(userProfile) => {
          setProfile(userProfile);
          setRole(userProfile.role || 'doctor');
          setIsAuthenticated(true);
        }}
        darkMode={darkMode}
      />
    );
  }

  return (
    <div className={`app-shell ${darkMode ? 'dark-theme' : ''}`}>
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">
            <ShieldCheck size={21} />
          </div>
          <div>
            <strong>AntiSteward</strong>
            <span>Clinical intelligence</span>
          </div>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <nav>
          {navItems.map((item) => {
            const Icon = item.icon;
            const count =
              item.id === 'alerts'
                ? unresolvedAlerts.length
                : item.id === 'reviews'
                ? pendingReviews.length
                : 0;
            return (
              <button
                key={item.id}
                className={`nav-item ${page === item.id ? 'active' : ''}`}
                onClick={() => {
                  setPage(item.id);
                  setSidebarOpen(false);
                }}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {count > 0 && <b>{count}</b>}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="protocol-card">
            <div className="protocol-icon">
              <Activity size={17} />
            </div>
            <div>
              <strong>Protocol status</strong>
              <span>Antibiogram 2026</span>
            </div>
            <Check size={16} className="protocol-check" />
          </div>
          <button className="support-link">
            <FlaskConical size={16} /> Stewardship guidelines
          </button>
          <button
            className="support-link"
            style={{ marginTop: '4px', color: '#e07662' }}
            onClick={handleLogout}
            aria-label="Sign out"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <button
            className="mobile-menu"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle menu"
          >
            <Menu size={21} />
          </button>
          <div className="breadcrumb">
            <span>AntiSteward</span>
            <ChevronRight size={14} />
            <strong>{navItems.find((item) => item.id === page)?.label}</strong>
          </div>
          <div className="top-actions">
            <div
              className={`backend-badge ${isLiveBackend ? 'live' : 'demo'}`}
              title={
                isLiveBackend
                  ? 'Connected to live Supabase database'
                  : 'Operating in reliable clinical demonstration mode'
              }
            >
              {isLiveBackend ? <Database size={13} /> : <WifiOff size={13} />}
              <span>{isLiveBackend ? 'Live Supabase' : 'Clinical Demo'}</span>
            </div>
            <button
              className="theme-toggle"
              onClick={() => setDarkMode(!darkMode)}
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? <Sun size={17} /> : <Moon size={17} />}
              <span>{darkMode ? 'Light' : 'Dark'}</span>
            </button>
            <button
              className="icon-button"
              onClick={() => setPage('alerts')}
              aria-label="View alerts"
            >
              <Bell size={19} />
              {unresolvedAlerts.length > 0 && <i>{unresolvedAlerts.length}</i>}
            </button>
            <div className="role-switch">
              <button
                className={role === 'doctor' ? 'selected' : ''}
                onClick={() => switchRole('doctor')}
              >
                <Stethoscope size={14} /> Doctor
              </button>
              <button
                className={role === 'admin' ? 'selected' : ''}
                onClick={() => switchRole('admin')}
              >
                <ShieldCheck size={14} /> Admin
              </button>
            </div>
            <div className="profile-chip">
              <div className="avatar" style={{ background: profile.avatar_color }}>
                {profile.full_name
                  .split(' ')
                  .slice(1)
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)}
              </div>
              <div>
                <strong>{profile.full_name.replace('Dr. ', '')}</strong>
                <span>{profile.specialty}</span>
              </div>
            </div>
            <button
              className="logout-button"
              onClick={handleLogout}
              title="Sign out of clinical session"
              aria-label="Sign out"
            >
              <LogOut size={14} />
              <span>Sign out</span>
            </button>
          </div>
        </header>
        <div className="page-content">{content()}</div>
      </main>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="loading-screen">
      <div className="loading-ring" />
      <p>Loading clinical workspace...</p>
    </div>
  );
}

function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  meta,
  tone,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  meta: string;
  tone: string;
}) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}>
        <Icon size={19} />
      </div>
      <div className="stat-content">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{meta}</small>
      </div>
    </div>
  );
}

function Badge({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

function Overview({
  profile,
  role,
  prescriptions,
  reviews,
  alerts,
  patients,
  onNavigate,
}: {
  profile: Profile;
  role: Role;
  prescriptions: Prescription[];
  reviews: CaseReview[];
  alerts: Alert[];
  patients: Patient[];
  onNavigate: (page: Page) => void;
}) {
  const highAlerts = alerts.filter(
    (a) => !a.is_resolved && ['high', 'critical'].includes(a.severity)
  );
  const active = prescriptions.filter((p) => p.status === 'active');
  const pendingReviewCount = reviews.filter((r) => r.decision === 'pending').length;

  return (
    <div className="fade-in">
      <PageHeader
        eyebrow="MONDAY, 24 AUGUST 2026"
        title={`Good morning, ${profile.full_name.split(' ')[1]}.`}
        subtitle={
          role === 'admin'
            ? 'Here is your hospital-wide stewardship pulse for today.'
            : 'Here is your clinical stewardship pulse for today.'
        }
        action={
          <button className="primary-button" onClick={() => onNavigate('prescriptions')}>
            <Plus size={17} /> New prescription
          </button>
        }
      />
      <div className="stat-grid">
        <StatCard
          icon={Pill}
          label="Active prescriptions"
          value={String(active.length).padStart(2, '0')}
          meta={`${active.filter((p) => p.is_restricted).length} restricted agents`}
          tone="blue"
        />
        <StatCard
          icon={AlertTriangle}
          label="Open alerts"
          value={String(alerts.filter((a) => !a.is_resolved).length).padStart(2, '0')}
          meta={`${highAlerts.length} high priority`}
          tone="orange"
        />
        <StatCard
          icon={ClipboardList}
          label="Cases awaiting review"
          value={String(pendingReviewCount).padStart(2, '0')}
          meta="Average response 1.8h"
          tone="teal"
        />
        <StatCard
          icon={Target}
          label="Days of therapy"
          value="4.6"
          meta="↓ 8.2% vs last month"
          tone="green"
        />
      </div>
      <div className="dashboard-grid">
        <section className="panel priority-panel">
          <div className="panel-heading">
            <div>
              <h2>Priority actions</h2>
              <p>Cases requiring clinical attention</p>
            </div>
            <button className="text-button" onClick={() => onNavigate('reviews')}>
              View all <ChevronRight size={15} />
            </button>
          </div>
          {highAlerts.slice(0, 3).map((alert) => (
            <button
              className="priority-row"
              key={alert.id}
              onClick={() => onNavigate('alerts')}
            >
              <div className={`priority-dot ${alert.severity}`}>
                <AlertTriangle size={16} />
              </div>
              <div className="priority-info">
                <strong>{alert.patient?.name ?? 'Patient case'}</strong>
                <span>
                  {alert.alert_type} · {alert.message}
                </span>
              </div>
              <Badge tone={alert.severity}>{alert.severity}</Badge>
              <ChevronRight size={16} className="row-chevron" />
            </button>
          ))}
          {highAlerts.length === 0 && (
            <EmptyState icon={Check} text="No high-priority actions right now" />
          )}
        </section>
        <section className="panel snapshot-panel">
          <div className="panel-heading">
            <div>
              <h2>Stewardship snapshot</h2>
              <p>Last 30 days across hospital</p>
            </div>
            <button className="more-button" aria-label="More options">
              •••
            </button>
          </div>
          <div className="donut-wrap">
            <div className="donut">
              <div>
                <strong>72%</strong>
                <span>appropriate</span>
              </div>
            </div>
            <div className="legend">
              <div>
                <i className="dot dot-blue" />
                Appropriate <strong>72%</strong>
              </div>
              <div>
                <i className="dot dot-teal" />
                Modified <strong>18%</strong>
              </div>
              <div>
                <i className="dot dot-orange" />
                Discontinued <strong>10%</strong>
              </div>
            </div>
          </div>
          <div className="snapshot-footer">
            <span>
              <span className="trend-up">↑ 6.4%</span> improvement
            </span>
            <button className="text-button" onClick={() => onNavigate('analytics')}>
              Full analytics <ChevronRight size={15} />
            </button>
          </div>
        </section>
      </div>
      <div className="dashboard-grid lower">
        <section className="panel activity-panel">
          <div className="panel-heading">
            <div>
              <h2>Recent activity</h2>
              <p>Latest clinical stewardship events</p>
            </div>
            <button className="text-button" onClick={() => onNavigate('reviews')}>
              See history <ChevronRight size={15} />
            </button>
          </div>
          <div className="activity-list">
            <ActivityRow
              icon={Check}
              color="green"
              title="Targeted de-escalation initiated"
              detail="Sofia Martinez · Switched to Ceftriaxone based on culture"
              time="12 min ago"
            />
            <ActivityRow
              icon={FilePlus2}
              color="blue"
              title="New prescription submitted"
              detail="John Miller · Meropenem 1 g IV"
              time="38 min ago"
            />
            <ActivityRow
              icon={Bell}
              color="orange"
              title="Renal clearance alert flagged"
              detail="John Miller · Cr 1.8 mg/dL dosing consultation required"
              time="1 hr ago"
            />
            <ActivityRow
              icon={BookOpen}
              color="teal"
              title="Continuing education module completed"
              detail="Dr. Sarah Chen · 4/4 correct on Stewardship Quiz"
              time="2 hrs ago"
            />
          </div>
        </section>
        <section className="panel quick-panel">
          <div className="panel-heading">
            <div>
              <h2>Quick access</h2>
              <p>Standard stewardship workflows</p>
            </div>
          </div>
          <div className="quick-grid">
            <button onClick={() => onNavigate('prescriptions')}>
              <FilePlus2 size={19} />
              <span>Enter prescription</span>
              <ChevronRight size={15} />
            </button>
            <button onClick={() => onNavigate('reviews')}>
              <ClipboardList size={19} />
              <span>Review a case</span>
              <ChevronRight size={15} />
            </button>
            <button onClick={() => onNavigate('lab-report')}>
              <FileText size={19} />
              <span>Interpret lab report</span>
              <ChevronRight size={15} />
            </button>
            <button onClick={() => onNavigate('learning')}>
              <BookOpen size={19} />
              <span>Practice quiz</span>
              <ChevronRight size={15} />
            </button>
          </div>
        </section>
      </div>
      <div className="data-footnote">
        <Users size={14} /> {patients.length} active patient records <span>•</span>{' '}
        <ShieldCheck size={14} /> Decision support for clinical stewardship only
      </div>
    </div>
  );
}

function ActivityRow({
  icon: Icon,
  color,
  title,
  detail,
  time,
}: {
  icon: typeof Check;
  color: string;
  title: string;
  detail: string;
  time: string;
}) {
  return (
    <div className="activity-row">
      <div className={`activity-icon ${color}`}>
        <Icon size={15} />
      </div>
      <div>
        <strong>{title}</strong>
        <span>{detail}</span>
      </div>
      <time>{time}</time>
    </div>
  );
}

function LabReportInterpreter() {
  const [tab, setTab] = useState<'upload' | 'text' | 'audio'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [reportText, setReportText] = useState('');
  const [audioText, setAudioText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzedResult, setAnalyzedResult] = useState<LabInterpretationResult | null>(null);
  const [recording, setRecording] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [simple, setSimple] = useState(false);

  const analyze = () => {
    const textToAnalyze = tab === 'text' ? reportText : tab === 'audio' ? audioText : file ? `File analysis: ${file.name}\n${reportText || sampleReports[0].text}` : reportText;
    if (!textToAnalyze.trim()) return;

    setAnalyzing(true);
    setAnalyzedResult(null);

    window.setTimeout(() => {
      const result = interpretReport(textToAnalyze);
      setAnalyzedResult(result);
      setAnalyzing(false);
    }, 900);
  };

  const loadSample = (sample: typeof sampleReports[0]) => {
    setTab('text');
    setReportText(sample.text);
    setAnalyzedResult(null);
  };

  const startRecording = () => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      setAudioText('Speech recognition is not supported in this browser. Please type or paste your report text instead.');
      return;
    }
    const recognition = new SpeechRec();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      let text = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
      }
      setAudioText((prev) => `${prev} ${text}`.trim());
    };

    recognition.onend = () => setRecording(false);
    recognition.onerror = () => setRecording(false);
    recognition.start();
    setRecording(true);
  };

  const listen = () => {
    if (!('speechSynthesis' in window)) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    const textToSpeak = simple
      ? analyzedResult?.simpleSummary || 'Lab report analysis complete.'
      : analyzedResult?.summary || 'Lab report analysis complete.';

    const u = new SpeechSynthesisUtterance(textToSpeak);
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    setSpeaking(true);
  };

  return (
    <div className="fade-in">
      <PageHeader
        eyebrow="AI ANTIMICROBIAL STEWARDSHIP"
        title="AI Lab Report Interpreter"
        subtitle="Analyze microbiology culture, AST susceptibility panels, and lab results in clear clinical language."
      />
      <section className="lab-hero">
        <div>
          <div className="lab-hero-icon">
            <Sparkles size={22} />
          </div>
          <div>
            <h2>Microbiology & Susceptibility Interpreter</h2>
            <p>
              Paste, upload, or speak a culture sensitivity report. The AI identifies pathogens and detects Sensitive,
              Resistant, and Intermediate antibiotics with stewardship recommendations.
            </p>
          </div>
        </div>
        <span className="lab-safe">
          <ShieldCheck size={15} /> Clinical decision support
        </span>
      </section>

      <div className="sample-buttons">
        <span style={{ fontSize: '11px', color: '#7a8e9b', display: 'flex', alignItems: 'center', fontWeight: 600 }}>
          Quick demo:
        </span>
        {sampleReports.map((s) => (
          <button
            key={s.id}
            type="button"
            className="sample-chip"
            onClick={() => loadSample(s)}
          >
            Load {s.label}
          </button>
        ))}
      </div>

      <div className="lab-tabs">
        {(
          [
            ['upload', Upload, 'Upload Report', 'PDF, JPG, PNG'],
            ['text', FileText, 'Enter as Text', 'Paste culture/AST results'],
            ['audio', Mic, 'Audio Report', 'Dictate or upload audio'],
          ] as const
        ).map(([id, Icon, label, hint]) => (
          <button
            key={id}
            className={tab === id ? 'active' : ''}
            onClick={() => setTab(id)}
          >
            <Icon size={18} />
            <span>{label}</span>
            <small>{hint}</small>
          </button>
        ))}
      </div>

      <section className="panel lab-input-panel">
        {tab === 'upload' && (
          <div className="lab-drop">
            <Upload size={30} />
            <h3>Drop your culture or lab report here</h3>
            <p>PDF, JPG, PNG or plain text · Max 10 MB</p>
            <label className="primary-button">
              <Upload size={16} /> Choose file
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.txt"
                hidden
                onChange={(e) => {
                  const selectedFile = e.target.files?.[0] ?? null;
                  setFile(selectedFile);
                  if (selectedFile && selectedFile.type.includes('text')) {
                    const reader = new FileReader();
                    reader.onload = (ev) => setReportText(String(ev.target?.result ?? ''));
                    reader.readAsText(selectedFile);
                  }
                }}
              />
            </label>
            {file && (
              <div className="selected-file">
                <FileText size={17} />
                <span>{file.name}</span>
                <CheckCircle2 size={16} />
              </div>
            )}
          </div>
        )}
        {tab === 'text' && (
          <div className="lab-text">
            <label>Paste culture & sensitivity or lab report text...</label>
            <textarea
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              placeholder={`Example:\nCulture and Sensitivity Report\nOrganism Isolated: Escherichia coli\n\nCeftriaxone    Sensitive\nNitrofurantoin Sensitive\nAmpicillin     Resistant\nCiprofloxacin  Resistant`}
            />
            <small>
              Supports microbiology culture reports (organism + S/R/I marks) and routine blood panels.
            </small>
          </div>
        )}
        {tab === 'audio' && (
          <div className="audio-box">
            <div className={`mic-circle ${recording ? 'recording' : ''}`}>
              <Mic size={30} />
            </div>
            <h3>{recording ? 'Listening to report...' : 'Dictate your report findings'}</h3>
            <p>Use speech recognition or upload an audio file to transcribe.</p>
            <div className="audio-actions">
              <button
                className={recording ? 'secondary-button' : 'primary-button'}
                onClick={recording ? () => setRecording(false) : startRecording}
              >
                {recording ? <Square size={15} /> : <Mic size={15} />}
                {recording ? 'Stop recording' : 'Record with microphone'}
              </button>
              <label className="secondary-button">
                <Upload size={15} /> Load sample audio transcript
                <input
                  type="file"
                  accept="audio/*"
                  hidden
                  onChange={(e) => {
                    const name = e.target.files?.[0]?.name ?? '';
                    setAudioText(
                      `Audio transcription of ${name}: Urine culture confirms Escherichia coli susceptible to Nitrofurantoin and Ceftriaxone, resistant to Ciprofloxacin.`
                    );
                  }}
                />
              </label>
            </div>
            {audioText && (
              <div className="transcript">
                <strong>Transcribed text</strong>
                <span>{audioText}</span>
              </div>
            )}
          </div>
        )}
        <button
          className="analyze-button"
          disabled={
            analyzing ||
            (tab === 'upload' && !file && !reportText.trim()) ||
            (tab === 'text' && !reportText.trim()) ||
            (tab === 'audio' && !audioText.trim() && !recording)
          }
          onClick={analyze}
        >
          {analyzing ? (
            <>
              <span className="mini-spinner" /> Analyzing report...
            </>
          ) : (
            <>
              <Sparkles size={17} /> Analyze Report
            </>
          )}
        </button>
      </section>

      {analyzedResult && (
        <section className="lab-results fade-in">
          <div className="results-head">
            <div>
              <div className="eyebrow">
                {analyzedResult.isCultureReport ? 'MICROBIOLOGY ANALYSIS' : 'LABORATORY ANALYSIS'}
              </div>
              <h2>
                {analyzedResult.isCultureReport
                  ? analyzedResult.organisms.join(', ') || 'Antimicrobial Susceptibility Findings'
                  : 'Diagnostic Summary'}
              </h2>
              <p>
                {analyzedResult.isCultureReport
                  ? 'Color-coded susceptibility profile per Clinical and Laboratory Standards Institute (CLSI).'
                  : 'Processed educational interpretation of lab report values.'}
              </p>
            </div>
            <button className="secondary-button" onClick={() => setSimple(!simple)}>
              <Sparkles size={16} />
              {simple ? 'Show clinical wording' : 'Explain in Simple Language'}
            </button>
          </div>

          <div className="result-alerts">
            <div className="result-alert normal">
              <CheckCircle2 />
              <div>
                <strong>Sensitive / Recommended Agents</strong>
                <span>
                  {analyzedResult.results.filter((r) => r.status === 'Sensitive').map((r) => r.drug).join(', ') ||
                    'Within normal range'}
                </span>
              </div>
            </div>
            <div className="result-alert important">
              <AlertTriangle />
              <div>
                <strong>Resistant / Avoid</strong>
                <span>
                  {analyzedResult.results.filter((r) => r.status === 'Resistant').map((r) => r.drug).join(', ') ||
                    'No high resistance detected'}
                </span>
              </div>
            </div>
            <div className="result-alert attention">
              <AlertCircle />
              <div>
                <strong>Intermediate / Caution</strong>
                <span>
                  {analyzedResult.results.filter((r) => r.status === 'Intermediate').map((r) => r.drug).join(', ') ||
                    'No intermediate response noted'}
                </span>
              </div>
            </div>
          </div>

          <section className="panel result-table-panel">
            <div className="panel-heading">
              <div>
                <h2>Susceptibility & Parameter Matrix</h2>
                <p>Specific findings identified from report text</p>
              </div>
            </div>
            <div className="result-table">
              <div className="result-row header">
                <span>Drug / Parameter</span>
                <span>Susceptibility</span>
                <span>Clinical Interpretation</span>
                <span>Stewardship Status</span>
                <span>Action / Guidance</span>
              </div>
              {analyzedResult.results.map((r) => (
                <div className="result-row" key={r.drug}>
                  <strong>{r.drug}</strong>
                  <b className={`status-pill ${r.tone}`}>{r.status}</b>
                  <span>{r.clinicalNote}</span>
                  <span>
                    {r.status === 'Sensitive'
                      ? 'First-line targeted choice'
                      : r.status === 'Resistant'
                      ? 'Contraindicated / Ineffective'
                      : 'Requires dose adjustment or alternative'}
                  </span>
                  <span>
                    {r.status === 'Sensitive'
                      ? 'Targeted therapy eligible'
                      : r.status === 'Resistant'
                      ? 'Discontinue if empirical'
                      : 'Use with ID guidance'}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <div className="understand-grid">
            <section className="panel explain-card">
              <div className="card-icon">
                <Sparkles size={18} />
              </div>
              <h3>What does this report mean?</h3>
              <p>{simple ? analyzedResult.simpleSummary : analyzedResult.summary}</p>
            </section>
            <section className="panel explain-card">
              <div className="card-icon">
                <Stethoscope size={18} />
              </div>
              <h3>Stewardship Recommendation</h3>
              <p>
                {analyzedResult.recommendations[0] ||
                  'Consult local hospital antibiogram and transition to oral therapy once clinically stable.'}
              </p>
            </section>
            <section className="panel explain-card">
              <div className="card-icon">
                <Target size={18} />
              </div>
              <h3>Monitoring Strategy</h3>
              <p>
                {analyzedResult.recommendations[1] ||
                  'Reassess patient response at 48 hours and verify source control.'}
              </p>
            </section>
          </div>

          <section className="panel listen-card">
            <div>
              <div className="card-icon">
                <Volume2 size={18} />
              </div>
              <div>
                <h3>Audio Clinical Briefing</h3>
                <p>Listen to the plain-language summary aloud via Web Speech API.</p>
              </div>
            </div>
            <button className="primary-button" onClick={listen}>
              {speaking ? (
                <>
                  <Pause size={16} /> Stop audio
                </>
              ) : (
                <>
                  <Volume2 size={16} /> Listen to Briefing
                </>
              )}
            </button>
          </section>

          <div className="medical-notice">
            <AlertTriangle size={18} />
            <div>
              <strong>Clinical decision support notice</strong>
              <span>
                This AI interpretation is designed to assist healthcare professionals in applying antimicrobial stewardship
                principles. Always verify laboratory MIC values and patient clinical context before changing therapy.
              </span>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, text }: { icon: typeof Check; text: string }) {
  return (
    <div className="empty-state">
      <Icon size={21} />
      <span>{text}</span>
    </div>
  );
}

function Prescriptions({
  prescriptions,
  patients,
  profile,
  onSaved,
  onRefresh,
}: {
  prescriptions: Prescription[];
  patients: Patient[];
  profile: Profile;
  onSaved: (rx: Prescription) => Promise<void>;
  onRefresh: () => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<Prescription | null>(null);

  const filtered = prescriptions.filter(
    (p) =>
      (filter === 'all' || p.status === filter) &&
      `${p.drug_name} ${p.patient?.name ?? ''} ${p.indication}`
        .toLowerCase()
        .includes(search.toLowerCase())
  );

  return (
    <div className="fade-in">
      <PageHeader
        eyebrow="CLINICAL WORKFLOW"
        title="Prescriptions"
        subtitle="Review antimicrobial therapy, restricted drug authorizations, and submit new orders."
        action={
          <button className="primary-button" onClick={() => setShowForm(true)}>
            <Plus size={17} /> New prescription
          </button>
        }
      />
      <div className="toolbar">
        <div className="search-box">
          <Search size={17} />
          <input
            placeholder="Search patient, drug, or indication"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-tabs">
          {['all', 'active', 'completed'].map((item) => (
            <button
              key={item}
              className={filter === item ? 'active' : ''}
              onClick={() => setFilter(item)}
            >
              {item[0].toUpperCase() + item.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <section className="panel table-panel">
        <div className="table-caption">
          <div>
            <h2>Antimicrobial orders</h2>
            <p>{filtered.length} records · updated moments ago</p>
          </div>
          <div className="table-caption-right">
            <Badge tone="info">Live clinical workspace</Badge>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>PATIENT</th>
                <th>ANTIMICROBIAL</th>
                <th>REGIMEN</th>
                <th>INDICATION</th>
                <th>STATUS</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} onClick={() => setSelected(p)}>
                  <td>
                    <div className="patient-cell">
                      <div className="patient-avatar">
                        {p.patient?.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('') || 'PT'}
                      </div>
                      <div>
                        <strong>{p.patient?.name || 'Assigned Patient'}</strong>
                        <span>
                          {p.patient?.mrn || 'MRN-Pending'} · {p.patient?.ward || 'General'}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <strong className="drug-name">{p.drug_name}</strong>
                    {p.is_restricted && <Badge tone="restricted">Restricted</Badge>}
                  </td>
                  <td>
                    <span className="regimen">
                      {p.dose} · {p.route} · {p.frequency}
                    </span>
                    <small>{p.duration_days} day course</small>
                  </td>
                  <td>
                    <span className="indication">{p.indication}</span>
                  </td>
                  <td>
                    <Badge tone={p.status === 'active' ? 'success' : 'neutral'}>
                      {p.status}
                    </Badge>
                  </td>
                  <td>
                    <ChevronRight size={16} className="row-chevron" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {showForm && (
        <PrescriptionForm
          patients={patients}
          profile={profile}
          onClose={() => setShowForm(false)}
          onSaved={async (newRx) => {
            setShowForm(false);
            await onSaved(newRx);
            await onRefresh();
          }}
        />
      )}

      {selected && (
        <PrescriptionDetail
          prescription={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function PrescriptionForm({
  patients,
  profile,
  onClose,
  onSaved,
}: {
  patients: Patient[];
  profile: Profile;
  onClose: () => void;
  onSaved: (rx: Prescription) => Promise<void>;
}) {
  const [form, setForm] = useState({
    patient_id: patients[0]?.id || '',
    drug_name: '',
    dose: '',
    route: 'IV',
    frequency: 'q8h',
    duration_days: 7,
    indication: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const update = (key: string, value: string | number) =>
    setForm({ ...form, [key]: value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patient_id) {
      setError('Please select a patient.');
      return;
    }
    setSaving(true);
    setError('');

    const isRestricted = [
      'meropenem',
      'vancomycin',
      'cefepime',
      'piperacillin-tazobactam',
      'ertapenem',
      'linezolid',
      'colistin',
    ].includes(form.drug_name.toLowerCase());

    const patientObj = patients.find((p) => p.id === form.patient_id);

    const newRx: Prescription = {
      id: `rx-${Date.now()}`,
      patient_id: form.patient_id,
      prescriber_id: profile.id,
      drug_name: form.drug_name,
      dose: form.dose,
      route: form.route,
      frequency: form.frequency,
      duration_days: form.duration_days,
      indication: form.indication,
      status: 'active',
      is_restricted: isRestricted,
      restriction_reason: isRestricted ? 'Restricted broad-spectrum antimicrobial order' : '',
      created_at: new Date().toISOString(),
      patient: patientObj,
      prescriber: profile,
    };

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('prescriptions').insert({
          patient_id: form.patient_id,
          prescriber_id: null, // Avoid UUID constraint issues for synthetic profiles
          drug_name: form.drug_name,
          dose: form.dose,
          route: form.route,
          frequency: form.frequency,
          duration_days: form.duration_days,
          indication: form.indication,
          status: 'active',
          is_restricted: isRestricted,
          restriction_reason: newRx.restriction_reason,
        });
      } catch {
        // Continue to save locally
      }
    }

    await onSaved(newRx);
    setSaving(false);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          <div>
            <div className="eyebrow">NEW ANTIMICROBIAL ORDER</div>
            <h2>Enter prescription</h2>
            <p>Submit a new antimicrobial prescription with dosage and indication.</p>
          </div>
          <button className="close-button" onClick={onClose} aria-label="Close modal">
            <X size={19} />
          </button>
        </div>
        <form onSubmit={submit}>
          <label>
            Patient
            <select
              required
              value={form.patient_id}
              onChange={(e) => update('patient_id', e.target.value)}
            >
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.name} · {patient.mrn} ({patient.ward})
                </option>
              ))}
            </select>
          </label>
          <div className="form-grid">
            <label>
              Antimicrobial
              <input
                required
                placeholder="e.g. Ceftriaxone, Meropenem"
                value={form.drug_name}
                onChange={(e) => update('drug_name', e.target.value)}
              />
            </label>
            <label>
              Clinical Indication
              <input
                required
                placeholder="e.g. Hospital-Acquired Pneumonia"
                value={form.indication}
                onChange={(e) => update('indication', e.target.value)}
              />
            </label>
          </div>
          <div className="form-grid three">
            <label>
              Dose
              <input
                required
                placeholder="e.g. 1 g, 4.5 g"
                value={form.dose}
                onChange={(e) => update('dose', e.target.value)}
              />
            </label>
            <label>
              Route
              <select value={form.route} onChange={(e) => update('route', e.target.value)}>
                <option value="IV">IV</option>
                <option value="PO">PO (Oral)</option>
                <option value="IM">IM</option>
              </select>
            </label>
            <label>
              Frequency
              <select
                value={form.frequency}
                onChange={(e) => update('frequency', e.target.value)}
              >
                <option value="daily">daily</option>
                <option value="q12h">q12h</option>
                <option value="q8h">q8h</option>
                <option value="q6h">q6h</option>
                <option value="q4h">q4h</option>
              </select>
            </label>
          </div>
          <label>
            Duration (days)
            <input
              type="number"
              min="1"
              max="60"
              value={form.duration_days}
              onChange={(e) => update('duration_days', Number(e.target.value))}
            />
          </label>
          {error && <div className="form-error">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose}>
              Cancel
            </button>
            <button className="primary-button" disabled={saving}>
              {saving ? 'Saving order...' : 'Submit prescription'}
              <ChevronRight size={16} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PrescriptionDetail({
  prescription,
  onClose,
}: {
  prescription: Prescription;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop">
      <div className="modal detail-modal">
        <div className="modal-header">
          <div>
            <Badge tone={prescription.status === 'active' ? 'success' : 'neutral'}>
              {prescription.status}
            </Badge>
            <h2>{prescription.drug_name}</h2>
            <p>
              {prescription.dose} · {prescription.route} · {prescription.frequency}
            </p>
          </div>
          <button className="close-button" onClick={onClose} aria-label="Close modal">
            <X size={19} />
          </button>
        </div>
        <div className="detail-section">
          <h3>Patient Profile</h3>
          <div className="detail-patient">
            <div className="patient-avatar large">
              {prescription.patient?.name
                .split(' ')
                .map((n) => n[0])
                .join('') || 'PT'}
            </div>
            <div>
              <strong>{prescription.patient?.name}</strong>
              <span>
                {prescription.patient?.age} yrs ·{' '}
                {prescription.patient?.sex === 'F' ? 'Female' : 'Male'} ·{' '}
                {prescription.patient?.ward}
              </span>
              <span>{prescription.patient?.diagnosis}</span>
            </div>
          </div>
        </div>
        <div className="detail-grid">
          <div>
            <span>INDICATION</span>
            <strong>{prescription.indication}</strong>
          </div>
          <div>
            <span>PLANNED COURSE</span>
            <strong>{prescription.duration_days} days</strong>
          </div>
          <div>
            <span>WEIGHT</span>
            <strong>{prescription.patient?.weight_kg} kg</strong>
          </div>
          <div>
            <span>SERUM CREATININE</span>
            <strong>{prescription.patient?.creatinine_mg_dl} mg/dL</strong>
          </div>
        </div>
        {prescription.patient?.allergy_notes && (
          <div className="allergy-note">
            <AlertTriangle size={16} />
            <div>
              <strong>Allergy record on file</strong>
              <span>{prescription.patient.allergy_notes}</span>
            </div>
          </div>
        )}
        {prescription.is_restricted && (
          <div className="notes-block">
            <span>RESTRICTION PROTOCOL</span>
            <p>{prescription.restriction_reason || 'Requires ID specialist authorization within 48h.'}</p>
          </div>
        )}
        <button className="secondary-button full" onClick={onClose}>
          Close record
        </button>
      </div>
    </div>
  );
}

function Reviews({
  reviews,
  onReviewUpdated,
  onRefresh,
}: {
  reviews: CaseReview[];
  onReviewUpdated: (reviewId: string, decision: string) => Promise<void>;
  onRefresh: () => Promise<void>;
}) {
  const [selected, setSelected] = useState<CaseReview | null>(reviews[0] ?? null);
  const pending = reviews.filter((r) => r.decision === 'pending');

  return (
    <div className="fade-in">
      <PageHeader
        eyebrow="STEWARDSHIP WORKFLOW"
        title="Case reviews"
        subtitle="AI-assisted review queue for antimicrobial decisions and de-escalation opportunities."
        action={
          <div className="queue-count">
            <strong>{pending.length}</strong>
            <span>pending cases</span>
          </div>
        }
      />
      <div className="review-layout">
        <section className="panel review-list">
          <div className="panel-heading">
            <div>
              <h2>Review queue</h2>
              <p>Prioritized by clinical severity and risk</p>
            </div>
            <div className="sort-label">
              <Clock3 size={14} /> Oldest first
            </div>
          </div>
          {reviews.map((review) => (
            <button
              className={`review-row ${selected?.id === review.id ? 'selected' : ''}`}
              key={review.id}
              onClick={() => setSelected(review)}
            >
              <div className={`severity-bar ${review.severity}`} />
              <div className="review-main">
                <div>
                  <strong>{review.prescription?.patient?.name}</strong>
                  <Badge tone={review.severity}>{review.severity}</Badge>
                </div>
                <span>
                  {review.prescription?.drug_name} · {review.prescription?.indication}
                </span>
                <small>
                  {review.decision === 'pending'
                    ? 'Awaiting clinical review'
                    : `Reviewed · ${review.decision}`}
                </small>
              </div>
              <ChevronRight size={16} />
            </button>
          ))}
        </section>
        {selected ? (
          <ReviewDetail
            review={selected}
            onDecided={async (decision) => {
              await onReviewUpdated(selected.id, decision);
              setSelected({ ...selected, decision, reviewed_at: new Date().toISOString() });
              await onRefresh();
            }}
          />
        ) : (
          <div className="review-placeholder">
            <ClipboardList size={31} />
            <h3>Select a case to begin</h3>
            <p>Choose a patient from the queue to see the AI-assisted case summary.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewDetail({
  review,
  onDecided,
}: {
  review: CaseReview;
  onDecided: (decision: string) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);

  const decide = async (decision: string) => {
    setSaving(true);
    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('case_reviews')
          .update({
            decision,
            reviewer_id: null,
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', review.id);
      } catch {
        /* ignore network errors */
      }
    }
    await onDecided(decision);
    setSaving(false);
  };

  return (
    <section className="panel review-detail">
      <div className="detail-top">
        <div>
          <Badge tone={review.severity}>{review.severity} priority</Badge>
          <h2>{review.prescription?.patient?.name}</h2>
          <p>
            {review.prescription?.patient?.mrn} · {review.prescription?.patient?.ward}
          </p>
        </div>
        <Badge tone={review.decision === 'pending' ? 'neutral' : 'success'}>
          {review.decision === 'pending' ? 'Pending' : review.decision}
        </Badge>
      </div>
      <div className="case-drug">
        <div className="drug-icon">
          <Pill size={21} />
        </div>
        <div>
          <strong>
            {review.prescription?.drug_name} {review.prescription?.dose}
          </strong>
          <span>
            {review.prescription?.route} · {review.prescription?.frequency} ·{' '}
            {review.prescription?.duration_days} days
          </span>
        </div>
        <Badge tone={review.prescription?.is_restricted ? 'restricted' : 'neutral'}>
          {review.prescription?.is_restricted ? 'Restricted' : 'Standard'}
        </Badge>
      </div>
      <div className="ai-block">
        <div className="ai-heading">
          <div className="ai-spark">✦</div>
          <div>
            <strong>AI-assisted case summary</strong>
            <span>Generated from available microbiological and renal data</span>
          </div>
          <Badge tone="info">AI insight</Badge>
        </div>
        <p>{review.ai_summary}</p>
      </div>
      <div className="clinical-facts">
        <div>
          <span>DIAGNOSIS</span>
          <strong>{review.prescription?.patient?.diagnosis}</strong>
        </div>
        <div>
          <span>RENAL CLEARANCE</span>
          <strong>Cr {review.prescription?.patient?.creatinine_mg_dl} mg/dL</strong>
        </div>
        <div>
          <span>ALLERGIES</span>
          <strong>{review.prescription?.patient?.allergy_notes || 'None known'}</strong>
        </div>
      </div>
      <div className="notes-block">
        <span>STEWARDSHIP NOTES</span>
        <p>{review.stewardship_notes}</p>
      </div>
      <div className="decision-actions">
        <button
          className="secondary-button"
          disabled={saving}
          onClick={() => decide('modified')}
        >
          <FilePlus2 size={16} /> Modify therapy
        </button>
        <button
          className="danger-button"
          disabled={saving}
          onClick={() => decide('discontinued')}
        >
          <X size={16} /> Discontinue
        </button>
        <button
          className="approve-button"
          disabled={saving}
          onClick={() => decide('approved')}
        >
          <Check size={16} /> Approve
        </button>
      </div>
    </section>
  );
}

function Alerts({
  alerts,
  onAlertResolved,
  onRefresh,
}: {
  alerts: Alert[];
  onAlertResolved: (id: string) => Promise<void>;
  onRefresh: () => Promise<void>;
}) {
  const [filter, setFilter] = useState('open');
  const visible = alerts.filter((a) =>
    filter === 'all' ? true : filter === 'open' ? !a.is_resolved : a.is_resolved
  );

  const resolve = async (id: string) => {
    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('alerts')
          .update({ is_resolved: true, resolved_at: new Date().toISOString() })
          .eq('id', id);
      } catch {
        /* ignore network errors */
      }
    }
    await onAlertResolved(id);
    await onRefresh();
  };

  return (
    <div className="fade-in">
      <PageHeader
        eyebrow="SAFETY SIGNALS"
        title="Alerts"
        subtitle="Real-time antimicrobial stewardship alerts and patient safety triggers."
        action={
          <div className="alert-summary">
            <AlertTriangle size={16} />
            <strong>{alerts.filter((a) => !a.is_resolved).length}</strong>
            <span>open alerts</span>
          </div>
        }
      />
      <div className="toolbar">
        <div className="filter-tabs">
          {['open', 'all', 'resolved'].map((item) => (
            <button
              key={item}
              className={filter === item ? 'active' : ''}
              onClick={() => setFilter(item)}
            >
              {item[0].toUpperCase() + item.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="alert-list">
        {visible.map((alert) => (
          <div
            className={`alert-card ${alert.severity} ${alert.is_resolved ? 'resolved' : ''}`}
            key={alert.id}
          >
            <div className="alert-card-icon">
              <AlertTriangle size={18} />
            </div>
            <div className="alert-card-main">
              <div className="alert-title">
                <strong>{alert.alert_type}</strong>
                <Badge tone={alert.severity}>{alert.severity}</Badge>
              </div>
              <p>{alert.message}</p>
              <span className="alert-patient">
                <UserRound size={14} /> {alert.patient?.name} · {alert.patient?.mrn}{' '}
                <span>•</span> {alert.prescription?.drug_name}
              </span>
            </div>
            <div className="alert-card-actions">
              {alert.is_resolved ? (
                <Badge tone="success">
                  <Check size={13} /> Resolved
                </Badge>
              ) : (
                <button
                  className="secondary-button compact"
                  onClick={() => resolve(alert.id)}
                >
                  Acknowledge
                </button>
              )}
            </div>
          </div>
        ))}
        {visible.length === 0 && (
          <div className="panel">
            <EmptyState icon={Check} text="No alerts matching this filter" />
          </div>
        )}
      </div>
    </div>
  );
}

function Learning({
  questions,
  profile,
}: {
  questions: QuizQuestion[];
  profile: Profile;
}) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const question = questions[index];

  const submit = async () => {
    if (selected === null || !question) return;
    setSubmitted(true);
    if (selected === question.correct_index) {
      setScore((s) => s + 1);
    }
  };

  const next = () => {
    if (index + 1 >= questions.length) {
      setFinished(true);
    } else {
      setIndex((i) => i + 1);
      setSelected(null);
      setSubmitted(false);
    }
  };

  if (finished) {
    return (
      <div className="fade-in">
        <PageHeader
          eyebrow="MODULE COMPLETE"
          title="Excellent work."
          subtitle="Your results have been recorded into your stewardship learning history."
        />
        <div className="completion-card">
          <div className="completion-icon">
            <Trophy size={30} />
          </div>
          <strong>
            {score} / {questions.length}
          </strong>
          <span>questions answered correctly</span>
          <div className="progress-track">
            <i style={{ width: `${(score / (questions.length || 1)) * 100}%` }} />
          </div>
          <p>
            {score >= questions.length * 0.75
              ? 'You have demonstrated strong mastery of clinical stewardship guidelines and renal dosing protocols.'
              : 'Review the clinical rationales to strengthen your empirical prescribing principles.'}
          </p>
          <button
            className="primary-button"
            onClick={() => {
              setIndex(0);
              setSelected(null);
              setSubmitted(false);
              setScore(0);
              setFinished(false);
            }}
          >
            Retake module
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <PageHeader
        eyebrow="CONTINUING MEDICAL EDUCATION"
        title="Learning hub"
        subtitle="Strengthen prescribing habits with evidence-based clinical stewardship scenarios."
        action={
          <div className="streak">
            <FlaskConical size={17} />
            <strong>4 day</strong>
            <span>learning streak</span>
          </div>
        }
      />
      <div className="learning-layout">
        <section className="panel quiz-card">
          <div className="quiz-top">
            <span>CASE-BASED CHALLENGE</span>
            <span>
              {questions.length > 0 ? index + 1 : 0} of {questions.length}
            </span>
          </div>
          <div className="progress-track">
            <i
              style={{
                width: `${((index + 1) / (questions.length || 1)) * 100}%`,
              }}
            />
          </div>
          {question ? (
            <>
              <div className="question-meta">
                <Badge tone="info">{question.category}</Badge>
                <Badge tone="neutral">{question.difficulty}</Badge>
              </div>
              <h2>{question.question}</h2>
              <div className="options">
                {question.options.map((option, optionIndex) => (
                  <button
                    key={option}
                    className={`${selected === optionIndex ? 'selected' : ''} ${
                      submitted && optionIndex === question.correct_index ? 'correct' : ''
                    } ${
                      submitted && selected === optionIndex && selected !== question.correct_index
                        ? 'incorrect'
                        : ''
                    }`}
                    disabled={submitted}
                    onClick={() => setSelected(optionIndex)}
                  >
                    <span className="option-letter">
                      {String.fromCharCode(65 + optionIndex)}
                    </span>
                    {option}
                    {submitted && optionIndex === question.correct_index && (
                      <Check size={17} />
                    )}
                  </button>
                ))}
              </div>
              {submitted && (
                <div
                  className={`explanation ${
                    selected === question.correct_index ? 'correct' : 'incorrect'
                  }`}
                >
                  <strong>
                    {selected === question.correct_index ? 'Correct!' : 'Stewardship Rationale'}
                  </strong>
                  <span>{question.explanation}</span>
                </div>
              )}
              <div className="quiz-actions">
                {!submitted ? (
                  <button
                    className="primary-button"
                    disabled={selected === null}
                    onClick={submit}
                  >
                    Check answer <ChevronRight size={16} />
                  </button>
                ) : (
                  <button className="primary-button" onClick={next}>
                    {index + 1 === questions.length ? 'See results' : 'Next question'}{' '}
                    <ChevronRight size={16} />
                  </button>
                )}
              </div>
            </>
          ) : (
            <EmptyState icon={BookOpen} text="No learning content available" />
          )}
        </section>
        <aside className="learning-side">
          <div className="panel learning-progress">
            <div className="panel-heading">
              <div>
                <h2>Your progress</h2>
                <p>Current Q3 review cycle</p>
              </div>
              <Target size={19} className="muted-icon" />
            </div>
            <div className="big-progress">
              <strong>84%</strong>
              <span>module mastery</span>
            </div>
            <div className="progress-track">
              <i style={{ width: '84%' }} />
            </div>
            <div className="progress-stats">
              <div>
                <strong>14</strong>
                <span>completed</span>
              </div>
              <div>
                <strong>92%</strong>
                <span>avg score</span>
              </div>
              <div>
                <strong>{profile.points}</strong>
                <span>points</span>
              </div>
            </div>
          </div>
          <div className="panel course-card">
            <div className="course-icon">
              <BookOpen size={19} />
            </div>
            <strong>Antibiotic Stewardship Guidelines</strong>
            <span>CLSI 2026 Updates · 15 min</span>
            <div className="course-status">
              <span>Status</span>
              <strong>Active</strong>
            </div>
            <div className="progress-track">
              <i style={{ width: '75%' }} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Leaderboard({ profile }: { profile: Profile }) {
  const people = [
    { name: 'Dr. Priya Nair', specialty: 'Critical Care', points: 1890, color: '#8b5cf6' },
    { name: 'Dr. Elena Rodriguez', specialty: 'Pulmonology', points: 1520, color: '#f59e0b' },
    { name: 'Dr. Sarah Chen', specialty: 'Infectious Disease', points: 1240, color: '#0ea5e9' },
    { name: 'Dr. David Kim', specialty: 'Surgery', points: 1120, color: '#6366f1' },
    { name: 'Dr. Marcus Johnson', specialty: 'Internal Medicine', points: 980, color: '#10b981' },
    { name: 'Dr. James Park', specialty: 'Emergency Medicine', points: 760, color: '#ef4444' },
    { name: 'Dr. Robert Thompson', specialty: 'Stewardship Director', points: 650, color: '#14b8a6' },
    { name: 'Dr. Amy Wilson', specialty: 'Pediatrics', points: 430, color: '#ec4899' },
  ].sort((a, b) => b.points - a.points);

  return (
    <div className="fade-in">
      <PageHeader
        eyebrow="CLINICAL EXCELLENCE"
        title="Leaderboard"
        subtitle="Recognizing clinicians championing optimal antimicrobial prescribing and de-escalation."
        action={
          <div className="season-label">
            <Trophy size={17} /> Q3 Stewardship Season
          </div>
        }
      />
      <div className="leader-layout">
        <section className="panel leaderboard-panel">
          <div className="podium">
            <Podium person={people[1]} rank="2" />
            <Podium person={people[0]} rank="1" primary />
            <Podium person={people[2]} rank="3" />
          </div>
          <div className="leader-list">
            {people.slice(3).map((person, i) => (
              <div
                className={`leader-row ${
                  person.name.includes(profile.full_name.split(' ')[1]) ? 'current' : ''
                }`}
                key={person.name}
              >
                <strong className="rank">{i + 4}</strong>
                <div className="leader-avatar" style={{ background: person.color }}>
                  {person.name
                    .split(' ')
                    .slice(1)
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)}
                </div>
                <div className="leader-info">
                  <strong>{person.name}</strong>
                  <span>{person.specialty}</span>
                </div>
                <strong className="leader-points">
                  {person.points.toLocaleString()} <small>pts</small>
                </strong>
              </div>
            ))}
          </div>
        </section>
        <aside className="leader-side">
          <div className="panel your-rank">
            <div className="eyebrow">YOUR CURRENT RANK</div>
            <div className="your-rank-main">
              <strong>#3</strong>
              <div>
                <span>{profile.full_name}</span>
                <small>+280 points to reach rank #2</small>
              </div>
              <Trophy size={26} />
            </div>
            <div className="rank-bar">
              <i style={{ width: '80%' }} />
            </div>
          </div>
          <div className="panel earn-card">
            <div className="course-icon orange">
              <Target size={19} />
            </div>
            <h3>How to earn points</h3>
            <div>
              <span>Complete case de-escalation review</span>
              <strong>+50 pts</strong>
            </div>
            <div>
              <span>Finish weekly learning module</span>
              <strong>+100 pts</strong>
            </div>
            <div>
              <span>Document timely therapeutic drug level</span>
              <strong>+30 pts</strong>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Podium({
  person,
  rank,
  primary = false,
}: {
  person: { name: string; specialty: string; points: number; color: string };
  rank: string;
  primary?: boolean;
}) {
  return (
    <div className={`podium-person ${primary ? 'primary' : ''}`}>
      <div className="podium-avatar" style={{ background: person.color }}>
        {person.name
          .split(' ')
          .slice(1)
          .map((n) => n[0])
          .join('')
          .slice(0, 2)}
      </div>
      <span className="podium-rank">{rank}</span>
      <strong>{person.name.replace('Dr. ', '')}</strong>
      <small>{person.points.toLocaleString()} pts</small>
      <div className="podium-block">
        <span>{rank}</span>
      </div>
    </div>
  );
}

function Analytics({ prescriptions }: { prescriptions: Prescription[] }) {
  const drugs = useMemo(() => {
    const counts: Record<string, number> = {};
    prescriptions.forEach((p) => {
      counts[p.drug_name] = (counts[p.drug_name] ?? 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [prescriptions]);

  return (
    <div className="fade-in">
      <PageHeader
        eyebrow="ADMINISTRATION & SURVEILLANCE"
        title="Hospital analytics"
        subtitle="Surveillance metrics, antimicrobial utilization trends, and clinical quality indicators."
        action={
          <button className="secondary-button">
            <BarChart3 size={16} /> Export clinical report
          </button>
        }
      />
      <div className="stat-grid">
        <StatCard
          icon={Target}
          label="Prescribing appropriateness"
          value="74%"
          meta="↑ 6.4% vs previous period"
          tone="green"
        />
        <StatCard
          icon={Activity}
          label="DOT / 1,000 patient days"
          value="428"
          meta="↓ 8.2% vs baseline"
          tone="blue"
        />
        <StatCard
          icon={ShieldCheck}
          label="Alert resolution rate"
          value="96%"
          meta="Average 1.8 hours"
          tone="teal"
        />
        <StatCard
          icon={Users}
          label="Participating prescribers"
          value="24"
          meta="+4 this month"
          tone="orange"
        />
      </div>
      <div className="analytics-grid">
        <section className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <h2>Prescribing appropriateness</h2>
              <p>Weekly trend · last 12 weeks</p>
            </div>
            <Badge tone="success">+6.4%</Badge>
          </div>
          <div className="line-chart">
            <div className="chart-y">
              <span>100%</span>
              <span>75%</span>
              <span>50%</span>
              <span>25%</span>
              <span>0%</span>
            </div>
            <div className="chart-area">
              <div className="grid-line l1" />
              <div className="grid-line l2" />
              <div className="grid-line l3" />
              <div className="grid-line l4" />
              <svg viewBox="0 0 640 220" preserveAspectRatio="none">
                <path
                  d="M0,155 C32,142 45,150 70,138 S108,121 132,131 S167,105 194,112 S227,94 252,106 S286,91 315,92 S350,73 378,82 S410,68 440,74 S472,59 500,64 S536,39 565,49 S605,26 640,30"
                  fill="none"
                  stroke="#0ea5e9"
                  strokeWidth="3"
                />
                <path
                  d="M0,155 C32,142 45,150 70,138 S108,121 132,131 S167,105 194,112 S227,94 252,106 S286,91 315,92 S350,73 378,82 S410,68 440,74 S472,59 500,64 S536,39 565,49 S605,26 640,30 L640,220 L0,220Z"
                  fill="url(#chartFill)"
                  opacity=".14"
                />
                <defs>
                  <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
                    <stop stopColor="#0ea5e9" />
                    <stop offset="1" stopColor="#0ea5e9" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="chart-x">
                <span>Jun 08</span>
                <span>Jun 22</span>
                <span>Jul 06</span>
                <span>Jul 20</span>
                <span>Aug 03</span>
                <span>Aug 24</span>
              </div>
            </div>
          </div>
        </section>
        <section className="panel distribution-panel">
          <div className="panel-heading">
            <div>
              <h2>Antimicrobial mix</h2>
              <p>Active therapy distribution</p>
            </div>
          </div>
          <div className="mix-list">
            {drugs.slice(0, 6).map(([drug, count], i) => (
              <div className="mix-row" key={drug}>
                <div className="mix-label">
                  <i className={`mix-dot m${i}`} />
                  <span>{drug}</span>
                  <strong>{count}</strong>
                </div>
                <div className="mix-track">
                  <i
                    className={`m${i}`}
                    style={{
                      width: `${Math.max(
                        18,
                        (count / Math.max(...drugs.map((d) => d[1]), 1)) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))}
            {drugs.length === 0 && (
              <p style={{ color: '#8898a6', fontSize: '11px', padding: '12px' }}>
                No active prescriptions recorded
              </p>
            )}
          </div>
        </section>
      </div>
      <div className="analytics-bottom">
        <section className="panel metric-panel">
          <div className="panel-heading">
            <div>
              <h2>Key outcomes</h2>
              <p>Compared with prior fiscal quarter</p>
            </div>
          </div>
          <div className="outcome-grid">
            <Outcome
              label="Broad-spectrum reduction"
              value="18.4%"
              change="↓ 3.2%"
              positive
            />
            <Outcome
              label="IV-to-oral conversions"
              value="126"
              change="↑ 22%"
              positive
            />
            <Outcome
              label="Alert response time"
              value="1.8h"
              change="↓ 14 min"
              positive
            />
            <Outcome
              label="C. difficile incidence"
              value="3"
              change="↓ 2 cases"
              positive
            />
          </div>
        </section>
        <section className="panel ward-panel">
          <div className="panel-heading">
            <div>
              <h2>Ward performance</h2>
              <p>Protocol appropriateness by unit</p>
            </div>
            <button className="text-button">
              Details <ChevronRight size={15} />
            </button>
          </div>
          <div className="ward-list">
            <Ward name="ICU" value={88} />
            <Ward name="Ward 4B" value={81} />
            <Ward name="Ward 3A" value={76} />
            <Ward name="Surgery" value={72} />
          </div>
        </section>
      </div>
      <div className="data-footnote">
        <ShieldCheck size={14} /> Aggregated synthetic stewardship data · Reporting period:
        01 Jun – 24 Aug 2026 <span>•</span> <Clock3 size={14} /> Refreshed live
      </div>
    </div>
  );
}

function Outcome({
  label,
  value,
  change,
  positive,
}: {
  label: string;
  value: string;
  change: string;
  positive?: boolean;
}) {
  return (
    <div className="outcome">
      <span>{label}</span>
      <strong>{value}</strong>
      <small className={positive ? 'trend-up' : ''}>{change} vs last quarter</small>
    </div>
  );
}

function Ward({ name, value }: { name: string; value: number }) {
  return (
    <div className="ward-row">
      <span>{name}</span>
      <div className="mix-track">
        <i style={{ width: `${value}%` }} />
      </div>
      <strong>{value}%</strong>
    </div>
  );
}

export default App;
