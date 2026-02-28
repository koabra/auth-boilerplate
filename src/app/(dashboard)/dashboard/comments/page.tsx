import { CommentThread } from "@/components/comments/comment-thread";

export default function CommentsPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Comments</h2>
      <CommentThread entityId="demo-dashboard-entity" entityType="page" />
    </div>
  );
}
