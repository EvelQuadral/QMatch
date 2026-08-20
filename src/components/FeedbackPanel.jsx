import React, { useState, useCallback, useMemo } from 'react';
import { Star, Download, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import './FeedbackPanel.css';

const RATINGS = [5, 4, 3, 2, 1];

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Section « Retours visiteurs » du dashboard admin.
 *
 * Deux niveaux de lecture :
 *  • Le résumé (note moyenne + répartition) vient de `stats`, rafraîchi par le
 *    fetch global du dashboard — coût négligeable, c'est une agrégation SQL.
 *  • Les commentaires sont chargés à la demande via admin_export_feedback(),
 *    qui renvoie TOUTES les lignes. On ne veut pas de ça dans le fetch live
 *    déclenché à chaque événement Realtime : d'où le chargement paresseux.
 */
export default function FeedbackPanel({ stats, password, onToast, onExport }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState(null); // null = jamais chargé
  const [busy, setBusy] = useState(false);

  const total = Number(stats?.total_count) || 0;
  const avg = stats?.avg_rating != null ? Number(stats.avg_rating) : null;

  const counts = useMemo(
    () => ({
      5: Number(stats?.rating_5) || 0,
      4: Number(stats?.rating_4) || 0,
      3: Number(stats?.rating_3) || 0,
      2: Number(stats?.rating_2) || 0,
      1: Number(stats?.rating_1) || 0,
    }),
    [stats]
  );

  const loadRows = useCallback(async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc('admin_export_feedback', {
        p_password: password,
      });
      if (error) throw error;
      setRows(data || []);
      return data || [];
    } catch (err) {
      onToast?.({ message: 'Erreur chargement des retours', type: 'error' });
      return null;
    } finally {
      setBusy(false);
    }
  }, [password, onToast]);

  const toggle = async () => {
    if (!open && rows === null) await loadRows();
    setOpen((o) => !o);
  };

  // L'écriture du CSV vit dans Admin.jsx (helper partagé avec les autres
  // exports) : on lui remonte simplement les lignes.
  const exportCSV = async () => {
    const data = rows === null ? await loadRows() : rows;
    if (!data) return;
    onExport?.(data);
  };

  const comments = (rows || []).filter((r) => r.comment && r.comment.trim());

  if (total === 0) {
    return (
      <div className="fbp">
        <div className="fbp-empty">Aucun retour visiteur pour l’instant.</div>
      </div>
    );
  }

  return (
    <div className="fbp">
      <div className="fbp-summary">
        <div className="fbp-score">
          <div className="fbp-score-n">
            {avg != null ? avg.toFixed(1).replace('.', ',') : '—'}
          </div>
          <div className="fbp-score-stars" aria-label={`Note moyenne ${avg} sur 5`}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                size={11}
                fill={avg != null && avg >= n - 0.5 ? 'currentColor' : 'none'}
                strokeWidth={avg != null && avg >= n - 0.5 ? 0 : 1.6}
              />
            ))}
          </div>
          <div className="fbp-score-total">
            {total} avis
          </div>
        </div>

        <div className="fbp-bars">
          {RATINGS.map((r) => {
            const c = counts[r];
            const pct = total > 0 ? Math.round((c / total) * 100) : 0;
            return (
              <div className="fbp-bar-row" key={r}>
                <span className="fbp-bar-label">{r}</span>
                <div className="fbp-bar-track">
                  <div className="fbp-bar-fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="fbp-bar-count">{c}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="fbp-actions">
        <button type="button" className="fbp-toggle" onClick={toggle} disabled={busy}>
          <span>
            {busy
              ? 'Chargement…'
              : open
              ? 'Replier les commentaires'
              : rows === null
              ? 'Voir les commentaires'
              : `Voir les ${comments.length} commentaire${comments.length > 1 ? 's' : ''}`}
          </span>
          <ChevronDown size={13} className={open ? 'fbp-chev open' : 'fbp-chev'} />
        </button>
        <button type="button" className="fbp-export" onClick={exportCSV} title="Export CSV des retours">
          <Download size={13} />
        </button>
      </div>

      {open && (
        <div className="fbp-list">
          {comments.length === 0 ? (
            <div className="fbp-empty">
              {total} note{total > 1 ? 's' : ''}, mais aucun commentaire écrit.
            </div>
          ) : (
            comments.map((c, i) => (
              <div className="fbp-item" key={i}>
                <div className="fbp-item-head">
                  <span className={`fbp-item-rating r${c.rating}`}>
                    {c.rating}
                    <Star size={9} fill="currentColor" strokeWidth={0} />
                  </span>
                  <span className="fbp-item-date">{formatDate(c.created_at)}</span>
                </div>
                <p className="fbp-item-text">{c.comment}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
