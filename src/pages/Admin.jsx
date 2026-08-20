import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Lock, ArrowRight, Download, Trash2, LogOut, RefreshCw, ExternalLink } from 'lucide-react';
import { supabase, photoUrl } from '../lib/supabase';
import { useAdminAuth } from '../hooks/useAdminAuth';
import Logo from '../components/Logo';
import LiveDot from '../components/LiveDot';
import StatCounter from '../components/StatCounter';
import LeaderboardRow from '../components/LeaderboardRow';
import ConfirmModal from '../components/ConfirmModal';
import Toast from '../components/Toast';
import FeedbackPanel from '../components/FeedbackPanel';
import PubStatsPanel from '../components/PubStatsPanel';
import './Admin.css';

function downloadCSV(filename, rows, columns) {
  const escape = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  const header = columns.map((c) => c.label).join(',');
  const lines = rows.map((r) => columns.map((c) => escape(r[c.key])).join(','));
  const csv = [header, ...lines].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function tsForFilename() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

/* ──────────────────────────────────────────────────────────────────────── */
/* LOGIN                                                                    */
/* ──────────────────────────────────────────────────────────────────────── */

function AdminLogin({ onLogin, error, busy }) {
  const [password, setPassword] = useState('');
  const [shake, setShake] = useState(false);
  const inputWrapRef = useRef(null);

  // Trigger shake on each new error
  useEffect(() => {
    if (error) {
      setShake(true);
      const t = setTimeout(() => setShake(false), 400);
      return () => clearTimeout(t);
    }
  }, [error]);

  const submit = async (e) => {
    e.preventDefault();
    if (!password || busy) return;
    await onLogin(password);
  };

  return (
    <div className="adm-login">
      <div className="adm-login-inner">
        <div className="adm-login-brand">
          <Logo size="md" />
          <div className="adm-login-label">CONSOLE ADMIN</div>
        </div>

        <h1 className="adm-login-title">Accès réservé</h1>
        <p className="adm-login-sub">Mot de passe administrateur</p>

        <form onSubmit={submit}>
          <div
            ref={inputWrapRef}
            className={`adm-pw-input ${shake ? 'shake' : ''}`}
          >
            <Lock size={16} />
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              disabled={busy}
            />
          </div>

          <button
            type="submit"
            className="adm-pw-btn"
            disabled={busy || !password}
          >
            <span>{busy ? 'Vérification…' : 'Entrer'}</span>
            <ArrowRight size={16} />
          </button>

          {error && <div className="adm-pw-error">{error}</div>}
        </form>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/* DASHBOARD                                                                */
/* ──────────────────────────────────────────────────────────────────────── */

function AdminDashboard({ password, onLogout }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [kpis, setKpis] = useState(null);
  const [rawRows, setRawRows] = useState([]); // pour exports
  const [feedbackStats, setFeedbackStats] = useState(null);
  const [pubStats, setPubStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [liveStatus, setLiveStatus] = useState('live');
  const [expanded, setExpanded] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetTyped, setResetTyped] = useState('');
  const [includeEvents, setIncludeEvents] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      const [
        { data: rows, error: e1 },
        { data: lb, error: e2 },
        { data: globals, error: e3 },
      ] = await Promise.all([
        supabase.rpc('admin_get_dashboard', { p_password: password }),
        supabase.rpc('get_public_leaderboard'),
        supabase.rpc('admin_get_global_kpis', { p_password: password }),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      if (e3) throw e3;

      setRawRows(rows || []);

      // Merge leaderboard (qui n'a pas les tokens) avec admin_get_dashboard (qui les a)
      const tokenMap = new Map(
        (rows || []).filter((r) => r.type === 'profile').map((r) => [r.profile_id, r.dashboard_token])
      );
      const lbEnriched = (lb || []).map((r) => ({
        ...r,
        image_full_url: photoUrl(r.image_url),
        dashboard_token: tokenMap.get(r.profile_id) || null,
      }));
      setLeaderboard(lbEnriched);

      setKpis(globals && globals[0] ? globals[0] : null);
      setError('');
    } catch (err) {
      setError(err.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }

    // Sections secondaires : volontairement hors du Promise.all ci-dessus.
    // Si une migration SQL n'a pas encore été jouée sur l'instance Supabase,
    // la RPC manquante ne doit pas faire tomber tout le dashboard — la section
    // concernée reste simplement vide.
    supabase
      .rpc('admin_get_feedback_stats', { p_password: password })
      .then(({ data, error: e }) => {
        if (!e) setFeedbackStats(data && data[0] ? data[0] : null);
      })
      .catch(() => {});

    supabase
      .rpc('admin_get_pub_stats', { p_password: password })
      .then(({ data, error: e }) => {
        if (!e) setPubStats(data || []);
      })
      .catch(() => {});
  }, [password]);

  useEffect(() => {
    fetchAll();
    let lastFetch = Date.now();
    const channel = supabase
      .channel('admin-stats')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stats_counters' },
        () => {
          const now = Date.now();
          if (now - lastFetch > 800) {
            lastFetch = now;
            fetchAll();
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setLiveStatus('live');
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setLiveStatus('offline');
      });
    return () => supabase.removeChannel(channel);
  }, [fetchAll]);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const visibleLb = useMemo(() => {
    if (expanded) return leaderboard;
    return leaderboard.slice(0, 5);
  }, [leaderboard, expanded]);

  const handleCopy = useCallback(async (profileId, token) => {
    if (!token) return;
    const url = `${baseUrl}/me/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(profileId);
      setToast({ message: 'Lien copié', type: 'success' });
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      setToast({ message: 'Échec — copie manuelle requise', type: 'error' });
    }
  }, [baseUrl]);

  const exportStatsCSV = () => {
    downloadCSV(
      `qmatch-stats-${tsForFilename()}.csv`,
      rawRows,
      [
        { key: 'name', label: 'Profil' },
        { key: 'type', label: 'Type' },
        { key: 'active', label: 'Actif' },
        { key: 'likes', label: 'Likes' },
        { key: 'passes', label: 'Passes' },
        { key: 'details_views', label: 'Détails vus' },
        { key: 'vcard_downloads', label: 'vCards' },
        { key: 'pub_clicks', label: 'Clics pub' },
      ]
    );
    setToast({ message: 'Export Stats téléchargé', type: 'success' });
  };

  const exportEventsCSV = async () => {
    try {
      const { data, error: err } = await supabase.rpc('admin_export_events', {
        p_password: password,
      });
      if (err) throw err;
      downloadCSV(
        `qmatch-events-${tsForFilename()}.csv`,
        data || [],
        [
          { key: 'created_at', label: 'Date/heure' },
          { key: 'profile_name', label: 'Profil' },
          { key: 'action', label: 'Action' },
          { key: 'session_id', label: 'Session' },
        ]
      );
      setToast({ message: `Export Events (${(data || []).length} lignes)`, type: 'success' });
    } catch (err) {
      setToast({ message: 'Erreur export events', type: 'error' });
    }
  };

  // Appelé par FeedbackPanel, qui a déjà chargé les lignes via admin_export_feedback
  const exportFeedbackCSV = (data) => {
    downloadCSV(
      `qmatch-feedback-${tsForFilename()}.csv`,
      data,
      [
        { key: 'created_at', label: 'Date/heure' },
        { key: 'rating', label: 'Note' },
        { key: 'comment', label: 'Commentaire' },
        { key: 'session_id', label: 'Session' },
      ]
    );
    setToast({ message: `Export Feedback (${data.length} avis)`, type: 'success' });
  };

  const handleReset = async () => {
    if (resetTyped !== 'RESET') return;
    setResetBusy(true);
    try {
      // 1. Snapshot CSV auto avant le reset
      downloadCSV(
        `qmatch-snapshot-${tsForFilename()}.csv`,
        rawRows,
        [
          { key: 'name', label: 'Profil' },
          { key: 'type', label: 'Type' },
          { key: 'likes', label: 'Likes' },
          { key: 'passes', label: 'Passes' },
          { key: 'details_views', label: 'Détails vus' },
          { key: 'vcard_downloads', label: 'vCards' },
          { key: 'pub_clicks', label: 'Clics pub' },
        ]
      );
      // 2. Reset
      const { error: err } = await supabase.rpc('admin_reset_stats', {
        p_password: password,
        p_include_events: includeEvents,
      });
      if (err) throw err;
      await fetchAll();
      setShowResetModal(false);
      setResetTyped('');
      setIncludeEvents(false);
      setToast({ message: 'Stats réinitialisées', type: 'success' });
    } catch (err) {
      setToast({ message: 'Erreur reset : ' + (err.message || ''), type: 'error' });
    } finally {
      setResetBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="adm-page">
        <div className="adm-loading">Chargement…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="adm-page">
        <div className="adm-error-box">
          <h2>Erreur</h2>
          <p>{error}</p>
          <button className="adm-action adm-action-ghost" onClick={onLogout}>Retour login</button>
        </div>
      </div>
    );
  }

  const liveLabel =
    liveStatus === 'live' ? 'LIVE' : liveStatus === 'offline' ? 'DÉCONNECTÉ' : 'RECONNEXION';

  return (
    <div className="adm-page">
      <header className="adm-header">
        <div className="adm-brand">
          <Logo size="sm" />
          <span className="adm-brand-label">Admin</span>
        </div>
        <LiveDot label={liveLabel} status={liveStatus} size="sm" />
      </header>

      {/* KPIs globaux */}
      <section>
        <div className="adm-section-label">Totaux congrès</div>
        <div className="adm-kpis">
          <StatCounter value={Number(kpis?.visitors_count) || 0} label="Visiteurs" color="white" />
          <StatCounter value={Number(kpis?.total_likes) || 0} label="Likes" color="pink" />
          <StatCounter value={Number(kpis?.total_details) || 0} label="Détails" color="blue" />
          <StatCounter value={Number(kpis?.total_vcards) || 0} label="vCards" color="green" />
        </div>
      </section>

      {/* Leaderboard */}
      <section>
        <div className="adm-section-label">Leaderboard directeurs</div>
        <div className="adm-lb">
          {visibleLb.map((r) => (
            <LeaderboardRow
              key={r.profile_id}
              variant="admin"
              rank={Number(r.rank_likes)}
              name={r.name}
              imageUrl={r.image_full_url}
              likes={r.likes ?? 0}
              vcards={r.vcard_downloads ?? 0}
              copyUrl={r.dashboard_token ? `${baseUrl}/me/${r.dashboard_token}` : null}
              copied={copiedId === r.profile_id}
              onCopy={() => handleCopy(r.profile_id, r.dashboard_token)}
            />
          ))}
          {leaderboard.length > 5 && (
            <button
              type="button"
              className="adm-lb-expand"
              onClick={() => setExpanded((e) => !e)}
            >
              {expanded
                ? `— Replier ↑ —`
                : `— Voir les ${leaderboard.length - 5} autres ↓ —`}
            </button>
          )}
        </div>
      </section>

      {/* Pubs */}
      <section>
        <div className="adm-section-label">Pubs</div>
        <PubStatsPanel stats={pubStats} />
      </section>

      {/* Retours visiteurs */}
      <section>
        <div className="adm-section-label">Retours visiteurs</div>
        <FeedbackPanel
          stats={feedbackStats}
          password={password}
          onToast={setToast}
          onExport={exportFeedbackCSV}
        />
      </section>

      {/* Actions */}
      <section>
        <div className="adm-section-label">Actions</div>
        <div className="adm-actions-grid">
          <button className="adm-action adm-action-export" onClick={exportStatsCSV}>
            <Download size={14} />
            <span>Export Stats</span>
          </button>
          <button className="adm-action adm-action-export" onClick={exportEventsCSV}>
            <Download size={14} />
            <span>Export Events</span>
          </button>
        </div>
        <button className="adm-action adm-action-reset" onClick={() => setShowResetModal(true)}>
          <Trash2 size={14} />
          <span>Reset stats</span>
        </button>
        <button className="adm-action adm-action-ghost adm-refresh" onClick={fetchAll}>
          <RefreshCw size={14} />
          <span>Rafraîchir</span>
        </button>
      </section>

      <section className="adm-studio-link">
        <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer">
          <ExternalLink size={12} />
          <span>Ouvrir Supabase Studio</span>
        </a>
      </section>

      <button type="button" className="adm-logout" onClick={onLogout}>
        <LogOut size={13} />
        <span>Se déconnecter</span>
      </button>

      {/* Modals & toasts */}
      <ConfirmModal
        open={showResetModal}
        title="Reset des stats ?"
        body="Cette action remettra tous les compteurs à zéro. Un snapshot CSV des stats actuelles sera téléchargé automatiquement avant le reset."
        confirmLabel={resetBusy ? 'En cours…' : (includeEvents ? 'RESET COMPLET' : 'RESET stats')}
        cancelLabel="Annuler"
        variant="danger"
        disabled={resetTyped !== 'RESET' || resetBusy}
        onCancel={() => {
          setShowResetModal(false);
          setResetTyped('');
          setIncludeEvents(false);
        }}
        onConfirm={handleReset}
      >
        <label className="adm-modal-check">
          <input
            type="checkbox"
            checked={includeEvents}
            onChange={(e) => setIncludeEvents(e.target.checked)}
          />
          <span>Effacer aussi l'historique brut (events) — irréversible, à n'utiliser qu'après export final.</span>
        </label>
        <p className="adm-modal-confirm-label">
          Pour confirmer, tape <code>RESET</code> :
        </p>
        <input
          type="text"
          className="adm-modal-confirm-input"
          value={resetTyped}
          onChange={(e) => setResetTyped(e.target.value)}
          placeholder="RESET"
        />
      </ConfirmModal>

      <Toast
        message={toast?.message}
        type={toast?.type}
        onDone={() => setToast(null)}
      />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/* ROOT                                                                     */
/* ──────────────────────────────────────────────────────────────────────── */

export default function Admin() {
  const { password, isAuthed, error, busy, login, logout } = useAdminAuth();
  if (!isAuthed) return <AdminLogin onLogin={login} error={error} busy={busy} />;
  return <AdminDashboard password={password} onLogout={logout} />;
}
