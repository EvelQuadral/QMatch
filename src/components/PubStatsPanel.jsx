import React, { useEffect, useState, useMemo } from 'react';
import { Heart, X, MousePointerClick } from 'lucide-react';
import './PubStatsPanel.css';

/**
 * Section « Pubs » du dashboard admin.
 *
 * Les compteurs (admin_get_pub_stats) ne contiennent QUE les pubs ayant déjà
 * reçu au moins un événement — une ligne de pub_counters se crée à la volée.
 * On les croise donc avec /pubs/pubs.json, seule source de vérité de la liste :
 * une pub fraîchement ajoutée apparaît immédiatement à zéro plutôt que d'être
 * absente du tableau (ce qui se lirait à tort comme « pas encore déployée »).
 */
export default function PubStatsPanel({ stats = [] }) {
  const [config, setConfig] = useState([]);

  useEffect(() => {
    let cancelled = false;
    fetch('/pubs/pubs.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!cancelled && json?.pubs) setConfig(json.pubs);
      })
      .catch(() => {
        /* pubs.json indisponible : on retombe sur les seuls compteurs */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(() => {
    const byKey = new Map(stats.map((s) => [s.pub_key, s]));

    // 1. Toutes les pubs déclarées dans pubs.json, dans l'ordre du fichier
    const merged = config.map((p) => {
      const key = p.key || p.name;
      const s = byKey.get(key);
      byKey.delete(key);
      return {
        key,
        label: p.display_title || p.name || key,
        logo: p.logo ? `/pubs/${p.logo}` : null,
        likes: Number(s?.likes) || 0,
        passes: Number(s?.passes) || 0,
        clicks: Number(s?.clicks) || 0,
      };
    });

    // 2. Compteurs orphelins : pubs retirées de pubs.json mais dont les stats
    //    historiques existent toujours. On les garde visibles, signalées.
    byKey.forEach((s, key) => {
      merged.push({
        key,
        label: key,
        logo: null,
        orphan: true,
        likes: Number(s.likes) || 0,
        passes: Number(s.passes) || 0,
        clicks: Number(s.clicks) || 0,
      });
    });

    return merged;
  }, [stats, config]);

  if (rows.length === 0) {
    return <div className="pubs-empty">Aucune pub configurée.</div>;
  }

  return (
    <div className="pubs-panel">
      {rows.map((r) => {
        const views = r.likes + r.passes;
        // Taux de clic rapporté aux pubs gardées : on ne peut cliquer le CTA
        // qu'après avoir gardé la carte (depuis la liste des matches ou le sheet).
        const rate = r.likes > 0 ? Math.round((r.clicks / r.likes) * 100) : null;

        return (
          <div className="pub-stat-row" key={r.key}>
            <div className="pub-stat-id">
              <div className="pub-stat-logo">
                {r.logo ? <img src={r.logo} alt="" /> : r.label.slice(0, 3).toUpperCase()}
              </div>
              <div className="pub-stat-name">
                <span>{r.label}</span>
                {r.orphan && <span className="pub-stat-orphan">retirée de pubs.json</span>}
                {!r.orphan && (
                  <span className="pub-stat-views">
                    {views} vue{views > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>

            <div className="pub-stat-metrics">
              <div className="pub-stat-metric pink">
                <Heart size={11} fill="currentColor" strokeWidth={0} />
                <span>{r.likes}</span>
              </div>
              <div className="pub-stat-metric">
                <X size={11} strokeWidth={2.4} />
                <span>{r.passes}</span>
              </div>
              <div className="pub-stat-metric green">
                <MousePointerClick size={11} strokeWidth={2.2} />
                <span>{r.clicks}</span>
                {rate !== null && <em>{rate}%</em>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
