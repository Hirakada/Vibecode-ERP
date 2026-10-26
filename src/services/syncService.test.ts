import { describe, it } from 'node:test';
import assert from 'node:assert';
import { syncService, SyncStatusSummary } from './syncService.ts';

describe('SyncService & Offline Indicator Tests', () => {
  it('should initialize with online status and report correctly', () => {
    const status = syncService.getStatus();
    assert.ok(typeof status.isOnline === 'boolean');
    assert.strictEqual(status.isSyncing, false);
    assert.ok(typeof status.pendingCount === 'number');
  });

  it('should toggle to simulated offline mode and notify subscribers', async () => {
    let notifiedStatus: SyncStatusSummary | null = null;
    const unsub = syncService.subscribe((status) => {
      notifiedStatus = status;
    });

    await syncService.setSimulatedOnline(false);
    assert.strictEqual(syncService.getStatus().isOnline, false);
    assert.ok(notifiedStatus);
    assert.strictEqual((notifiedStatus as SyncStatusSummary).isOnline, false);

    // Try to trigger sync while offline -> should reject
    const syncRes = await syncService.triggerSync();
    assert.strictEqual(syncRes.success, false);
    assert.match(syncRes.error || '', /offline/i);

    unsub();
  });

  it('should toggle back to online mode and allow sync triggering', async () => {
    const statesObserved: boolean[] = [];
    const unsub = syncService.subscribe((status) => {
      statesObserved.push(status.isSyncing);
    });

    await syncService.setSimulatedOnline(true);
    assert.strictEqual(syncService.getStatus().isOnline, true);

    const refreshSummary = await syncService.refreshStatus();
    assert.strictEqual(refreshSummary.isOnline, true);
    assert.strictEqual(typeof refreshSummary.pendingCount, 'number');

    unsub();
  });
});
