import {
  EllipsisHorizontalIcon,
  FolderPlusIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  RectangleGroupIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";
import { List, ListItem, ListItemPrefix } from "./primitives";

interface SidebarNavProps {
  onNewChat: () => void;
  onFocusSearch?: () => void;
}

interface NavLinkSpec {
  key: string;
  label: string;
  icon: React.ReactElement;
  onClick?: () => void;
}

export function SidebarNav({
  onNewChat,
  onFocusSearch,
}: SidebarNavProps): React.ReactElement {
  const links: NavLinkSpec[] = [
    {
      key: "new-chat",
      label: "New chat",
      icon: <PencilSquareIcon className="h-5 w-5 text-foreground/75" />,
      onClick: onNewChat,
    },
    {
      key: "search",
      label: "Search chats",
      icon: <MagnifyingGlassIcon className="h-5 w-5 text-foreground/75" />,
      onClick: onFocusSearch,
    },
    {
      key: "library",
      label: "Library",
      icon: <RectangleGroupIcon className="h-5 w-5 text-foreground/75" />,
    },
    {
      key: "projects",
      label: "Projects",
      icon: <FolderPlusIcon className="h-5 w-5 text-foreground/75" />,
    },
    {
      key: "apps",
      label: "Apps",
      icon: <Squares2X2Icon className="h-5 w-5 text-foreground/75" />,
    },
    {
      key: "more",
      label: "More",
      icon: <EllipsisHorizontalIcon className="h-5 w-5 text-foreground/75" />,
    },
  ];

  return (
    <div className="px-3 pt-2">
      <List className="!mt-0 !gap-0 !p-0">
        {links.map((link) => (
          <ListItem key={link.key} onClick={link.onClick} className="text-foreground/90">
            <ListItemPrefix>{link.icon}</ListItemPrefix>
            {link.label}
          </ListItem>
        ))}
      </List>
    </div>
  );
}
