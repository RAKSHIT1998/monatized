"use client";

import { useEffect, useState } from "react";

type Line = { item: string; amount: string };

const LINE_ITEMS: Line[] = [
  { item: "Fitness Guide PDF", amount: "499" },
  { item: "Notion Planner Template", amount: "299" },
  { item: "Lightroom Presets (10)", amount: "399" },
  { item: "1:1 Coaching Call", amount: "1,999" },
  { item: "Ebook — Cook At Home", amount: "249" },
  { item: "Beat Pack Vol. 3", amount: "799" },
  { item: "Resume Review", amount: "999" },
];

function parseAmount(amount: string) {
  return Number(amount.replace(/,/g, ""));
}

function formatTotal(total: number) {
  return total.toLocaleString("en-IN");
}

export function ReceiptTicker() {
  const [visibleCount, setVisibleCount] = useState(1);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisibleCount((count) => {
        if (count >= LINE_ITEMS.length) {
          setCycle((c) => c + 1);
          return 1;
        }
        return count + 1;
      });
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  const visibleLines = LINE_ITEMS.slice(0, visibleCount);
  const total = visibleLines.reduce((sum, line) => sum + parseAmount(line.amount), 0);

  return (
    <div className="relative mx-auto w-full max-w-[320px] rotate-2 select-none">
      <div
        className="relative bg-[#f7f5ee] px-6 pt-7 pb-8 text-[#2a2a22] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)]"
        style={{
          clipPath:
            "polygon(0% 0%, 100% 0%, 100% 97%, 96% 100%, 92% 97%, 88% 100%, 84% 97%, 80% 100%, 76% 97%, 72% 100%, 68% 97%, 64% 100%, 60% 97%, 56% 100%, 52% 97%, 48% 100%, 44% 97%, 40% 100%, 36% 97%, 32% 100%, 28% 97%, 24% 100%, 20% 97%, 16% 100%, 12% 97%, 8% 100%, 4% 97%, 0% 100%)",
        }}
      >
        <p className="font-[family-name:var(--font-mono-ui)] text-[11px] tracking-[0.2em] text-[#8a8a7a]">
          MONETIZED
        </p>
        <p className="font-[family-name:var(--font-mono-ui)] text-[11px] tracking-[0.15em] text-[#8a8a7a]">
          SALE RECEIPT
        </p>
        <div className="my-4 border-t border-dashed border-[#c9c7ba]" />

        <div className="flex min-h-[168px] flex-col gap-2.5">
          {visibleLines.map((line, i) => (
            <div
              key={`${cycle}-${i}`}
              className="flex items-baseline justify-between gap-3 font-[family-name:var(--font-mono-ui)] text-[12px] leading-tight text-[#3a3a2e] animate-in fade-in slide-in-from-top-1 duration-500"
            >
              <span className="truncate">1x {line.item}</span>
              <span className="shrink-0 tabular-nums">₹{line.amount}</span>
            </div>
          ))}
        </div>

        <div className="my-4 border-t border-dashed border-[#c9c7ba]" />
        <div className="flex items-baseline justify-between font-[family-name:var(--font-mono-ui)]">
          <span className="text-[13px] tracking-[0.1em] text-[#3a3a2e]">TOTAL</span>
          <span className="text-lg font-bold tabular-nums text-[#1c6b3c]">
            ₹{formatTotal(total)}
          </span>
        </div>
      </div>
    </div>
  );
}
