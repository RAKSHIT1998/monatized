import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { hasActiveMembership } from "@/lib/membership";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import { CommentForm } from "./comment-form";

export const metadata: Metadata = {
  title: "Community — Monetized",
};

export default async function MemberCommunityPage({
  params,
}: {
  params: Promise<{ accessToken: string }>;
}) {
  const { accessToken } = await params;

  const subscription = await db.subscription.findUnique({
    where: { accessToken },
    include: { creatorProfile: { select: { id: true, displayName: true } } },
  });
  if (!subscription) notFound();
  if (!hasActiveMembership(subscription.status)) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col items-center justify-center gap-4 px-4 py-12 text-center">
        <p className="text-sm text-muted-foreground">
          Your membership isn&apos;t active, so community posts aren&apos;t available right now.
        </p>
        <Link href={`/member/${accessToken}`} className={buttonVariants({ variant: "outline" })}>
          Back to your membership
        </Link>
      </div>
    );
  }

  const posts = await db.post.findMany({
    where: { creatorProfileId: subscription.creatorProfileId },
    orderBy: { createdAt: "desc" },
    include: {
      comments: {
        orderBy: { createdAt: "asc" },
        include: { customer: { select: { email: true, name: true } } },
      },
    },
  });

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-6 px-4 py-12">
      <Link
        href={`/member/${accessToken}`}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {subscription.creatorProfile.displayName}
      </Link>
      <h1 className="text-xl font-semibold tracking-tight">Community</h1>

      {posts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No posts yet — check back soon.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {posts.map((post) => (
            <Card key={post.id}>
              <CardHeader>
                <CardTitle>{post.title}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {post.createdAt.toLocaleDateString("en-IN")}
                </p>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <p className="whitespace-pre-line text-sm">{post.body}</p>

                {post.comments.length > 0 && (
                  <div className={cn("flex flex-col gap-2 border-t pt-3")}>
                    {post.comments.map((comment) => (
                      <div key={comment.id} className="text-sm">
                        <span className="font-medium">
                          {comment.authorType === "CREATOR"
                            ? subscription.creatorProfile.displayName
                            : (comment.customer?.name ?? comment.customer?.email ?? "Member")}
                        </span>{" "}
                        <span className="text-muted-foreground">{comment.body}</span>
                      </div>
                    ))}
                  </div>
                )}

                <CommentForm accessToken={accessToken} postId={post.id} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
