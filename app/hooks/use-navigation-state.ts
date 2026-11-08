import { appBasePath, appPath } from "@agent-native/core/client/api-path";
import { markAgentChatHomeHandoff } from "@agent-native/core/client/agent-chat";
import { useAgentRouteState } from "@agent-native/core/client/navigation";
import { useLocation } from "react-router";
import { TAB_ID } from "@/lib/tab-id";

export interface NavigationState {
  view: string;
  path?: string;
  threadId?: string;
}

export function useNavigationState() {
  const location = useLocation();
  useAgentRouteState<NavigationState>({
    browserTabId: TAB_ID,
    requestSource: TAB_ID,
    getNavigationState: ({ pathname }) => {
      const threadId = threadIdFromPath(pathname);
      return {
        view: viewForPath(pathname),
        path: appPath(pathname),
        ...(threadId ? { threadId } : {}),
      };
    },
    getCommandPath: (command) =>
      routerPath(command.path || pathForCommand(command)),
    onNavigate: (_command, path) => {
      if (
        isChatPath(location.pathname) &&
        !isChatPath(pathnameFromPath(path))
      ) {
        markAgentChatHomeHandoff("chat");
      }
    },
  });
}

function pathnameFromPath(path: string): string {
  return path.split(/[?#]/, 1)[0] || "/";
}

function threadIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/chat\/([^/]+)/);
  if (!match || !match[1]) return null;
  try {
    const value = decodeURIComponent(match[1]).trim();
    return value || null;
  } catch {
    return null;
  }
}

function viewForPath(pathname: string): string {
  if (isChatPath(pathname)) return "desk";
  if (pathname.startsWith("/ledger")) return "ledger";
  if (pathname.startsWith("/variance")) return "variance";
  if (pathname.startsWith("/break-even")) return "break-even";
  if (pathname.startsWith("/generators")) return "generators";
  if (pathname.startsWith("/settings")) return "settings";
  if (pathname.startsWith("/about")) return "about";
  return "desk";
}

function pathForView(view?: string): string {
  switch (view) {
    case "desk":
    case "chat":
    case "home":
      return "/";
    case "ledger":
      return "/ledger";
    case "variance":
      return "/variance";
    case "break-even":
    case "solar":
      return "/break-even";
    case "generators":
      return "/generators";
    case "settings":
      return "/settings";
    case "about":
      return "/about";
    default:
      return "/";
  }
}

function pathForCommand(command: any): string {
  const path = pathForView(command?.view);
  if (path !== "/") return path;
  const threadId =
    typeof command?.threadId === "string" ? command.threadId.trim() : "";
  return threadId ? `/chat/${encodeURIComponent(threadId)}` : "/";
}

function routerPath(path: string): string {
  const basePath = appBasePath();
  if (!basePath) return path;
  if (path === basePath) return "/";
  if (path.startsWith(`${basePath}/`)) {
    return path.slice(basePath.length) || "/";
  }
  return path;
}

function isChatPath(pathname: string): boolean {
  return pathname === "/" || pathname.startsWith("/chat/");
}
