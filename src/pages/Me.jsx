import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase, photoUrl } from '../lib/supabase';
import Logo from '../components/Logo';
import LiveDot from '../components/LiveDot';
import StatCounter from '../components/StatCounter';
import DirectorRankCard from '../components/DirectorRankCard';
import LeaderboardRow from '../components/LeaderboardRow';
import './Me.css';

const POLL_INTERVAL = 30000;

export default function Me() {
  const { token } = useParams();
  const [profile, setProfile] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [recap, setRecap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [liveStatus, setLiveStatus] = useState('live');

  const fetchAll = useCallback(async () => {
    try {
      const [
        { data: stats, error: e1 },
        { data: lb, error: e2 },
        { data: rc, error: e3 },
      ] = await Promise.all([
        supabase.rpc('get_profile_stats_by_token', { p_token: token }),
        supabase.rpc('get_public_leaderboard'),
        supabase.rpc('get_director_recap_yesterday', { p_token: token }),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      if (e3) throw e3;

      const me = stats && stats[0] ? stats[0] : null;
      const enriched = me ? { ...me, image_full_url: photoUrl(me.image_url) } : null;
      setProfile(enriched);

      const lbEnriched = (lb || []).map((r) => ({
        ...r,
        image_full_url: photoUrl(r.image_url),
      }));
      setLeaderboard(lbEnriched);

      setRecap(rc && rc[0] ? rc[0] : null);
      setError('');
      setLiveStatus('live');
    } catch (err) {
      console.warn('Fetch /me error', err);
      setError(err.message || 'Lien invalide');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAll();
    let lastFetch = Date.now();
    const channel = supabase
      .channel('me-' + token)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stats_counters' },
        () => {
          // Debounce léger pour éviter 18 fetchs en cas de reset
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

    const interval = setInterval(fetchAll, POLL_INTERVAL);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [token, fetchAll]);

  // Préparer la liste d'affichage : top 5 + ma ligne si hors top 5
  const visibleRows = useMemo(() => {
    if (!leaderboard.length) return [];
    const top5 = leaderboard.slice(0, 5);
    if (!profile) return top5;
    const myIdInLb = leaderboard.find((r) => r.profile_id === profile.profile_id);
    const myRank = Number(profile.rank_likes);
    if (myRank <= 5) return top5;
    return [...top5, { isDivider: true }, myIdInLb || profile];
  }, [leaderboard, profile]);

  const liveLabel =
    liveStatus === 'live' ? 'EN DIRECT' : liveStatus === 'offline' ? 'DÉCONNECTÉ' : 'RECONNEXION';

  if (loading) {
    return (
      <div className="me-page-v2">
        <div className="me-loading">Chargement…</div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="me-page-v2">
        <div className="me-error-box">
          <h2>Lien invalide</h2>
          <p>{error || 'Ce lien ne correspond à aucun profil actif. Contacte PYC pour récupérer ton lien personnel.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="me-page-v2">
      <header className="me-header-v2">
        <Logo />
        <LiveDot label={liveLabel} status={liveStatus} />
      </header>

      <DirectorRankCard profile={profile} leaderboard={leaderboard} />

      <div className="me-stats-grid">
        <StatCounter value={profile.likes} label="Likes" color="pink" />
        <StatCounter value={profile.details_views} label="Détails vus" color="blue" />
        <StatCounter value={profile.vcard_downloads} label="vCards" color="green" />
      </div>

      <section className="me-section">
        <div className="me-section-label">Top 5 du moment</div>
        <div className="me-lb">
          {visibleRows.map((row, i) => {
            if (row.isDivider) {
              return <div key={`d-${i}`} className="me-lb-divider">⋮</div>;
            }
            const isMe = row.profile_id === profile.profile_id;
            return (
              <LeaderboardRow
                key={row.profile_id}
                variant="director"
                rank={Number(row.rank_likes)}
                name={isMe ? 'Toi' : row.name}
                imageUrl={row.image_full_url}
                likes={row.likes ?? 0}
                isMe={isMe}
              />
            );
          })}
        </div>
      </section>

      <RecapSection recap={recap} />

      <div className="me-footer">Actualisation automatique · {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
    </div>
  );
}

function RecapSection({ recap }) {
  if (!recap) return null;
  if (recap.is_first_day) {
    return (
      <section className="me-section">
        <div className="me-section-label">Aujourd'hui</div>
        <div className="me-empty-recap">
          Le congrès commence aujourd'hui — fais-toi remarquer !
        </div>
      </section>
    );
  }
  const noActivity = !recap.likes && !recap.details && !recap.vcards;
  if (noActivity) {
    return (
      <section className="me-section">
        <div className="me-section-label">Récap hier</div>
        <div className="me-empty-recap">
          Pas de match hier — c'est l'occasion de te démarquer aujourd'hui.
        </div>
      </section>
    );
  }
  return (
    <section className="me-section">
      <div className="me-section-label">Récap hier</div>
      <div className="me-recap">
        <div className="me-recap-rank">
          <div className="me-recap-n">#{recap.rank_yesterday}</div>
          <div className="me-recap-l">Classement</div>
        </div>
        <div className="me-recap-div" />
        <div className="me-recap-stats">
          <div>
            <span className="me-recap-pink">{recap.likes}</span> like{recap.likes > 1 ? 's' : ''} ·{' '}
            <span className="me-recap-blue">{recap.details}</span> détail{recap.details > 1 ? 's' : ''} vu{recap.details > 1 ? 's' : ''}
          </div>
          <div>
            <strong>{recap.vcards}</strong> vCard{recap.vcards > 1 ? 's' : ''} téléchargée{recap.vcards > 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </section>
  );
}
