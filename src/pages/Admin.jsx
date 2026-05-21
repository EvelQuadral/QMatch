import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
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

function LoginForm({ onAuth }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data, error: err } = await supabase.rpc('verify_admin_password', {
        p_password: password,
      });
      if (err) throw err;
      if (data === true) {
        onAuth(password);
      } else {
        setError('Mot de passe incorrect');
      }
    } catch (err) {
      setError('Erreur : ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login">
      <div className="admin-login-card">
        <h1>QMatch — Admin</h1>
        <form onSubmit={submit}>
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          <button type="submit" disabled={loading || !password}>
            {loading ? 'Vérification…' : 'Entrer'}
          </button>
          {error && <div className="admin-error">{error}</div>}
        </form>
      </div>
    </div>
  );
}

function ResetModal({ onConfirm, onCancel, busy }) {
  const [typed, setTyped] = useState('');
  const [includeEvents, setIncludeEvents] = useState(false);

  return (
    <div className="admin-modal-bg" onClick={onCancel}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Réinitialiser les statistiques</h2>
        <p>
          Cette action remettra tous les compteurs à zéro. Une sauvegarde CSV sera
          téléchargée automatiquement avant.
        </p>
        <label className="admin-checkbox">
          <input
            type="checkbox"
            checked={includeEvents}
            onChange={(e) => setIncludeEvents(e.target.checked)}
          />
          <span>
            Effacer aussi l'historique brut (events) — irréversible, à n'utiliser qu'après
            export final.
          </span>
        </label>
        <p>
          Pour confirmer, tape <code>RESET</code> ci-dessous :
        </p>
        <input
          type="text"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="RESET"
          className="admin-modal-input"
        />
        <div className="admin-modal-actions">
          <button onClick={onCancel} className="btn-secondary">
            Annuler
          </button>
          <button
            onClick={() => onConfirm(includeEvents)}
            disabled={typed !== 'RESET' || busy}
            className="btn-danger"
          >
            {busy ? 'En cours…' : includeEvents ? 'RESET COMPLET' : 'RESET stats'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CopyButton({ value, label = 'Copier' }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  };
  return (
    <button className="copy-btn" onClick={copy}>
      {copied ? 'Copié !' : label}
    </button>
  );
}

function AdminDashboard({ password, onLogout }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showReset, setShowReset] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [sortKey, setSortKey] = useState('likes');

  const fetchDashboard = async () => {
    try {
      const { data, error: err } = await supabase.rpc('admin_get_dashboard', {
        p_password: password,
      });
      if (err) throw err;
      setRows(data || []);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    const channel = supabase
      .channel('admin-stats')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stats_counters' },
        () => fetchDashboard()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [password]);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const profiles = useMemo(() => rows.filter((r) => r.type === 'profile'), [rows]);
  const pubs = useMemo(() => rows.filter((r) => r.type === 'pub'), [rows]);

  const sortedProfiles = useMemo(() => {
    return [...profiles].sort((a, b) => (b[sortKey] || 0) - (a[sortKey] || 0));
  }, [profiles, sortKey]);

  const totals = useMemo(() => {
    return profiles.reduce(
      (acc, r) => ({
        likes: acc.likes + (r.likes || 0),
        passes: acc.passes + (r.passes || 0),
        details: acc.details + (r.details_views || 0),
        vcards: acc.vcards + (r.vcard_downloads || 0),
      }),
      { likes: 0, passes: 0, details: 0, vcards: 0 }
    );
  }, [profiles]);

  const handleResetConfirm = async (includeEvents) => {
    setResetBusy(true);
    try {
      // 1. Snapshot CSV avant
      downloadCSV(
        `qmatch-snapshot-${new Date().toISOString().slice(0, 19).replace(/:/g, '')}.csv`,
        rows,
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
      // 3. Refresh
      await fetchDashboard();
      setShowReset(false);
    } catch (err) {
      alert('Erreur reset : ' + err.message);
    } finally {
      setResetBusy(false);
    }
  };

  const exportStatsCSV = () => {
    downloadCSV(
      `qmatch-stats-${new Date().toISOString().slice(0, 10)}.csv`,
      rows,
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
  };

  const exportEventsCSV = async () => {
    try {
      const { data, error: err } = await supabase.rpc('admin_export_events', {
        p_password: password,
      });
      if (err) throw err;
      downloadCSV(
        `qmatch-events-${new Date().toISOString().slice(0, 10)}.csv`,
        data || [],
        [
          { key: 'created_at', label: 'Date/heure' },
          { key: 'profile_name', label: 'Profil' },
          { key: 'action', label: 'Action' },
          { key: 'session_id', label: 'Session' },
        ]
      );
    } catch (err) {
      alert('Erreur export events : ' + err.message);
    }
  };

  if (loading) return <div className="admin-page"><div className="admin-loading">Chargement…</div></div>;
  if (error)
    return (
      <div className="admin-page">
        <div className="admin-error-box">
          <h2>Erreur</h2>
          <p>{error}</p>
          <button onClick={onLogout}>Retour</button>
        </div>
      </div>
    );

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1>QMatch — Admin</h1>
        <div className="admin-actions">
          <button onClick={fetchDashboard} className="btn-ghost">Rafraîchir</button>
          <button onClick={exportStatsCSV} className="btn-secondary">Export stats CSV</button>
          <button onClick={exportEventsCSV} className="btn-secondary">Export events CSV</button>
          <button onClick={() => setShowReset(true)} className="btn-danger">Reset</button>
          <button onClick={onLogout} className="btn-ghost">Déconnexion</button>
        </div>
      </header>

      <section className="admin-totals">
        <div className="total-card"><div className="t-num">{totals.likes}</div><div>Likes</div></div>
        <div className="total-card"><div className="t-num">{totals.passes}</div><div>Passes</div></div>
        <div className="total-card"><div className="t-num">{totals.details}</div><div>Détails vus</div></div>
        <div className="total-card"><div className="t-num">{totals.vcards}</div><div>vCards</div></div>
      </section>

      <section>
        <div className="admin-section-header">
          <h2>Leaderboard profils</h2>
          <select value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
            <option value="likes">Trier par likes</option>
            <option value="passes">Trier par passes</option>
            <option value="details_views">Trier par détails</option>
            <option value="vcard_downloads">Trier par vCards</option>
          </select>
        </div>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Profil</th>
                <th>Likes</th>
                <th>Passes</th>
                <th>Détails</th>
                <th>vCards</th>
                <th>Lien /me</th>
                <th>Actif</th>
              </tr>
            </thead>
            <tbody>
              {sortedProfiles.map((r, i) => {
                const meUrl = r.dashboard_token ? `${baseUrl}/me/${r.dashboard_token}` : '';
                return (
                  <tr key={r.profile_id} className={!r.active ? 'row-inactive' : ''}>
                    <td>{i + 1}</td>
                    <td>{r.name}</td>
                    <td className="num">{r.likes}</td>
                    <td className="num">{r.passes}</td>
                    <td className="num">{r.details_views}</td>
                    <td className="num">{r.vcard_downloads}</td>
                    <td>
                      {meUrl && (
                        <div className="link-cell">
                          <span className="link-url">{meUrl}</span>
                          <CopyButton value={meUrl} />
                        </div>
                      )}
                    </td>
                    <td>{r.active ? '✓' : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>Pubs</h2>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Likes</th>
                <th>Clics</th>
                <th>Actif</th>
              </tr>
            </thead>
            <tbody>
              {pubs.map((r) => (
                <tr key={r.profile_id} className={!r.active ? 'row-inactive' : ''}>
                  <td>{r.name}</td>
                  <td className="num">{r.likes}</td>
                  <td className="num">{r.pub_clicks}</td>
                  <td>{r.active ? '✓' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-help">
        <p>
          Pour éditer les profils, photos ou activer/désactiver des entrées :{' '}
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noreferrer"
          >
            ouvrir Supabase Studio
          </a>
        </p>
      </section>

      {showReset && (
        <ResetModal
          busy={resetBusy}
          onConfirm={handleResetConfirm}
          onCancel={() => setShowReset(false)}
        />
      )}
    </div>
  );
}

export default function Admin() {
  const [password, setPassword] = useState(null);
  if (!password) return <LoginForm onAuth={setPassword} />;
  return <AdminDashboard password={password} onLogout={() => setPassword(null)} />;
}
