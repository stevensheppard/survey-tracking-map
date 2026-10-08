import { useCallback, useEffect, useRef, useState } from "react";
import { connectClient } from "../connect/connectClient";
import {
  connectWorkspace,
  getMockWorkspaceSession,
  type WorkspaceSession,
} from "../connect/workspace";
import type { ConnectProjectContext } from "../types";

function shouldUseMockMode(): boolean {
  const params = new URLSearchParams(window.location.search);
  if (params.get("mock") === "true") {
    return true;
  }
  if (params.get("mock") === "false") {
    return false;
  }

  try {
    return window.parent === window;
  } catch {
    return true;
  }
}

function commandFromEvent(args: unknown): string | null {
  if (!args || typeof args !== "object") {
    return null;
  }

  const payload = args as { data?: unknown };
  if (typeof payload.data === "string") {
    return payload.data.split("?")[0];
  }

  return null;
}

export function useConnectWorkspace(onCommand?: (command: string) => void) {
  const [session, setSession] = useState<WorkspaceSession | null>(null);
  const [project, setProject] = useState<ConnectProjectContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState(
    "Connecting to Trimble Connect...",
  );
  const onCommandRef = useRef(onCommand);
  onCommandRef.current = onCommand;

  const bootstrap = useCallback(async () => {
    setLoading(true);
    setError(null);

    const useMock = shouldUseMockMode();
    connectClient.enableMockMode(useMock);

    try {
      const workspaceSession = useMock
        ? getMockWorkspaceSession()
        : await connectWorkspace((event, args) => {
            if (event === "extension.accessToken") {
              const payload = args as { data?: string };
              if (
                payload.data &&
                payload.data !== "pending" &&
                payload.data !== "denied"
              ) {
                connectClient.setAccessToken(payload.data);
              }
            }

            if (event === "extension.command") {
              const command = commandFromEvent(args);
              if (command) {
                onCommandRef.current?.(command);
              }
            }
          });

      if (!workspaceSession) {
        setError(
          "This extension must run inside Trimble Connect. Open it with ?mock=true for local development.",
        );
        setLoading(false);
        return;
      }

      connectClient.setAccessToken(workspaceSession.accessToken);
      const projectContext = useMock
        ? workspaceSession.project
        : await connectClient.initializeProject(workspaceSession.project.id);

      setSession(workspaceSession);
      setProject({
        ...projectContext,
        crsName: projectContext.crsName ?? workspaceSession.project.crsName,
        crsCsib64: projectContext.crsCsib64 ?? workspaceSession.project.crsCsib64,
        name: projectContext.name ?? workspaceSession.project.name,
      });
      setStatusMessage(`Connected to ${projectContext.name ?? projectContext.id}`);
    } catch (bootstrapError) {
      setError(
        bootstrapError instanceof Error
          ? bootstrapError.message
          : "Failed to connect to Trimble Connect.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  return {
    session,
    project,
    loading,
    error,
    statusMessage,
    isMockMode: shouldUseMockMode(),
    reload: bootstrap,
  };
}
