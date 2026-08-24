"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "monetized_celebrated_first_sale";
// Matches the dataviz skill's categorical order (slots 1/3/2/6) — confetti is
// decorative, not data, so a handful of the validated hues is enough; it
// doesn't need the full identity-safe ordering a chart would.
const CONFETTI_COLORS = ["#2a78d6", "#1baf7a", "#eb6834", "#008300"];

type Piece = { id: number; left: number; delay: number; color: string };

export function FirstSaleCelebration({ hasFirstSale }: { hasFirstSale: boolean }) {
  const [pieces, setPieces] = useState<Piece[] | null>(null);

  useEffect(() => {
    if (!hasFirstSale) return;
    let alreadyCelebrated = false;
    try {
      alreadyCelebrated = localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      // Storage can be unavailable (private mode, blocked) — just skip the celebration once.
      alreadyCelebrated = true;
    }
    if (alreadyCelebrated) return;

    // Dev-mode Strict Mode runs this effect, its cleanup, then this effect
    // again (mount → simulated unmount → real mount) to surface exactly this
    // class of bug. Writing the "already celebrated" flag synchronously here
    // — before the deferred timers below actually fire — meant the first
    // pass's timers got cancelled by the simulated cleanup, and the second
    // pass then saw the flag already set and skipped entirely: it never
    // celebrated at all, silently. The flag is now written only once the
    // celebration has actually played out (in the hide timeout below), so a
    // cancelled first pass leaves it unset and the real mount tries again.
    const showTimeout = setTimeout(() => {
      setPieces(
        Array.from({ length: 60 }, (_, i) => ({
          id: i,
          left: Math.random() * 100,
          delay: Math.random() * 0.6,
          color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        })),
      );
    }, 0);
    const hideTimeout = setTimeout(() => {
      setPieces(null);
      try {
        localStorage.setItem(STORAGE_KEY, "true");
      } catch {
        // Nothing to do if storage is unavailable — worst case it celebrates again next visit.
      }
    }, 3200);
    return () => {
      clearTimeout(showTimeout);
      clearTimeout(hideTimeout);
    };
  }, [hasFirstSale]);

  if (!pieces) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className="absolute top-0 size-2 rounded-[2px] opacity-0"
          style={{
            left: `${piece.left}%`,
            backgroundColor: piece.color,
            animation: `confetti-fall 2.6s ease-in ${piece.delay}s forwards`,
          }}
        />
      ))}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-popover px-6 py-4 text-center shadow-lg"
        style={{ animation: "celebration-pop 3.2s ease-out forwards" }}
      >
        <p className="text-lg font-semibold tracking-tight">🎉 You made your first sale!</p>
        <p className="mt-1 text-sm text-muted-foreground">The rest get easier from here.</p>
      </div>

      <style>{`
        @keyframes confetti-fall {
          0% { opacity: 1; transform: translateY(0) rotate(0deg); }
          100% { opacity: 0; transform: translateY(100vh) rotate(240deg); }
        }
        @keyframes celebration-pop {
          0% { opacity: 0; transform: translate(-50%, -40%) scale(0.9); }
          10% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          85% { opacity: 1; }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </div>
  );
}
