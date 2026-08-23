"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { launchStore, saveBusinessBasics, saveUsername } from "@/app/actions/onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MONETIZATION_CATEGORIES } from "@/lib/constants/categories";

type Profile = {
  username: string;
  displayName: string;
  bio: string | null;
  categories: string[];
  onboardingStep: number;
};

const STEPS = ["Your business", "Claim your URL", "Launch"];

export function OnboardingWizard({ profile }: { profile: Profile }) {
  const [stepIndex, setStepIndex] = useState(Math.min(profile.onboardingStep, 2));
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [categories, setCategories] = useState(profile.categories);
  const [username, setUsername] = useState(profile.username);
  const [bio, setBio] = useState(profile.bio ?? "");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Step {stepIndex + 1} of {STEPS.length}: {STEPS[stepIndex]}
          </span>
          <span>{Math.round(((stepIndex + 1) / STEPS.length) * 100)}% complete</span>
        </div>
        <Progress value={((stepIndex + 1) / STEPS.length) * 100} />
      </div>

      {stepIndex === 0 && (
        <BusinessBasicsStep
          defaultDisplayName={displayName}
          defaultCategories={categories}
          onSuccess={(data) => {
            setDisplayName(data.displayName);
            setCategories(data.categories);
            setStepIndex(1);
          }}
        />
      )}

      {stepIndex === 1 && (
        <ClaimUsernameStep
          defaultUsername={username}
          defaultBio={bio}
          onBack={() => setStepIndex(0)}
          onSuccess={(data) => {
            setUsername(data.username);
            setBio(data.bio);
            setStepIndex(2);
          }}
        />
      )}

      {stepIndex === 2 && (
        <ReviewLaunchStep
          displayName={displayName}
          username={username}
          categories={categories}
          onBack={() => setStepIndex(1)}
        />
      )}
    </div>
  );
}

function BusinessBasicsStep({
  defaultDisplayName,
  defaultCategories,
  onSuccess,
}: {
  defaultDisplayName: string;
  defaultCategories: string[];
  onSuccess: (data: { displayName: string; categories: string[] }) => void;
}) {
  const [state, formAction, pending] = useActionState(async (_: unknown, formData: FormData) => {
    const result = await saveBusinessBasics(undefined, formData);
    if (result?.success) {
      onSuccess({
        displayName: String(formData.get("displayName")),
        categories: formData.getAll("categories").map(String),
      });
    }
    return result;
  }, undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tell us about your business</CardTitle>
        <CardDescription>This personalizes your dashboard — you can change it anytime.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="displayName">Your name or brand</Label>
            <Input
              id="displayName"
              name="displayName"
              defaultValue={defaultDisplayName}
              placeholder="Alex Johnson"
            />
            {state?.errors?.displayName && (
              <p className="text-sm text-destructive">{state.errors.displayName[0]}</p>
            )}
          </div>
          <div className="flex flex-col gap-3">
            <Label>What are you trying to monetize?</Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {MONETIZATION_CATEGORIES.map((category) => (
                <label
                  key={category.value}
                  className="flex items-center gap-2 rounded-md border p-2.5 text-sm has-data-disabled:opacity-50"
                >
                  <Checkbox
                    name="categories"
                    value={category.value}
                    defaultChecked={defaultCategories.includes(category.value)}
                    disabled={!category.active}
                    data-disabled={!category.active || undefined}
                  />
                  {category.label}
                  {!category.active && (
                    <Badge variant="secondary" className="ml-auto">
                      Coming soon
                    </Badge>
                  )}
                </label>
              ))}
            </div>
            {state?.errors?.categories && (
              <p className="text-sm text-destructive">{state.errors.categories[0]}</p>
            )}
          </div>
          {state?.message && <p className="text-sm text-destructive">{state.message}</p>}
          <Button type="submit" disabled={pending} className="mt-2">
            {pending ? "Saving…" : "Continue"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ClaimUsernameStep({
  defaultUsername,
  defaultBio,
  onBack,
  onSuccess,
}: {
  defaultUsername: string;
  defaultBio: string;
  onBack: () => void;
  onSuccess: (data: { username: string; bio: string }) => void;
}) {
  const [state, formAction, pending] = useActionState(async (_: unknown, formData: FormData) => {
    const result = await saveUsername(undefined, formData);
    if (result?.success) {
      onSuccess({
        username: String(formData.get("username")).toLowerCase(),
        bio: String(formData.get("bio") ?? ""),
      });
    }
    return result;
  }, undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Claim your store URL</CardTitle>
        <CardDescription>This is the link you&apos;ll share everywhere.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="username">Store URL</Label>
            <div className="flex items-center rounded-md border pl-3 text-sm text-muted-foreground focus-within:ring-3 focus-within:ring-ring/50">
              <span>monetized.com/@</span>
              <Input
                id="username"
                name="username"
                defaultValue={defaultUsername}
                className="border-0 pl-1 shadow-none focus-visible:ring-0"
                placeholder="yourname"
              />
            </div>
            {state?.errors?.username && (
              <p className="text-sm text-destructive">{state.errors.username[0]}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="bio">Short bio (optional)</Label>
            <Textarea
              id="bio"
              name="bio"
              defaultValue={defaultBio}
              placeholder="What do you help people do?"
              rows={3}
            />
            {state?.errors?.bio && (
              <p className="text-sm text-destructive">{state.errors.bio[0]}</p>
            )}
          </div>
          {state?.message && <p className="text-sm text-destructive">{state.message}</p>}
          <div className="mt-2 flex gap-2">
            <Button type="button" variant="outline" onClick={onBack}>
              Back
            </Button>
            <Button type="submit" disabled={pending} className="flex-1">
              {pending ? "Saving…" : "Continue"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function ReviewLaunchStep({
  displayName,
  username,
  categories,
  onBack,
}: {
  displayName: string;
  username: string;
  categories: string[];
  onBack: () => void;
}) {
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const activeCategoryLabels = MONETIZATION_CATEGORIES.filter(
    (c) => categories.includes(c.value) && c.active,
  ).map((c) => c.label);

  return (
    <Card>
      <CardHeader>
        <CardTitle>You&apos;re ready to launch</CardTitle>
        <CardDescription>Review your store before it goes live.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Store name</p>
          <p className="font-medium">{displayName}</p>
          <p className="mt-3 text-sm text-muted-foreground">Store URL</p>
          <p className="font-medium">monetized.com/@{username}</p>
          <p className="mt-3 text-sm text-muted-foreground">Selling</p>
          <p className="font-medium">
            {activeCategoryLabels.length > 0 ? activeCategoryLabels.join(", ") : "Digital products"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button
            type="button"
            className="flex-1"
            disabled={pending}
            onClick={async () => {
              setPending(true);
              try {
                await launchStore();
                router.push("/dashboard");
              } catch {
                setPending(false);
                toast.error("Couldn't launch your store. Please try again.");
              }
            }}
          >
            {pending ? "Launching…" : "Launch my store"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
