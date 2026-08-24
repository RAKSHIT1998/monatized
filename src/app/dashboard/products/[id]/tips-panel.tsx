import { formatMoney } from "@/lib/money";
import { Heart } from "lucide-react";

type Tip = {
  id: string;
  email: string;
  amountMinor: number;
  currency: string;
  buyerNote: string | null;
  createdAt: string;
};

export function TipsPanel({ tips }: { tips: Tip[] }) {
  if (tips.length === 0) {
    return <p className="p-4 text-sm text-muted-foreground">No tips yet.</p>;
  }

  return (
    <div className="flex flex-col divide-y">
      {tips.map((tip) => (
        <div key={tip.id} className="flex items-start gap-3 p-4">
          <Heart className="mt-0.5 size-4 shrink-0 text-rose-500" />
          <div className="flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-medium">{tip.email}</p>
              <p className="shrink-0 text-sm tabular-nums">{formatMoney(tip.amountMinor, tip.currency)}</p>
            </div>
            {tip.buyerNote && <p className="mt-0.5 text-sm text-muted-foreground">&ldquo;{tip.buyerNote}&rdquo;</p>}
            <p className="mt-0.5 text-xs text-muted-foreground">
              {new Date(tip.createdAt).toLocaleDateString("en-IN", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
