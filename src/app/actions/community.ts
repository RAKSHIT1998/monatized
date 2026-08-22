"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOnboardedCreator } from "@/lib/dal";
import { hasActiveMembership } from "@/lib/membership";
import { postSchema, commentSchema } from "@/lib/validation/community";

export type CommunityFormState =
  | {
      errors?: Record<string, string[]>;
      message?: string;
    }
  | undefined;

export async function createPost(
  _prevState: CommunityFormState,
  formData: FormData,
): Promise<CommunityFormState> {
  const user = await requireOnboardedCreator();

  const validated = postSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    membersOnly: formData.get("membersOnly") === "on",
  });
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  await db.post.create({
    data: { creatorProfileId: user.creatorProfile.id, ...validated.data },
  });

  revalidatePath("/dashboard/community");
  return {};
}

export async function deletePost(postId: string) {
  const user = await requireOnboardedCreator();
  const post = await db.post.findUnique({ where: { id: postId } });
  if (!post || post.creatorProfileId !== user.creatorProfile.id) {
    throw new Error("Post not found.");
  }

  await db.post.delete({ where: { id: postId } });
  revalidatePath("/dashboard/community");
}

export async function addCommentAsCreator(postId: string, formData: FormData) {
  const user = await requireOnboardedCreator();
  const post = await db.post.findUnique({ where: { id: postId } });
  if (!post || post.creatorProfileId !== user.creatorProfile.id) {
    throw new Error("Post not found.");
  }

  const validated = commentSchema.safeParse({ body: formData.get("body") });
  if (!validated.success) {
    throw new Error(validated.error.issues[0]?.message ?? "Invalid comment.");
  }

  await db.postComment.create({
    data: { postId, authorType: "CREATOR", body: validated.data.body },
  });
  revalidatePath("/dashboard/community");
}

export async function deleteComment(commentId: string) {
  const user = await requireOnboardedCreator();
  const comment = await db.postComment.findUnique({
    where: { id: commentId },
    include: { post: true },
  });
  if (!comment || comment.post.creatorProfileId !== user.creatorProfile.id) {
    throw new Error("Comment not found.");
  }

  await db.postComment.delete({ where: { id: commentId } });
  revalidatePath("/dashboard/community");
  revalidatePath("/member", "layout");
}

// Member-facing — identified by their subscription's accessToken, exactly like
// cancelSubscriptionAsMember. No customer login system, so this token IS the
// member's identity for posting a comment.
export async function addCommentAsMember(accessToken: string, formData: FormData) {
  const subscription = await db.subscription.findUnique({ where: { accessToken } });
  if (!subscription || !hasActiveMembership(subscription.status)) {
    throw new Error("An active membership is required to comment.");
  }

  const postId = String(formData.get("postId"));
  const post = await db.post.findUnique({ where: { id: postId } });
  if (!post || post.creatorProfileId !== subscription.creatorProfileId) {
    throw new Error("Post not found.");
  }

  const validated = commentSchema.safeParse({ body: formData.get("body") });
  if (!validated.success) {
    throw new Error(validated.error.issues[0]?.message ?? "Invalid comment.");
  }

  await db.postComment.create({
    data: {
      postId,
      authorType: "MEMBER",
      customerId: subscription.customerId,
      body: validated.data.body,
    },
  });
  revalidatePath(`/member/${accessToken}/community`);
}
