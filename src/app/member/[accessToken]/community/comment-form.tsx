"use client";

import { useState } from "react";
import { toast } from "sonner";
import { addCommentAsMember } from "@/app/actions/community";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function CommentForm({ accessToken, postId }: { accessToken: string; postId: string }) {
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit() {
    if (!body.trim()) return;
    setPending(true);
    try {
      const formData = new FormData();
      formData.set("postId", postId);
      formData.set("body", body);
      await addCommentAsMember(accessToken, formData);
      setBody("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't post your comment.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex gap-2">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Leave a comment…"
        rows={1}
        className="min-h-9"
      />
      <Button type="button" size="sm" disabled={pending} onClick={handleSubmit}>
        Post
      </Button>
    </div>
  );
}
