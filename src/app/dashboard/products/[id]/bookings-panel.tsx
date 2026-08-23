"use client";

import { useState } from "react";
import { toast } from "sonner";
import { cancelBookingByCreator } from "@/app/actions/bookings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type BookingRow = {
  id: string;
  email: string;
  startsAt: string;
  status: "CONFIRMED" | "CANCELLED";
};

export function BookingsPanel({ bookings }: { bookings: BookingRow[] }) {
  if (bookings.length === 0) {
    return <p className="text-sm text-muted-foreground">No bookings yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Customer</TableHead>
          <TableHead>When</TableHead>
          <TableHead>Status</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {bookings.map((booking) => (
          <BookingRowItem key={booking.id} booking={booking} />
        ))}
      </TableBody>
    </Table>
  );
}

function BookingRowItem({ booking }: { booking: BookingRow }) {
  const [pending, setPending] = useState(false);

  async function handleCancel() {
    if (!window.confirm(`Cancel ${booking.email}'s booking?`)) return;
    setPending(true);
    try {
      await cancelBookingByCreator(booking.id);
      toast.success("Booking cancelled.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't cancel booking.");
    } finally {
      setPending(false);
    }
  }

  return (
    <TableRow>
      <TableCell>{booking.email}</TableCell>
      {/* Explicit locale — Client Component, rendered on both server and client;
          an implicit locale can format differently in each and trigger a
          hydration mismatch (see posts-list.tsx for the observed failure mode). */}
      <TableCell className="text-muted-foreground">
        {new Date(booking.startsAt).toLocaleString("en-IN", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })}
      </TableCell>
      <TableCell>
        <Badge variant={booking.status === "CONFIRMED" ? "default" : "outline"}>
          {booking.status === "CONFIRMED" ? "Confirmed" : "Cancelled"}
        </Badge>
      </TableCell>
      <TableCell>
        {booking.status === "CONFIRMED" && (
          <Button size="sm" variant="ghost" disabled={pending} onClick={handleCancel}>
            Cancel
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}
