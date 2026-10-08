import * as WorkspaceAPI from "trimble-connect-workspace-api";
import type { ConnectProjectContext } from "../types";

export type WorkspaceEventHandler = (
  event: string,
  args: unknown,
) => void;

export interface WorkspaceSession {
  api: WorkspaceAPI.WorkspaceAPI;
  project: ConnectProjectContext;
  accessToken: string;
}

function isEmbeddedInConnect(): boolean {
  try {
    return window.parent !== window;
  } catch {
    return false;
  }
}

function menuIconUrl(): string {
  return new URL("icon.svg", window.location.href).toString();
}

export async function connectWorkspace(
  onEvent?: WorkspaceEventHandler,
): Promise<WorkspaceSession | null> {
  if (!isEmbeddedInConnect()) {
    return null;
  }

  let resolveToken: ((token: string) => void) | undefined;
  let rejectToken: ((error: Error) => void) | undefined;

  const api = await WorkspaceAPI.connect(
    window.parent,
    (event: string, args: unknown) => {
      if (event === "extension.accessToken") {
        const payload = args as { data?: string };
        if (
          payload.data &&
          payload.data !== "pending" &&
          payload.data !== "denied"
        ) {
          resolveToken?.(payload.data);
        }
      }
      onEvent?.(event, args);
    },
    30000,
  );

  const icon = menuIconUrl();
  await api.ui.setMenu({
    title: "Survey Tracking Map",
    icon,
    command: "open_map",
    subMenus: [
      {
        title: "Map",
        icon,
        command: "open_map",
      },
    ],
  });

  await api.ui.setActiveMenuItem("open_map");

  const project = await api.project.getProject();
  const permission = await api.extension.requestPermission("accesstoken");

  let accessToken = "";
  if (permission !== "pending" && permission !== "denied") {
    accessToken = permission;
  } else {
    accessToken = await new Promise<string>((resolve, reject) => {
      resolveToken = resolve;
      rejectToken = reject;
      window.setTimeout(() => {
        reject(new Error("Timed out waiting for Trimble Connect access token."));
      }, 30000);
    });
  }

  if (!accessToken) {
    rejectToken?.(new Error("Trimble Connect access token was not granted."));
    throw new Error("Trimble Connect access token was not granted.");
  }

  return {
    api,
    accessToken,
    project: {
      id: project.id,
      name: project.name,
      location: project.location,
      crsName: project.crs?.name,
      crsCsib64: project.crs?.csib64,
    },
  };
}

export function getMockWorkspaceSession(): WorkspaceSession {
  return {
    api: {} as WorkspaceAPI.WorkspaceAPI,
    accessToken: "mock-access-token",
    project: {
      id: "mock-project",
      name: "Mock Survey Project",
      location: "Mock Location",
      crsName: "EPSG:28355",
      crsCsib64: undefined,
    },
  };
}
