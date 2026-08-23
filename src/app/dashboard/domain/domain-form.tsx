"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";
import { checkCustomDomainVerification, removeCustomDomain, setCustomDomain } from "@/app/actions/domains";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type DomainRecord = {
  domain: string;
  verificationToken: string;
  status: "PENDING" | "VERIFIED" | "FAILED";
} | null;

export function DomainForm({ record }: { record: DomainRecord }) {
  const [state, formAction, pending] = useActionState(setCustomDomain, undefined);
  const [checking, setChecking] = useState(false);
  const [removing, setRemoving] = useState(false);

  async function handleCheck() {
    setChecking(true);
    try {
      const verified = await checkCustomDomainVerification();
      toast[verified ? "success" : "error"](
        verified ? "Domain verified!" : "TXT record not found yet — DNS can take a few minutes to propagate.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't check verification.");
    } finally {
      setChecking(false);
    }
  }

  async function handleRemove() {
    if (!window.confirm("Disconnect this domain?")) return;
    setRemoving(true);
    try {
      await removeCustomDomain();
      toast.success("Domain disconnected.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't remove domain.");
    } finally {
      setRemoving(false);
    }
  }

  if (!record) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Connect a domain</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="domain">Domain</Label>
              <Input id="domain" name="domain" placeholder="store.yourbrand.com" />
              {state?.errors?.domain && (
                <p className="text-sm text-destructive">{state.errors.domain[0]}</p>
              )}
            </div>
            <Button type="submit" disabled={pending} className="w-fit">
              {pending ? "Connecting…" : "Connect domain"}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>{record.domain}</CardTitle>
        <Badge
          variant={
            record.status === "VERIFIED" ? "default" : record.status === "FAILED" ? "destructive" : "secondary"
          }
        >
          {record.status === "VERIFIED" ? "Verified" : record.status === "FAILED" ? "Not verified" : "Pending"}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {record.status !== "VERIFIED" && (
          <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-3 text-sm">
            <p className="font-medium">Add this DNS TXT record</p>
            <p className="text-muted-foreground">
              Host: <code className="rounded bg-background px-1 py-0.5">_monetized-verify</code>
            </p>
            <p className="text-muted-foreground">
              Value: <code className="rounded bg-background px-1 py-0.5">{record.verificationToken}</code>
            </p>
            <p className="text-xs text-muted-foreground">
              After adding it, click Verify — DNS changes can take a few minutes to propagate.
            </p>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Verifying proves you own this domain. To actually route traffic here, also point the
          domain&apos;s DNS (a CNAME or A record, per your DNS provider&apos;s instructions) at
          wherever this app is deployed.
        </p>

        <div className="flex gap-2">
          {record.status !== "VERIFIED" && (
            <Button size="sm" disabled={checking} onClick={handleCheck}>
              {checking ? "Checking…" : "Verify"}
            </Button>
          )}
          <Button size="sm" variant="outline" disabled={removing} onClick={handleRemove}>
            Disconnect
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
