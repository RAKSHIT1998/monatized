"use client";

import { useState } from "react";
import { toast } from "sonner";
import { addCommentAsCreator, deleteComment, deletePost } from "@/app/actions/community";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2 } from "lucide-react";

export type PostRow = {
  id: string;
  title: string;
  body: string;
  membersOnly: boolean;
  createdAt: string;
  comments: {
    id: string;
    authorType: "CREATOR" | "MEMBER";
    authorLabel: string;
    body: string;
    createdAt: string;
  }[];
};

export function PostsList({ posts }: { posts: PostRow[] }) {
  if (posts.length === 0) {
    return <p className="text-sm text-muted-foreground">No posts yet.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}

function PostCard({ post }: { post: PostRow }) {
  const [commentBody, setCommentBody] = useState("");
  const [pending, setPending] = useState(false);

  async function handleDeletePost() {
    if (!window.confirm("Delete this post and all its comments?")) return;
    try {
      await deletePost(post.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't delete post.");
    }
  }

  async function handleDeleteComment(commentId: string) {
    try {
      await deleteComment(commentId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't delete comment.");
    }
  }

  async function handleReply() {
    if (!commentBody.trim()) return;
    setPending(true);
    try {
      const formData = new FormData();
      formData.set("body", commentBody);
      await addCommentAsCreator(post.id, formData);
      setCommentBody("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't post reply.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
        <div>
          <CardTitle>{post.title}</CardTitle>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant={post.membersOnly ? "default" : "secondary"}>
              {post.membersOnly ? "Members only" : "Public"}
            </Badge>
            {/* Explicit locale — this is a Client Component, so it's rendered on both
                server and client; an implicit locale can format differently in each,
                causing a hydration mismatch that tears down and rebuilds this tree
                mid-interaction (observed: it swallowed a reply-comment click). */}
            <span className="text-xs text-muted-foreground">
              {new Date(post.createdAt).toLocaleDateString("en-IN")}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDeletePost}
          className="text-muted-foreground hover:text-destructive"
          aria-label="Delete post"
        >
          <Trash2 className="size-4" />
        </button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="whitespace-pre-line text-sm">{post.body}</p>

        {post.comments.length > 0 && (
          <div className="flex flex-col gap-2 border-t pt-3">
            {post.comments.map((comment) => (
              <div key={comment.id} className="flex items-start justify-between gap-2 text-sm">
                <div>
                  <span className="font-medium">{comment.authorLabel}</span>{" "}
                  <span className="text-muted-foreground">{comment.body}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteComment(comment.id)}
                  className="shrink-0 text-xs text-muted-foreground hover:text-destructive"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Textarea
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            placeholder="Reply as yourself…"
            rows={1}
            className="min-h-9"
          />
          <Button type="button" size="sm" disabled={pending} onClick={handleReply}>
            Reply
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
