"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type CommentFormProps = {
  entityType: string;
  entityId: string;
  parentId?: string;
  onSuccess?: () => void;
};

export function CommentForm({ entityType, entityId, parentId, onSuccess }: CommentFormProps) {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toErrorMessage = async (response: Response) => {
    try {
      const payload = (await response.json()) as { error?: string };
      if (payload.error) return payload.error;
    } catch {
      // Ignore parse errors and fallback to status-based messaging.
    }

    if (response.status === 403) {
      return "You do not have permission to post comments";
    }

    return "Could not post comment";
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!content.trim()) return;
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType, entityId, parentId, content }),
      });
      if (!response.ok) {
        throw new Error(await toErrorMessage(response));
      }
      setContent("");
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post comment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="space-y-2" onSubmit={submit}>
      <Textarea
        onChange={(event) => setContent(event.target.value)}
        placeholder="Write a comment..."
        required
        value={content}
      />
      <Button data-track="comments.post" size="sm" type="submit" disabled={submitting}>
        Post comment
      </Button>
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
    </form>
  );
}
