"""
Hybrid Recommendation Engine
─────────────────────────────
Phase 1 (cold start): TF-IDF content similarity + location match
Phase 2 (50+ views):  + item-item collaborative filtering
"""
from __future__ import annotations
import math, re
from collections import defaultdict
from typing import List, Optional
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy.orm import Session
from app.models.models import Product, User, ViewEvent

MIN_INTERACTIONS  = 50
MAX_RESULTS       = 12
RECENCY_HALF_LIFE = 7


def _location_overlap(a: Optional[str], b: Optional[str]) -> float:
    def tokens(s):
        return set(re.sub(r"[,]+", " ", s or "").lower().split())
    ta, tb = tokens(a), tokens(b)
    if not ta or not tb:
        return 0.0
    return len(ta & tb) / len(ta | tb)


def _recency_weight(days_ago: float) -> float:
    return math.exp(-days_ago * math.log(2) / RECENCY_HALF_LIFE)


def _corpus(products: list) -> list:
    return [" ".join([p.name or "", (p.category or "") * 3, p.description or "", p.location or ""]).lower()
            for p in products]


class RecommendationEngine:

    def recommend(self, db: Session, user_id: str, context_product_id: Optional[str] = None, limit: int = MAX_RESULTS) -> list:
        user         = db.query(User).filter(User.id == user_id).first()
        all_products = db.query(Product).filter(Product.is_active == True, Product.in_stock == True).all()
        if not all_products:
            return []

        all_events        = db.query(ViewEvent).all()
        total_interactions = len(all_events)
        user_viewed_ids   = {e.product_id for e in all_events if e.user_id == user_id}
        product_ids       = [p.id for p in all_products]
        id_to_idx         = {pid: i for i, pid in enumerate(product_ids)}

        # ── TF-IDF content similarity ─────────────────────────────────────────
        vectorizer   = TfidfVectorizer(ngram_range=(1, 2), min_df=1, sublinear_tf=True)
        tfidf_matrix = vectorizer.fit_transform(_corpus(all_products))

        if context_product_id and context_product_id in id_to_idx:
            ref = tfidf_matrix[id_to_idx[context_product_id]]
        elif user_viewed_ids:
            idxs = [id_to_idx[p] for p in user_viewed_ids if p in id_to_idx]
            ref  = tfidf_matrix[idxs].mean(axis=0)
        else:
            ref = tfidf_matrix.mean(axis=0)

        content_sims    = cosine_similarity(ref, tfidf_matrix)[0]
        location_scores = np.array([_location_overlap(user.location if user else None, p.location) for p in all_products])

        # ── Collaborative filtering ───────────────────────────────────────────
        collab_scores = np.zeros(len(all_products))
        use_collab    = total_interactions >= MIN_INTERACTIONS

        if use_collab:
            collab_scores = self._collab(all_events, user_viewed_ids, product_ids, id_to_idx)

        collab_weight   = 0.0
        if use_collab:
            ramp          = min(total_interactions / (5 * MIN_INTERACTIONS), 1.0)
            collab_weight = 0.35 * ramp
        content_weight  = 0.55 - collab_weight * 0.2
        location_weight = 0.20

        final_scores = content_weight * content_sims + collab_weight * collab_scores + location_weight * location_scores

        exclude = {context_product_id} if context_product_id else set()
        if user_viewed_ids and len(all_products) > limit:
            exclude |= user_viewed_ids

        ranked = sorted(
            [(p, float(final_scores[id_to_idx[p.id]])) for p in all_products if p.id not in exclude and p.id in id_to_idx],
            key=lambda x: x[1], reverse=True,
        )[:limit]

        return [{"product": p, "score": round(s, 4), "reason": self._reason(s, collab_weight, location_scores[id_to_idx[p.id]], user.location if user else None)}
                for p, s in ranked]

    def _collab(self, all_events, user_viewed_ids, product_ids, id_to_idx):
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        upw: dict = defaultdict(dict)
        for e in all_events:
            days = (now - e.viewed_at.replace(tzinfo=timezone.utc)).days
            w    = _recency_weight(days)
            upw[e.user_id][e.product_id] = max(upw[e.user_id].get(e.product_id, 0.0), w)

        viewers: dict = defaultdict(set)
        for uid, prods in upw.items():
            for pid in prods:
                viewers[pid].add(uid)

        scores = np.zeros(len(product_ids))
        for viewed_pid in user_viewed_ids:
            for uid in viewers.get(viewed_pid, set()):
                for pid, w in upw[uid].items():
                    if pid in id_to_idx and pid not in user_viewed_ids:
                        scores[id_to_idx[pid]] += w

        mx = scores.max()
        if mx > 0:
            scores /= mx
        return scores

    @staticmethod
    def _reason(score, collab_weight, location_score, user_location):
        if collab_weight > 0.1 and score > 0.5:
            return "Popular with customers like you"
        if location_score > 0.5 and user_location:
            return f"Near you in {user_location}"
        if score > 0.4:
            return "Similar to what you've viewed"
        return "You might like this"


engine = RecommendationEngine()
