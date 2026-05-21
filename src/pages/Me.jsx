import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase, photoUrl } from '../lib/supabase';
import './Admin.css';

const POLL_INTERVAL = 30000; // 30 sec — backup au cas où Realtime ne match pas

function rankSuffix(n) {
  if (n === 1) return 'ᵉʳ';
  return 'ᵉ';
}

function rankBadgeClass(rank) {
  if (rank === 1) return 'gold';
  if (rank === 2) return 'silver';
  if (rank === 3) return 'bronze';
  return '';
}

function HourlyChart({ data }) {
  if (!data || data.length === 0) {
    return <div className="me-chart-empty">Pas encore d'activité enregistrée.</div>;
  }

  const maxLikes = Math.max(...data.map((d) => Number(d.likes) || 0), 1);
  const width = 100 / data.length;

  return (
    <div style={{ height: 180, position: 'relative', padding: '10px 0' }}>
      <div
        style={{
          height: 140,
          display: 'flex',
          alignItems: 'flex-end',
          gap: 2,
          paddingBottom: 4,
        }}
      >
        {data.map((d, i) => {
          const likes = Number(d.likes) || 0;
          const h = (likes / maxLikes) * 100;
          const date = new Date(d.hour);
          const label = `${date.getHours().toString().padStart(2, '0')}h`;
          return (
            <div
              key={i}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
              title={`${label} — ${likes} likes`}
            >
              <div
                style={{
                  width: '100%',
                  background: 'linear-gradient(180deg, #e4208d, #c91c7a)',
                  height: `${h}%`,
                  borderRadius: '4px 4px 0 0',
                  minHeight: likes > 0 ? 4 : 0,
                  transition: 'height 0.3s ease',
                }}
              />
              <div
                style={{
                  fontSize: 9,
                  color: 'rgba(255,255,255,0.5)',
                  marginTop: 4,
                  transform: data.length > 12 ? 'rotate(-45deg)' : 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Me() {
  const { token } = useParams();
  const [stats, setStats] = useState(null);
  const [hourly, setHourly] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAll = async () => {
    try {
      const [{ data: s, error: e1 }, { data: h, error: e2 }] = await Promise.all([
        supabase.rpc('get_profile_stats_by_token', { p_token: token }),
        supabase.rpc('get_hourly_stats_by_token', { p_token: token }),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      setStats(s && s[0] ? s[0] : null);
      setHourly(h || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Lien invalide');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    const channel = supabase
      .channel('me-stats-' + token)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stats_counters' },
        () => fetchAll()
      )
      .subscribe();

    const interval = setInterval(fetchAll, POLL_INTERVAL);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const avatarUrl = useMemo(() => (stats ? photoUrl(stats.image_url) : ''), [stats]);

  if (loading) {
    return (
      <div className="me-page">
        <div className="me-error">Chargement…</div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="me-page">
        <div className="me-error">
          <h2>Lien invalide</h2>
          <p>{error || 'Ce lien ne correspond à aucun profil actif.'}</p>
        </div>
      </div>
    );
  }

  const rank = Number(stats.rank_likes);
  const total = Number(stats.total_profiles);
  const badgeClass = rankBadgeClass(rank);

  return (
    <div className="me-page">
      <div className="me-header">
        {avatarUrl && <img src={avatarUrl} alt={stats.name} className="me-avatar" />}
        <h1 className="me-name">{stats.name}</h1>
        <div className={`me-rank-badge ${badgeClass}`}>
          {rank}
          {rankSuffix(rank)} sur {total} en likes
        </div>
      </div>

      <div className="me-stats">
        <div className="me-stat-card">
          <div className="stat-big">{stats.likes}</div>
          <div className="stat-label">Likes</div>
        </div>
        <div className="me-stat-card">
          <div className="stat-big">{stats.vcard_downloads}</div>
          <div className="stat-label">vCards</div>
        </div>
        <div className="me-stat-card">
          <div className="stat-big">{stats.details_views}</div>
          <div className="stat-label">Détails vus</div>
        </div>
        <div className="me-stat-card">
          <div className="stat-big">{stats.passes}</div>
          <div className="stat-label">Passes</div>
        </div>
      </div>

      <div className="me-chart-section">
        <h2>Évolution horaire des likes</h2>
        <div className="me-chart">
          <HourlyChart data={hourly} />
        </div>
      </div>

      <div className="me-refresh-info">
        Mis à jour automatiquement — dernière vérification à{' '}
        {new Date().toLocaleTimeString('fr-FR')}
      </div>
    </div>
  );
}
