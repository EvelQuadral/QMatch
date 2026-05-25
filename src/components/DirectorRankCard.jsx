import React from 'react';
import './DirectorRankCard.css';

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

/**
 * Calcule un message contextuel selon le rang et le contexte de likes.
 * leaderboard = array de profils triés par likes desc (index 0 = #1)
 */
function getRankMessage(rank, total, myLikes, leaderboard) {
  if (!rank || total === 0) {
    return {
      title: 'En attente du congrès',
      sub: 'Tes chiffres apparaîtront ici dès la première interaction.',
    };
  }

  if (rank === 1) {
    const next = leaderboard.find((r) => r.rank_likes > 1);
    const gap = next ? myLikes - (next.likes ?? 0) : myLikes;
    return {
      title: 'Tu es leader 👑',
      sub: gap > 0 ? `${gap} like${gap > 1 ? 's' : ''} d'avance sur #2` : 'Ex-aequo au sommet',
    };
  }

  if (rank === 2 || rank === 3) {
    const above = leaderboard.find((r) => r.rank_likes === rank - 1);
    const gap = above ? (above.likes ?? 0) - myLikes + 1 : 1;
    return {
      title: 'Sur le podium !',
      sub: gap > 0
        ? `Plus que ${gap} like${gap > 1 ? 's' : ''} pour passer #${rank - 1}`
        : `Ex-aequo avec #${rank - 1}`,
    };
  }

  if (rank <= 10) {
    const third = leaderboard.find((r) => r.rank_likes === 3);
    const gap = third ? (third.likes ?? 0) - myLikes + 1 : 0;
    return {
      title: 'Au cœur de la course',
      sub: gap > 0 ? `À ${gap} like${gap > 1 ? 's' : ''} du podium` : 'Le podium est en vue',
    };
  }

  return {
    title: 'Encore tout à jouer',
    sub: `${myLikes} like${myLikes > 1 ? 's' : ''} — chaque rencontre compte`,
  };
}

export default function DirectorRankCard({ profile, leaderboard }) {
  const myLikes = profile.likes ?? 0;
  const rank = Number(profile.rank_likes);
  const total = Number(profile.total_profiles);
  const msg = getRankMessage(rank, total, myLikes, leaderboard);

  return (
    <div className="rank-card">
      <div className="rank-blob rank-blob-1" aria-hidden="true" />
      <div className="rank-blob rank-blob-2" aria-hidden="true" />

      <div className="rank-id">
        <div className="rank-id-av">
          {profile.image_url ? (
            <img src={profile.image_full_url || profile.image_url} alt={profile.name} />
          ) : (
            <span>{getInitials(profile.name)}</span>
          )}
        </div>
        <div className="rank-id-text">
          <div className="rank-id-name">{profile.name}</div>
          <div className="rank-id-sub">{profile.title || 'Quadral'}</div>
        </div>
      </div>

      <div className="rank-big">
        <span className="rank-number">#{rank || '—'}</span>
        <span className="rank-total">/ {total || '?'}</span>
      </div>

      <div className="rank-msg">
        <div className="rank-msg-title">{msg.title}</div>
        <div className="rank-msg-sub">{msg.sub}</div>
      </div>
    </div>
  );
}
