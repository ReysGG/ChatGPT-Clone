/* -------------------------------------------------------------------------- */
/*  Sidebar — shared domain types                                              */
/* -------------------------------------------------------------------------- */

export interface ChatItem {
  id: string;
  title: string;
  updatedAt: string;
}

export interface SidebarUser {
  name: string;
  email: string;
  plan: "free" | "pro";
}

export interface SidebarProps {
  chats: ChatItem[];
  activeChatId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
  user: SidebarUser;
}
