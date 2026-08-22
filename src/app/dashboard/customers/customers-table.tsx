"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CustomerEditDialog } from "./customer-edit-dialog";

export type CustomerRow = {
  id: string;
  email: string;
  name: string | null;
  tags: string[];
  ordersCount: number;
  totalSpentLabel: string;
  since: string;
  notes: string | null;
};

export function CustomersTable({ customers }: { customers: CustomerRow[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return customers;
    return customers.filter(
      (c) =>
        c.email.toLowerCase().includes(query) ||
        c.name?.toLowerCase().includes(query) ||
        c.tags.some((tag) => tag.includes(query)),
    );
  }, [customers, search]);

  return (
    <div className="flex flex-col gap-3">
      <Input
        placeholder="Search by email, name, or tag…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-xs"
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Tags</TableHead>
            <TableHead>Orders</TableHead>
            <TableHead>Total spent</TableHead>
            <TableHead>Since</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((customer) => (
            <TableRow key={customer.id}>
              <TableCell>{customer.email}</TableCell>
              <TableCell>{customer.name ?? "—"}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {customer.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell>{customer.ordersCount}</TableCell>
              <TableCell>{customer.totalSpentLabel}</TableCell>
              <TableCell className="text-muted-foreground">{customer.since}</TableCell>
              <TableCell>
                <CustomerEditDialog
                  customerId={customer.id}
                  email={customer.email}
                  tags={customer.tags}
                  notes={customer.notes}
                />
              </TableCell>
            </TableRow>
          ))}
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                No customers match &quot;{search}&quot;.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
