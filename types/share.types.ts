export interface SharedConversation {
  id: string;
  title: string;
  userId: string;
  isShared: boolean;
  shareId: string | null;
  sharedAt: Date | null;
  updatedAt: Date;
  createdAt: Date;
  messages: Array<{
    id: string;
    conversationId: string;
    role: string;
    content: string;
    createdAt: Date;
  }>;
  user: {
    name: string | null;
  };
}
