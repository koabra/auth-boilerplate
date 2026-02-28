"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CommentForm } from "@/components/comments/comment-form";

type CommentNode = {
  id: string;
  parentId: string | null;
  content: string;
  createdAt: string;
  deletedAt: string | null;
  score: number;
  myVote: number;
  user: { email: string; displayName: string | null; pseudonym: string };
};

type CommentThreadProps = {
  entityType: string;
  entityId: string;
};

const MAX_REPLY_DEPTH = 4;
const INDENT_CLASSES = ["ml-0", "ml-4", "ml-8", "ml-12", "ml-16"] as const;

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

  const vote = async (commentId: string, value: -1 | 0 | 1) => {
    await fetch("/api/comments/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentId, value }),
    });
    await load();
  };

  const renderNodes = (parentId: string | null, depth = 0) => {
    const nodes = comments.filter((comment) => comment.parentId === parentId);
    if (!nodes.length) return null;

    return nodes.map((comment) => (
      <div className={`space-y-3 ${INDENT_CLASSES[Math.min(depth, MAX_REPLY_DEPTH)]}`} key={comment.id}>
        <Card className={depth > 0 ? "border-l-4 border-l-[var(--border)]" : ""}>
          <div className="space-y-2">
            <p className="text-xs text-[var(--muted-foreground)]">@{comment.user.pseudonym}</p>
            <p>{comment.deletedAt ? "[deleted]" : comment.content}</p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => vote(comment.id, comment.myVote === 1 ? 0 : 1)}
                size="sm"
                variant={comment.myVote === 1 ? "secondary" : "outline"}
              >
                Upvote
              </Button>
              <span className="text-sm">{comment.score}</span>
              <Button
                onClick={() => vote(comment.id, comment.myVote === -1 ? 0 : -1)}
                size="sm"
                variant={comment.myVote === -1 ? "secondary" : "outline"}
              >
                Downvote
              </Button>
              {depth < MAX_REPLY_DEPTH ? (
                <Button onClick={() => setReplyTo(comment.id)} size="sm" variant="outline">
                  Reply
                </Button>
              ) : null}
            </div>
            {depth >= MAX_REPLY_DEPTH ? (
              <p className="text-xs text-[var(--muted-foreground)]">Maximum reply depth reached.</p>
            ) : null}
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
          </div>
        </Card>
        {renderNodes(comment.id, depth + 1)}
      </div>
    ));
  };

  return (
    <div className="space-y-4">
      <CommentForm entityId={entityId} entityType={entityType} onSuccess={load} />
      <div className="space-y-3">{renderNodes(null)}</div>
    </div>
  );
}
