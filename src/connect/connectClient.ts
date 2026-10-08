import * as TC from "trimble-connect-sdk";
import type {
  ConnectFolderItem,
  ConnectProjectContext,
  DeviceConfig,
  ExtensionConfig,
} from "../types";
import {
  CONFIG_FILE_NAME,
  FIELD_TRACKING_FOLDER_NAME,
} from "../utils/constants";
import {
  isConfigFile,
  normalizeConfig,
  serializeConfig,
} from "../config/schema";
import { createDeviceId } from "../utils/constants";
import { mockConnectDataStore } from "./mockData";

type Project = TC.Project;
type FolderEntry = TC.FolderEntry;
type FileEntry = TC.FileEntry;

export interface ConfigLocation {
  folderId: string;
  fileId: string;
}

function apiUrl(origin: string, path: string): string {
  return `https:${origin}/tc/api/2.0/${path.replace(/^\//, "")}`;
}

export class ConnectClient {
  private readonly client = TC.TCPSClient;
  private project: Project | null = null;
  private accessToken: string | null = null;
  private mockMode = false;
  private fieldTrackingFolderId: string | null = null;

  enableMockMode(enabled: boolean): void {
    this.mockMode = enabled;
    if (enabled) {
      this.project = mockConnectDataStore.getProject() as unknown as Project;
      this.fieldTrackingFolderId = "mock-field-tracking";
    }
  }

  setAccessToken(token: string): void {
    this.accessToken = token;
    this.client.config.credentials = { token };
  }

  async initializeProject(projectId: string): Promise<ConnectProjectContext> {
    if (this.mockMode) {
      this.project = mockConnectDataStore.getProject() as unknown as Project;
      this.fieldTrackingFolderId = "mock-field-tracking";
      return this.toProjectContext(this.project);
    }

    if (!this.accessToken) {
      throw new Error("Connect access token is not available.");
    }

    const projectResponse = await this.client.getProject(projectId);
    if (!projectResponse.data) {
      throw new Error(`Project ${projectId} was not found in any Connect region.`);
    }

    this.project = projectResponse.data;
    if (!this.project.origin) {
      throw new Error(
        "Connect project origin was not returned. Cannot call regional file APIs.",
      );
    }

    return this.toProjectContext(this.project);
  }

  getProject(): Project {
    if (!this.project) {
      throw new Error("Connect project has not been initialized.");
    }
    return this.project;
  }

  getFieldTrackingFolderId(): string | null {
    return this.fieldTrackingFolderId;
  }

  async listFolderItems(folderId: string): Promise<ConnectFolderItem[]> {
    if (this.mockMode) {
      return mockConnectDataStore.listFolderItems(folderId);
    }

    const project = this.getProject();
    try {
      const parent =
        folderId === project.rootId
          ? project
          : ({
              id: folderId,
              name: folderId,
              type: "FOLDER" as const,
              origin: project.origin,
            } satisfies FolderEntry);

      const entriesResponse = await this.client.listFolderEntries(parent);
      const entries = entriesResponse.data ?? [];
      return entries.map((entry) => this.toFolderItem(entry));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown folder listing error";
      throw new Error(
        `Failed to list folder ${folderId}: ${message}. Check access token permission and project folder access.`,
      );
    }
  }

  async listProjectRootItems(): Promise<ConnectFolderItem[]> {
    return this.listFolderItems(this.getProject().rootId);
  }

  async ensureFieldTrackingFolder(): Promise<string> {
    if (this.mockMode) {
      this.fieldTrackingFolderId = "mock-field-tracking";
      return this.fieldTrackingFolderId;
    }

    const project = this.getProject();
    const rootItems = await this.listFolderItems(project.rootId);
    const existing = rootItems.find(
      (item) =>
        item.type === "FOLDER" && item.name === FIELD_TRACKING_FOLDER_NAME,
    );

    if (existing) {
      this.fieldTrackingFolderId = existing.id;
      return existing.id;
    }

    const created = await this.createFolder(
      project.rootId,
      FIELD_TRACKING_FOLDER_NAME,
    );
    this.fieldTrackingFolderId = created.id;
    return created.id;
  }

  async discoverDevices(
    fallbackRefreshInterval: number,
  ): Promise<ExtensionConfig> {
    const fieldTrackingId = await this.ensureFieldTrackingFolder();
    const items = await this.listFolderItems(fieldTrackingId);

    const configItem = items.find((item) => isConfigFile(item));
    let stored = normalizeConfig(undefined, fallbackRefreshInterval);

    if (configItem) {
      try {
        const raw = await this.downloadTextFile(configItem.id);
        stored = normalizeConfig(JSON.parse(raw), fallbackRefreshInterval);
      } catch {
        // Keep defaults if the config file is unreadable.
      }
    }

    const disabledIds = new Set(
      stored.devices.filter((device) => !device.enabled).map((device) => device.id),
    );

    const deviceFolders = items.filter((item) => item.type === "FOLDER");
    const devices: DeviceConfig[] = deviceFolders.map((folder) => {
      const previous = stored.devices.find(
        (device) =>
          device.folderId === folder.id || device.folderName === folder.name,
      );
      const id = previous?.id ?? createDeviceId();
      return {
        id,
        label: previous?.label ?? folder.name,
        folderId: folder.id,
        folderName: folder.name,
        enabled: previous ? previous.enabled : !disabledIds.has(id),
      };
    });

    const config: ExtensionConfig = {
      version: 1,
      refreshIntervalSeconds: stored.refreshIntervalSeconds,
      configFolderId: fieldTrackingId,
      configFileId: configItem?.id,
      devices,
    };

    if (!configItem) {
      try {
        return await this.saveExtensionConfig(config, fieldTrackingId);
      } catch {
        return config;
      }
    }

    return config;
  }

  async downloadTextFile(fileId: string): Promise<string> {
    if (this.mockMode) {
      return mockConnectDataStore.downloadTextFile(fileId);
    }

    const project = this.getProject();
    const fileResponse = await this.client.getFile(project, fileId);
    const file = fileResponse.data;
    if (!file) {
      throw new Error(`File ${fileId} was not found.`);
    }

    const downloadResponse = await this.client.getFileDownloadUrl(file);
    const downloadUrl = downloadResponse.data?.url;
    if (!downloadUrl) {
      throw new Error(`Download URL was not returned for file ${fileId}.`);
    }

    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(`Failed to download file ${file.name}: ${response.status}`);
    }

    return response.text();
  }

  async saveExtensionConfig(
    config: ExtensionConfig,
    parentFolderId?: string,
  ): Promise<ExtensionConfig> {
    if (this.mockMode) {
      return mockConnectDataStore.saveConfig({
        ...config,
        configFolderId:
          config.configFolderId ?? parentFolderId ?? "mock-field-tracking",
        configFileId: config.configFileId ?? "mock-config-file",
      });
    }

    const project = this.getProject();
    const targetFolderId =
      parentFolderId ??
      config.configFolderId ??
      (await this.ensureFieldTrackingFolder());

    const payload = serializeConfig({
      ...config,
      version: 1,
      configFolderId: targetFolderId,
    });

    const blob = new Blob([payload], { type: "application/json" });
    const uploadFile = new File([blob], CONFIG_FILE_NAME, {
      type: "application/json",
    });

    const uploadResponse = await this.client.uploadFileContent(
      project,
      [uploadFile],
      targetFolderId,
      "FOLDER",
    );

    const created = uploadResponse[0]?.data;
    return {
      ...config,
      configFolderId: targetFolderId,
      configFileId: created?.id ?? config.configFileId,
    };
  }

  async getObjectSyncStatus(): Promise<string | null> {
    if (this.mockMode) {
      return mockConnectDataStore.getObjectSyncStatus();
    }

    try {
      const response = await this.client.getProjectSyncStatus(this.getProject());
      return response.data?.status ?? null;
    } catch {
      return null;
    }
  }

  async getChangedFileIds(status: string): Promise<string[]> {
    if (this.mockMode) {
      return status.includes("mock-sync") ? ["mock-track-1"] : [];
    }

    try {
      const response = await this.client.getProjectSyncObjects(
        this.getProject(),
        status,
        "FSOBJECT",
      );
      const responses = response.data ?? [];
      return responses.flatMap((entry) => {
        if (!Array.isArray(entry.objects)) {
          return [];
        }

        return entry.objects
          .map((object) => {
            if (
              object &&
              typeof object === "object" &&
              "id" in object &&
              typeof object.id === "string"
            ) {
              return object.id;
            }
            if (
              object &&
              typeof object === "object" &&
              "fileId" in object &&
              typeof object.fileId === "string"
            ) {
              return object.fileId;
            }
            return null;
          })
          .filter((id): id is string => Boolean(id));
      });
    } catch {
      return [];
    }
  }

  private async createFolder(
    parentId: string,
    name: string,
  ): Promise<ConnectFolderItem> {
    const project = this.getProject();
    if (!this.accessToken) {
      throw new Error("Connect access token is not available.");
    }

    const response = await fetch(apiUrl(project.origin, "folders"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        parentId,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(
        `Failed to create folder "${name}": ${response.status} ${detail}`,
      );
    }

    const created = (await response.json()) as {
      id?: string;
      name?: string;
      modifiedOn?: string;
    };

    if (!created.id) {
      throw new Error(`Folder "${name}" was created but no id was returned.`);
    }

    return {
      id: created.id,
      name: created.name ?? name,
      type: "FOLDER",
      modifiedOn: created.modifiedOn,
      parentId,
    };
  }

  private toProjectContext(project: Project): ConnectProjectContext {
    const projectWithCrs = project as Project & {
      crs?: { name?: string; csib64?: string };
    };
    return {
      id: project.id,
      name: project.name,
      location: project.location,
      crsName: projectWithCrs.crs?.name,
      crsCsib64: projectWithCrs.crs?.csib64,
    };
  }

  private toFolderItem(entry: FileEntry | FolderEntry): ConnectFolderItem {
    return {
      id: entry.id,
      name: entry.name,
      type: entry.type,
      modifiedOn: entry.modifiedOn,
      versionId: entry.versionId,
      parentId: entry.parentId,
    };
  }
}

export const connectClient = new ConnectClient();
