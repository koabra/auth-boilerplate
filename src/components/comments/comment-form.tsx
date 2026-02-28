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

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!content.trim()) return;

    await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entityType, entityId, parentId, content }),
    });
    setContent("");
    onSuccess?.();
  };

  return (
    <form className="space-y-2" onSubmit={submit}>
      <Textarea
        onChange={(event) => setContent(event.target.value)}
        placeholder="Write a comment..."
        required
        value={content}
      />
      <Button size="sm" type="submit">
        Post comment
      </Button>
    </form>
  );
}
