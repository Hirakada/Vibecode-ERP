import { useState, useEffect, useCallback } from 'react';
import {
  bluetoothPrinterService,
  BluetoothPrinterStatus,
} from '../services/bluetoothPrinterService';
import { Sale, BusinessSettings } from '../types';
import { buildReceiptEscPos, buildTestPrintEscPos } from '../lib/escpos';

export interface UsePrinterReturn {
  // Reactive status
  isSupported: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  isPrinting: boolean;
  deviceName: string | null;
  deviceId: string | null;
  lastPrintedAt: string | null;
  error: string | null;
  isSimulated: boolean;

  // Web Bluetooth Actions
  scanAndConnect: () => Promise<{ success: boolean; error?: string }>;
  disconnect: () => Promise<void>;
  printRawCommands: (commands: Uint8Array | number[]) => Promise<{ success: boolean; error?: string }>;
  printReceipt: (
    sale: Sale,
    settings: BusinessSettings,
    paperWidth?: '58mm' | '80mm',
    isReprint?: boolean
  ) => Promise<{ success: boolean; error?: string }>;
  testPrint: (paperWidth?: '58mm' | '80mm') => Promise<{ success: boolean; error?: string }>;
  toggleSimulation: (enable: boolean) => void;
}

/**
 * Custom React hook `usePrinter`
 * Utilizes Web Bluetooth API to scan for thermal printers and send raw ESC/POS commands.
 */
export function usePrinter(): UsePrinterReturn {
  const [status, setStatus] = useState<BluetoothPrinterStatus>(
    bluetoothPrinterService.getStatus()
  );

  useEffect(() => {
    const unsubscribe = bluetoothPrinterService.subscribe((newStatus) => {
      setStatus(newStatus);
    });
    return () => unsubscribe();
  }, []);

  /**
   * Scan for Bluetooth thermal printers using Web Bluetooth API and connect
   */
  const scanAndConnect = useCallback(async () => {
    return await bluetoothPrinterService.connect();
  }, []);

  /**
   * Disconnect current printer
   */
  const disconnect = useCallback(async () => {
    await bluetoothPrinterService.disconnect();
  }, []);

  /**
   * Send raw ESC/POS byte sequence directly to the connected thermal printer
   */
  const printRawCommands = useCallback(async (commands: Uint8Array | number[]) => {
    const bytes = commands instanceof Uint8Array ? commands : new Uint8Array(commands);
    return await bluetoothPrinterService.printBytes(bytes);
  }, []);

  /**
   * Convert a Sale into ESC/POS commands and initiate printing
   */
  const printReceipt = useCallback(
    async (
      sale: Sale,
      settings: BusinessSettings,
      paperWidth: '58mm' | '80mm' = '58mm',
      isReprint = false
    ) => {
      const escPosBytes = buildReceiptEscPos(sale, settings, paperWidth, isReprint);
      return await bluetoothPrinterService.printBytes(escPosBytes);
    },
    []
  );

  /**
   * Send diagnostic test print ESC/POS commands
   */
  const testPrint = useCallback(
    async (paperWidth: '58mm' | '80mm' = '58mm') => {
      return await bluetoothPrinterService.testPrint(paperWidth);
    },
    []
  );

  /**
   * Toggle virtual printer simulation mode
   */
  const toggleSimulation = useCallback((enable: boolean) => {
    bluetoothPrinterService.toggleSimulation(enable);
  }, []);

  return {
    isSupported: status.isSupported,
    isConnected: status.isConnected,
    isConnecting: status.isConnecting,
    isPrinting: status.isPrinting,
    deviceName: status.deviceName,
    deviceId: status.deviceId,
    lastPrintedAt: status.lastPrintedAt,
    error: status.lastError,
    isSimulated: status.isSimulated,
    scanAndConnect,
    disconnect,
    printRawCommands,
    printReceipt,
    testPrint,
    toggleSimulation,
  };
}
