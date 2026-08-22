import type { Metadata } from "next";
import { requireOnboardedCreator } from "@/lib/dal";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NewPostForm } from "./new-post-form";
import { PostsList } from "./posts-list";

export const metadata: Metadata = {
  title: "Community — Monetized",
};

export default async function CommunityPage() {
  const user = await requireOnboardedCreator();

  const posts = await db.post.findMany({
    where: { creatorProfileId: user.creatorProfile.id },
    orderBy: { createdAt: "desc" },
    include: {
      comments: {
        orderBy: { createdAt: "asc" },
        include: { customer: { select: { email: true, name: true } } },
      },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Community</h1>
        <p className="text-sm text-muted-foreground">
          Post updates for your subscribers and reply to their comments. Members-only posts require
          an active subscription to view.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.4fr]">
        <NewPostForm />

        <Card>
          <CardHeader>
            <CardTitle>Your posts</CardTitle>
          </CardHeader>
          <CardContent>
            <PostsList
              posts={posts.map((post) => ({
                id: post.id,
                title: post.title,
                body: post.body,
                membersOnly: post.membersOnly,
                createdAt: post.createdAt.toISOString(),
                comments: post.comments.map((comment) => ({
                  id: comment.id,
                  authorType: comment.authorType,
                  authorLabel:
                    comment.authorType === "CREATOR"
                      ? "You"
                      : (comment.customer?.name ?? comment.customer?.email ?? "Member"),
                  body: comment.body,
                  createdAt: comment.createdAt.toISOString(),
                })),
              }))}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
