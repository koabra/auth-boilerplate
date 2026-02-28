-- User identity normalization and profile fields
ALTER TABLE "User" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "pseudonym" TEXT;
ALTER TABLE "User" ADD COLUMN "realName" TEXT;
ALTER TABLE "User" ALTER COLUMN "firebaseUid" DROP NOT NULL;

-- Backfill pseudonym for existing users using a deterministic suffix to avoid collisions.
UPDATE "User"
SET "pseudonym" = CONCAT(
  COALESCE(NULLIF(lower(regexp_replace(split_part("email", '@', 1), '[^a-zA-Z0-9_]+', '_', 'g')), ''), 'user'),
  '_',
  substring("id" from 1 for 6)
)
WHERE "pseudonym" IS NULL;

ALTER TABLE "User" ALTER COLUMN "pseudonym" SET NOT NULL;
CREATE UNIQUE INDEX "User_pseudonym_key" ON "User"("pseudonym");

-- Provider-agnostic linked account model
CREATE TABLE "LinkedAuthAccount" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerUserId" TEXT NOT NULL,
  "email" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LinkedAuthAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LinkedAuthAccount_provider_providerUserId_key"
  ON "LinkedAuthAccount"("provider", "providerUserId");
CREATE INDEX "LinkedAuthAccount_userId_provider_idx"
  ON "LinkedAuthAccount"("userId", "provider");

ALTER TABLE "LinkedAuthAccount"
  ADD CONSTRAINT "LinkedAuthAccount_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill linked accounts from existing firebase user IDs
INSERT INTO "LinkedAuthAccount" ("id", "userId", "provider", "providerUserId", "email", "createdAt", "updatedAt")
SELECT
  CONCAT('legacy_', "id"),
  "id",
  'firebase',
  "firebaseUid",
  "email",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "User"
WHERE "firebaseUid" IS NOT NULL
ON CONFLICT ("provider", "providerUserId") DO NOTHING;

-- Comment voting support
CREATE TABLE "CommentVote" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "commentId" TEXT NOT NULL,
  "value" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommentVote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommentVote_userId_commentId_key" ON "CommentVote"("userId", "commentId");

ALTER TABLE "CommentVote"
  ADD CONSTRAINT "CommentVote_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommentVote"
  ADD CONSTRAINT "CommentVote_commentId_fkey"
  FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
