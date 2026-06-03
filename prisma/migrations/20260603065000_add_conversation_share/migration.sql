-- Add public sharing controls for owner-approved conversation links.
ALTER TABLE "Conversation"
ADD COLUMN "isShared" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "shareId" TEXT,
ADD COLUMN "sharedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Conversation_shareId_key" ON "Conversation"("shareId");
