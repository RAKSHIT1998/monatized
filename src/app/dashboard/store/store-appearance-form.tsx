"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { updateStoreAppearance } from "@/app/actions/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  displayName: string;
  bio: string;
  primaryColor: string;
  buttonStyle: "solid" | "outline";
  socialLinks: Record<string, string>;
};

export function StoreAppearanceForm({ displayName, bio, primaryColor, buttonStyle, socialLinks }: Props) {
  const [state, formAction, pending] = useActionState(updateStoreAppearance, undefined);

  useEffect(() => {
    if (state !== undefined && !state.errors && !state.message) {
      toast.success("Store updated.");
    }
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="displayName">Name</Label>
            <Input id="displayName" name="displayName" defaultValue={displayName} />
            {state?.errors?.displayName && (
              <p className="text-sm text-destructive">{state.errors.displayName[0]}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" name="bio" rows={3} defaultValue={bio} />
            {state?.errors?.bio && <p className="text-sm text-destructive">{state.errors.bio[0]}</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="primaryColor">Accent color</Label>
            <div className="flex items-center gap-2">
              <input
                id="primaryColor"
                name="primaryColor"
                type="color"
                defaultValue={primaryColor}
                className="h-9 w-14 rounded-md border"
              />
              <span className="text-sm text-muted-foreground">Used for buttons and links</span>
            </div>
            {state?.errors?.primaryColor && (
              <p className="text-sm text-destructive">{state.errors.primaryColor[0]}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="buttonStyle">Button style</Label>
            <select
              id="buttonStyle"
              name="buttonStyle"
              defaultValue={buttonStyle}
              className="h-9 w-40 rounded-md border border-input bg-transparent px-2.5 text-sm"
            >
              <option value="solid">Solid</option>
              <option value="outline">Outline</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Social links</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {(
            [
              ["instagram", "Instagram"],
              ["youtube", "YouTube"],
              ["tiktok", "TikTok"],
              ["twitter", "X / Twitter"],
              ["website", "Website"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="flex flex-col gap-2">
              <Label htmlFor={key}>{label}</Label>
              <Input
                id={key}
                name={key}
                type="url"
                placeholder="https://"
                defaultValue={socialLinks[key] ?? ""}
              />
              {state?.errors?.[key] && (
                <p className="text-sm text-destructive">{state.errors[key][0]}</p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {state?.message && <p className="text-sm text-destructive">{state.message}</p>}
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
