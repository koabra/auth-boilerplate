"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CommentForm } from "@/components/comments/comment-form";

type CommentNode = {
  id: string;
  content: string;
  createdAt: string;
  deletedAt: string | null;
  user: { email: string; displayName: string | null };
};

type CommentThreadProps = {
  entityType: string;
  entityId: string;
};

export function CommentThread({ entityType, entityId }: CommentThreadProps) {
  const [comments, setComments] = useState<CommentNode[]>([]);
  const [replyTo, setReplyTo] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/comments?entityType=${entityType}&entityId=${entityId}`, {
      cache: "no-store",
    });
    if (!response.ok) return;
    const data = (await response.json()) as { comments: CommentNode[] };
    setComments(data.comments);
  }, [entityId, entityType]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <CommentForm entityId={entityId} entityType={entityType} onSuccess={load} />
      <div className="space-y-3">
        {comments.map((comment) => (
          <Card className="space-y-2" key={comment.id}>
            <p className="text-xs text-zinc-500">{comment.user.displayName ?? comment.user.email}</p>
            <p>{comment.deletedAt ? "[deleted]" : comment.content}</p>
            <div className="flex items-center gap-2">
              <Button onClick={() => setReplyTo(comment.id)} size="sm" variant="outline">
                Reply
              </Button>
            </div>
            {replyTo === comment.id ? (
              <CommentForm
                entityId={entityId}
                entityType={entityType}
                onSuccess={() => {
                  setReplyTo(null);
                  void load();
                }}
                parentId={comment.id}
              />
            ) : null}
          </Card>
        ))}
      </div>
    </div>
  );
}
