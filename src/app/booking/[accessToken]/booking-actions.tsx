"use client";

import { useState } from "react";
import { toast } from "sonner";
import { cancelBookingAsMember } from "@/app/actions/bookings";
import { Button } from "@/components/ui/button";

export function BookingActions({ accessToken }: { accessToken: string }) {
  const [pending, setPending] = useState(false);

  async function handleCancel() {
    if (!window.confirm("Cancel this booking?")) return;
    setPending(true);
    try {
      await cancelBookingAsMember(accessToken);
      toast.success("Booking cancelled.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't cancel booking.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button variant="outline" disabled={pending} onClick={handleCancel}>
      Cancel booking
    </Button>
  );
}
