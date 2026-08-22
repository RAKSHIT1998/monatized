"use client";

import { useState } from "react";
import { toast } from "sonner";
import { addAvailabilityRule, removeAvailabilityRule } from "@/app/actions/bookings";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export type AvailabilityRuleRow = {
  id: string;
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
};

function formatMinutes(minutes: number) {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

export function AvailabilityPanel({
  productId,
  rules,
}: {
  productId: string;
  rules: AvailabilityRuleRow[];
}) {
  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [pending, setPending] = useState(false);

  function toMinutes(time: string) {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  }

  async function handleAdd() {
    setPending(true);
    try {
      const formData = new FormData();
      formData.set("dayOfWeek", dayOfWeek);
      formData.set("startMinute", String(toMinutes(startTime)));
      formData.set("endMinute", String(toMinutes(endTime)));
      await addAvailabilityRule(productId, formData);
      toast.success("Availability window added.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't add that window.");
    } finally {
      setPending(false);
    }
  }

  async function handleRemove(ruleId: string) {
    try {
      await removeAvailabilityRule(ruleId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't remove that window.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">
        All times are in UTC. Buyers see slots for the next 14 days based on these weekly windows.
      </p>

      {rules.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="flex items-center justify-between rounded-md border px-3 py-1.5 text-sm"
            >
              <span>
                {DAY_LABELS[rule.dayOfWeek]} {formatMinutes(rule.startMinute)}–
                {formatMinutes(rule.endMinute)} UTC
              </span>
              <button
                type="button"
                onClick={() => handleRemove(rule.id)}
                className="text-muted-foreground hover:text-destructive"
                aria-label={`Remove ${DAY_LABELS[rule.dayOfWeek]} window`}
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="availabilityDay" className="text-xs text-muted-foreground">
            Day
          </label>
          <select
            id="availabilityDay"
            value={dayOfWeek}
            onChange={(e) => setDayOfWeek(e.target.value)}
            className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
          >
            {DAY_LABELS.map((label, index) => (
              <option key={label} value={index}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="availabilityFrom" className="text-xs text-muted-foreground">
            From (UTC)
          </label>
          <input
            id="availabilityFrom"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="availabilityTo" className="text-xs text-muted-foreground">
            To (UTC)
          </label>
          <input
            id="availabilityTo"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
          />
        </div>
        <Button type="button" size="sm" disabled={pending} onClick={handleAdd}>
          Add window
        </Button>
      </div>

      {rules.length === 0 && <Badge variant="secondary">No availability set yet</Badge>}
    </div>
  );
}
