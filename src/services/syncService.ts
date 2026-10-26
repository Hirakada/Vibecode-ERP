import { db } from '../lib/storage';

export interface SyncStatusSummary {
  pendingCount: number;
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  lastError: string | null;
}

class SyncService {
  private isOnline = true;
  private isSyncing = false;
  private pendingCount = 0;
  private lastSyncedAt: string | null = null;
  private lastError: string | null = null;
  private listeners: ((status: SyncStatusSummary) => void)[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      this.isOnline = navigator.onLine;
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));
      // Periodic check every 15 seconds to keep pendingCount in sync
      setInterval(() => {
        this.notify();
      }, 15000);
    }
  }

  public subscribe(listener: (status: SyncStatusSummary) => void) {
    this.listeners.push(listener);
    this.notify();
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public async setSimulatedOnline(online: boolean) {
    this.isOnline = online;
    await this.notify();
    if (online) {
      await this.triggerSync();
    }
  }

  public getStatus(): SyncStatusSummary {
    return {
      pendingCount: this.pendingCount,
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      lastSyncedAt: this.lastSyncedAt,
      lastError: this.lastError,
    };
  }

  public async getPendingCount(): Promise<number> {
    try {
      return await db.syncOutbox.count();
    } catch {
      return 0;
    }
  }

  public async refreshStatus(): Promise<SyncStatusSummary> {
    await this.notify();
    return this.getStatus();
  }

  public async triggerSync(): Promise<{ success: boolean; syncedCount: number; error?: string }> {
    if (!this.isOnline) {
      return { success: false, syncedCount: 0, error: 'Aplikasi sedang offline' };
    }
    if (this.isSyncing) {
      return { success: false, syncedCount: 0, error: 'Sinkronisasi sedang berlangsung' };
    }

    this.isSyncing = true;
    this.lastError = null;
    await this.notify();

    try {
      const pendingOps = await db.syncOutbox.toArray();
      let syncedCount = 0;

      if (pendingOps.length === 0) {
        // Brief simulated check for tactile UI feedback
        await new Promise((r) => setTimeout(r, 400));
      } else {
        for (const op of pendingOps) {
          // Simulate network transmission per outbox batch
          await new Promise((r) => setTimeout(r, 300));

          if (op.operationType === 'create_sale') {
            const sale = await db.sales.get(op.payload.id);
            if (sale) {
              sale.syncStatus = 'synced';
              await db.sales.put(sale);
            }
          }

          await db.syncOutbox.delete(op.id);
          syncedCount++;
        }
      }

      this.lastSyncedAt = new Date().toISOString();
      this.isSyncing = false;
      await this.notify();
      return { success: true, syncedCount };
    } catch (err: any) {
      this.lastError = err.message || 'Gagal melakukan sinkronisasi';
      this.isSyncing = false;
      await this.notify();
      return { success: false, syncedCount: 0, error: this.lastError || undefined };
    }
  }

  private handleNetworkChange(online: boolean) {
    this.isOnline = online;
    this.notify();
    if (online) {
      this.triggerSync();
    }
  }

  private async notify() {
    this.pendingCount = await this.getPendingCount();
    const summary: SyncStatusSummary = {
      pendingCount: this.pendingCount,
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      lastSyncedAt: this.lastSyncedAt,
      lastError: this.lastError,
    };
    this.listeners.forEach((l) => l(summary));
  }
}

export const syncService = new SyncService();
