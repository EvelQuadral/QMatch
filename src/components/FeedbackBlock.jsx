import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useSession } from '../hooks/useSession';
import './FeedbackBlock.css';

const MAX_COMMENT = 250;

export default function FeedbackBlock() {
  const sessionId = useSession();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState('idle'); // 'idle' | 'submitting' | 'sent' | 'error'
  const [errorMsg, setErrorMsg] = useState('');

  const title =
    status === 'sent'
      ? 'Merci !'
      : rating === 0
      ? 'Un retour à nous laisser ?'
      : rating <= 2
      ? 'Que peut-on améliorer ?'
      : 'Merci pour votre retour !';

  const subtitle =
    status === 'sent'
      ? 'Vos retours nous aident à améliorer l’expérience.'
      : rating === 0
      ? 'Votre note nous aide à améliorer l’expérience.'
      : rating <= 2
      ? 'Vos remarques nous sont précieuses.'
      : 'Un mot pour qu’on s’améliore ?';

  const submit = async () => {
    if (rating === 0 || status === 'submitting') return;
    setStatus('submitting');
    setErrorMsg('');
    try {
      const { error } = await supabase.rpc('submit_feedback', {
        p_rating: rating,
        p_comment: comment.trim() || null,
        p_session_id: sessionId,
      });
      if (error) throw error;
      setStatus('sent');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message || 'Erreur lors de l’envoi');
    }
  };

  return (
    <div className="fb-block">
      <div className="fb-title">{title}</div>
      <div className="fb-sub">{subtitle}</div>

      <div className="fb-stars">
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = (hover || rating) >= n;
          return (
            <button
              key={n}
              type="button"
              className={`fb-star ${filled ? 'filled' : ''}`}
              onMouseEnter={() => status !== 'sent' && setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => status !== 'sent' && setRating(n)}
              disabled={status === 'sent'}
              aria-label={`Note ${n} sur 5`}
            >
              <Star
                size={28}
                fill={filled ? 'currentColor' : 'none'}
                strokeWidth={filled ? 0 : 1.5}
              />
            </button>
          );
        })}
      </div>

      {rating > 0 && status !== 'sent' && (
        <div className="fb-input-wrap">
          <textarea
            className="fb-textarea"
            placeholder="Votre commentaire (optionnel)..."
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, MAX_COMMENT))}
            maxLength={MAX_COMMENT}
            rows={3}
            disabled={status === 'submitting'}
          />
          <div className="fb-counter">
            {comment.length} / {MAX_COMMENT}
          </div>
          <div className="fb-footer">
            <span className="fb-anon">Anonyme</span>
            <button
              type="button"
              className="fb-send"
              onClick={submit}
              disabled={status === 'submitting'}
            >
              {status === 'submitting' ? 'Envoi…' : 'Envoyer'}
            </button>
          </div>
          {status === 'error' && <div className="fb-error">{errorMsg}</div>}
        </div>
      )}
    </div>
  );
}
