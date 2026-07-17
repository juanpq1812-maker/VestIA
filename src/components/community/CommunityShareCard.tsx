// Card de un outfit compartido en el feed de /comunidad — foto real, autor,
// like y seguir. El botón de reportar abre ReportShareModal.

"use client";

import { useState, useTransition } from "react";
import {
  toggleCommunityLikeAction,
  toggleFollowAction,
} from "@/lib/community/actions";
import ReportShareModal from "@/components/community/ReportShareModal";
import type { CommunityShareFeedItem } from "@/lib/community/query";

type Props = {
  share: CommunityShareFeedItem;
};

export default function CommunityShareCard({ share }: Props) {
  const [isLikePending, startLike] = useTransition();
  const [isFollowPending, startFollow] = useTransition();
  const [liked, setLiked] = useState(share.likedByMe);
  const [likeCount, setLikeCount] = useState(share.like_count);
  const [following, setFollowing] = useState(share.isFollowingAuthor);
  const [reportOpen, setReportOpen] = useState(false);

  function onToggleLike() {
    // Optimista: la UI cambia de inmediato, se revierte si el server falla.
    const prevLiked = liked;
    const prevCount = likeCount;
    setLiked(!prevLiked);
    setLikeCount(prevCount + (prevLiked ? -1 : 1));
    startLike(async () => {
      const res = await toggleCommunityLikeAction(share.id);
      if (res.ok) {
        setLiked(res.liked);
        setLikeCount(res.newLikeCount);
      } else {
        setLiked(prevLiked);
        setLikeCount(prevCount);
      }
    });
  }

  function onToggleFollow() {
    const prev = following;
    setFollowing(!prev);
    startFollow(async () => {
      const res = await toggleFollowAction(share.user_id);
      if (res.ok) {
        setFollowing(res.following);
      } else {
        setFollowing(prev);
      }
    });
  }

  const autor = share.isOwnShare ? "Tú" : share.author_display_name?.trim() || "Alguien de la comunidad";

  return (
    <div className="group overflow-hidden rounded-xl border border-border bg-surface shadow-sm transition-shadow duration-200 hover:shadow-md">
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-surface-2">
        {share.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={share.photoUrl}
            alt={`Look compartido por ${autor}`}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-text-faint">
            Foto no disponible
          </div>
        )}

        {!share.isOwnShare && (
          <button
            type="button"
            onClick={() => setReportOpen(true)}
            aria-label="Reportar contenido"
            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-surface/90 text-text-muted shadow-sm backdrop-blur transition-colors hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 21V4" />
              <path d="M5 4h13l-2.5 4L18 12H5" />
            </svg>
          </button>
        )}
      </div>

      <div className="p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold text-text">{autor}</p>
          {!share.isOwnShare && (
            <button
              type="button"
              onClick={onToggleFollow}
              disabled={isFollowPending}
              aria-pressed={following}
              className={[
                "shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition-all duration-150",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                following
                  ? "border border-primary bg-primary text-white shadow-sm"
                  : "border border-border bg-surface text-text-muted hover:border-primary-mid hover:bg-surface-2 hover:text-text",
              ].join(" ")}
            >
              {following ? "Siguiendo" : "Seguir"}
            </button>
          )}
        </div>

        {share.caption && (
          <p className="mt-1 line-clamp-2 text-xs text-text-muted">{share.caption}</p>
        )}

        <button
          type="button"
          onClick={onToggleLike}
          disabled={isLikePending}
          aria-pressed={liked}
          className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold text-text-muted transition-colors hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill={liked ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={liked ? "text-danger" : ""}
          >
            <path d="M12 20.5s-7-4.35-9.5-8.7C.8 8.7 2 5 5.3 4.2c2-.5 3.9.4 4.7 2 .8-1.6 2.7-2.5 4.7-2 3.3.8 4.5 4.5 2.8 7.6C19 16.15 12 20.5 12 20.5Z" />
          </svg>
          <span className={liked ? "text-danger" : ""}>{likeCount}</span>
        </button>
      </div>

      {reportOpen && (
        <ReportShareModal shareId={share.id} onClose={() => setReportOpen(false)} />
      )}
    </div>
  );
}
