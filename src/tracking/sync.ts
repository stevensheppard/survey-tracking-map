import { ConnectClient } from "../connect/connectClient";

export class TrackingSyncCoordinator {
  private lastSyncStatus: string | null = null;

  constructor(private readonly client: ConnectClient) {}

  async getChangedFileIds(): Promise<string[] | null> {
    const status = await this.client.getObjectSyncStatus();
    if (!status) {
      return null;
    }

    if (this.lastSyncStatus === status) {
      return [];
    }

    const changedIds = await this.client.getChangedFileIds(status);
    this.lastSyncStatus = status;
    return changedIds;
  }

  reset(): void {
    this.lastSyncStatus = null;
  }
}
