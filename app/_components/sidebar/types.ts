/* -------------------------------------------------------------------------- */
/*  Sidebar — shared domain types                                              */
/* -------------------------------------------------------------------------- */

export interface ChatItem {
  id: string;
  title: string;
  updatedAt: string;
  isShared?: boolean;
  shareId?: string | null;
  sharedAt?: string | null;
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
  onRename?: (id: string, newTitle: string) => void;
  user: SidebarUser | null;
  isAuthenticated: boolean;
  onLoginClick: () => void;
  isOpen?: boolean;
}
