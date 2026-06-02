import {
  InboxIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  PowerIcon,
} from "@heroicons/react/24/solid";
import {
  ChevronDownIcon,
  FolderIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { List, ListItem, ListItemPrefix, ListItemSuffix } from "./primitives";

interface SidebarNavProps {
  projectsOpen: boolean;
  onToggleProjects: () => void;
}

interface NavLinkSpec {
  key: string;
  label: string;
  icon: React.ReactElement;
  suffix?: React.ReactElement;
}

export function SidebarNav({
  projectsOpen,
  onToggleProjects,
}: SidebarNavProps): React.ReactElement {
  const links: NavLinkSpec[] = [
    { key: "inbox", label: "Inbox", icon: <InboxIcon className="h-5 w-5 text-white/80" />, suffix: <InboxBadge count={0} /> },
    { key: "profile", label: "Profile", icon: <UserCircleIcon className="h-5 w-5 text-white/80" /> },
    { key: "settings", label: "Settings", icon: <Cog6ToothIcon className="h-5 w-5 text-white/80" /> },
    { key: "logout", label: "Log Out", icon: <PowerIcon className="h-5 w-5 text-white/80" /> },
  ];

  return (
    <div className="px-3 pt-2">
      <List className="!mt-0 !gap-0 !p-0">
        <ListItem
          onClick={onToggleProjects}
          className="!text-white/90"
        >
          <ListItemPrefix>
            <FolderIcon className="h-5 w-5 text-white/80" />
          </ListItemPrefix>
          Projects
          <ListItemSuffix>
            <ChevronDownIcon
              strokeWidth={2}
              className={cn(
                "h-4 w-4 text-white/60 transition-transform",
                projectsOpen && "rotate-180"
              )}
            />
          </ListItemSuffix>
        </ListItem>
        {projectsOpen && (
          <ListItem className="!text-white/80 !pl-9 !text-[13px]">
            <ListItemPrefix>
              <ChatBubbleLeftRightIcon className="h-4 w-4 text-muted" />
            </ListItemPrefix>
            AI Chat Pribadi
          </ListItem>
        )}

        {links.map((link) => (
          <ListItem key={link.key} className="!text-white/90">
            <ListItemPrefix>{link.icon}</ListItemPrefix>
            {link.label}
            {link.suffix && <ListItemSuffix>{link.suffix}</ListItemSuffix>}
          </ListItem>
        ))}
      </List>
    </div>
  );
}

function InboxBadge({ count }: { count: number }): React.ReactElement {
  return (
    <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-semibold text-violet-300">
      {count}
    </span>
  );
}
