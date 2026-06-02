"use client";

import { useState } from "react";
import { Bars3Icon } from "@heroicons/react/24/outline";
import { Card, List, ListItem, Typography } from "./primitives";
import { SIDEBAR_WIDTH_REM } from "./styles";
import { formatRelative, useNow } from "./use-now";
import { ChatRow } from "./chat-row";
import { ChatSearch } from "./chat-search";
import { NewChatButton } from "./new-chat-button";
import { SidebarHeader } from "./sidebar-header";
import { SidebarNav } from "./sidebar-nav";
import { UpgradeCard } from "./upgrade-card";
import { UserMenu } from "@/components/user-menu";
import type { ChatItem, SidebarProps } from "./types";

const EMPTY_LABEL_QUERY = "No matching chats";
const EMPTY_LABEL_NONE = "No conversations yet";

export function Sidebar({
  chats,
  activeChatId,
  onSelect,
  onNewChat,
  onDelete,
  user,
}: SidebarProps): React.ReactElement {
  const [query, setQuery] = useState<string>("");
  const [projectsOpen, setProjectsOpen] = useState<boolean>(false);
  const [upgradeOpen, setUpgradeOpen] = useState<boolean>(true);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const now = useNow();

  const filtered = chats.filter((c) =>
    c.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="fixed left-3 top-3 z-30 rounded-md bg-card p-2 ring-1 ring-border md:hidden"
        aria-label="Open sidebar"
      >
        <Bars3Icon className="h-5 w-5 text-white" />
      </button>

      {/* Desktop sidebar */}
      <aside className="hidden h-screen w-72 shrink-0 md:block">
        <SidebarBody
          filtered={filtered}
          query={query}
          onQueryChange={setQuery}
          activeChatId={activeChatId}
          onSelect={onSelect}
          onDelete={onDelete}
          onNewChat={onNewChat}
          projectsOpen={projectsOpen}
          onToggleProjects={() => setProjectsOpen((v) => !v)}
          upgradeOpen={upgradeOpen}
          onCloseUpgrade={() => setUpgradeOpen(false)}
          onUpgrade={() => setUpgradeOpen(false)}
          now={now}
          user={user}
        />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 h-full w-72">
            <SidebarBody
              filtered={filtered}
              query={query}
              onQueryChange={setQuery}
              activeChatId={activeChatId}
              onSelect={onSelect}
              onDelete={onDelete}
              onNewChat={onNewChat}
              projectsOpen={projectsOpen}
              onToggleProjects={() => setProjectsOpen((v) => !v)}
              upgradeOpen={upgradeOpen}
              onCloseUpgrade={() => setUpgradeOpen(false)}
              onUpgrade={() => setUpgradeOpen(false)}
              now={now}
              user={user}
              onCloseDrawer={() => setDrawerOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  SidebarBody — shared between desktop and mobile drawer.                   */
/* -------------------------------------------------------------------------- */

interface SidebarBodyProps {
  filtered: ChatItem[];
  query: string;
  onQueryChange: (next: string) => void;
  activeChatId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNewChat: () => void;
  projectsOpen: boolean;
  onToggleProjects: () => void;
  upgradeOpen: boolean;
  onCloseUpgrade: () => void;
  onUpgrade: () => void;
  now: number | null;
  user: SidebarProps["user"];
  onCloseDrawer?: () => void;
}

function SidebarBody({
  filtered,
  query,
  onQueryChange,
  activeChatId,
  onSelect,
  onDelete,
  onNewChat,
  projectsOpen,
  onToggleProjects,
  upgradeOpen,
  onCloseUpgrade,
  onUpgrade,
  now,
  user,
  onCloseDrawer,
}: SidebarBodyProps): React.ReactElement {
  return (
    <Card className="flex h-full w-full max-w-[18rem] flex-col !bg-sidebar !text-white shadow-xl shadow-black/30 rounded-none border-r border-white/[0.06] overflow-hidden">
      <SidebarHeader onClose={onCloseDrawer ?? (() => undefined)} />

      <div className="px-4 pt-1">
        <NewChatButton onClick={onNewChat} />
      </div>

      <div className="mt-5 px-5">
        <Typography
          variant="small"
          className="!text-muted !text-[11px] !font-semibold !uppercase !tracking-[0.08em]"
        >
          Recent
        </Typography>
      </div>

      <div className="mt-2 px-4">
        <ChatSearch value={query} onChange={onQueryChange} />
      </div>

      <div className="mt-2 min-h-0 flex-1 overflow-y-auto px-3">
        <List className="!mt-0 !gap-0 !p-0">
          {filtered.length === 0 ? (
            <ListItem
              disabled
              asDiv
              className="!text-muted hover:!bg-transparent"
            >
              {query ? EMPTY_LABEL_QUERY : EMPTY_LABEL_NONE}
            </ListItem>
          ) : (
            filtered.map((c) => (
              <ChatRow
                key={c.id}
                active={c.id === activeChatId}
                title={c.title}
                relative={now == null ? "—" : formatRelative(c.updatedAt, now)}
                onClick={() => onSelect(c.id)}
                onDelete={() => onDelete(c.id)}
              />
            ))
          )}
        </List>
      </div>

      <div className="px-4 pt-2">
        <hr className="border-white/[0.06]" />
      </div>

      <SidebarNav
        projectsOpen={projectsOpen}
        onToggleProjects={onToggleProjects}
      />

      <div className="mt-auto space-y-3 px-4 pb-4 pt-3">
        <UpgradeCard
          open={upgradeOpen}
          onClose={onCloseUpgrade}
          onUpgrade={onUpgrade}
        />
        <div className="px-1">
          <UserMenu user={user} onUpgrade={onCloseUpgrade} />
        </div>
      </div>
    </Card>
  );
}

/* SIDEBAR_WIDTH_REM is exported so other modules (e.g. layout) can use
   the same width without redefining the magic number. */
export { SIDEBAR_WIDTH_REM };
