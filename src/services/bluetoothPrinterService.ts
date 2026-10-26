import { buildReceiptEscPos, buildTestPrintEscPos } from '../lib/escpos';
import { Sale, BusinessSettings } from '../types';

export interface BluetoothPrinterStatus {
  isSupported: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  isPrinting: boolean;
  deviceName: string | null;
  deviceId: string | null;
  lastPrintedAt: string | null;
  lastError: string | null;
  isSimulated: boolean;
}

const COMMON_PRINTER_SERVICE_UUIDS = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Standard Printer
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Posiflex / Eppos / Panda
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC Transparent UART
  '0000ff00-0000-1000-8000-00805f9b34fb', // Generic Vendor Serial
  '0000fee7-0000-1000-8000-00805f9b34fb', // Mini POS
  '0000af30-0000-1000-8000-00805f9b34fb', // Generic BLE printer
];

class BluetoothPrinterService {
  private device: any = null;
  private characteristic: any = null;
  private isConnecting = false;
  private isPrinting = false;
  private isSimulated = false;
  private lastError: string | null = null;
  private lastPrintedAt: string | null = null;
  private listeners: ((status: BluetoothPrinterStatus) => void)[] = [];

  constructor() {
    // Check saved state from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('caozy_bt_simulated');
      if (saved === 'true') {
        this.isSimulated = true;
      }
    }
  }

  public isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return typeof (navigator as any).bluetooth !== 'undefined' || this.isSimulated;
  }

  public getStatus(): BluetoothPrinterStatus {
    return {
      isSupported: this.isSupported(),
      isConnected: this.isSimulated || (this.device !== null && this.device.gatt?.connected),
      isConnecting: this.isConnecting,
      isPrinting: this.isPrinting,
      deviceName: this.isSimulated ? 'Thermal BT-58 (Virtual Sim)' : this.device?.name || null,
      deviceId: this.isSimulated ? 'virtual-bt-01' : this.device?.id || null,
      lastPrintedAt: this.lastPrintedAt,
      lastError: this.lastError,
      isSimulated: this.isSimulated,
    };
  }

  public subscribe(listener: (status: BluetoothPrinterStatus) => void): () => void {
    this.listeners.push(listener);
    listener(this.getStatus());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public toggleSimulation(simulated: boolean) {
    this.isSimulated = simulated;
    if (typeof window !== 'undefined') {
      localStorage.setItem('caozy_bt_simulated', String(simulated));
    }
    this.notify();
  }

  /**
   * Request Bluetooth Device and connect to GATT Server
   */
  public async connect(): Promise<{ success: boolean; error?: string }> {
    this.lastError = null;

    if (this.isSimulated) {
      this.notify();
      return { success: true };
    }

    if (typeof (navigator as any).bluetooth === 'undefined') {
      this.lastError = 'Browser ini belum mendukung Web Bluetooth API. Gunakan Chrome/Edge atau aktifkan Printer Bluetooth Virtual.';
      this.notify();
      return { success: false, error: this.lastError };
    }

    this.isConnecting = true;
    this.notify();

    try {
      // Prompt user to select Bluetooth printer
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [
          { namePrefix: 'MPT' },
          { namePrefix: 'RPP' },
          { namePrefix: 'PT' },
          { namePrefix: 'Panda' },
          { namePrefix: 'POS' },
          { namePrefix: 'Eppos' },
          { namePrefix: 'Printer' },
          { namePrefix: 'BT' },
        ],
        optionalServices: COMMON_PRINTER_SERVICE_UUIDS,
      }).catch(async () => {
        // Fallback: accept all devices if user printer prefix is custom
        return await (navigator as any).bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: COMMON_PRINTER_SERVICE_UUIDS,
        });
      });

      if (!device) {
        throw new Error('Tidak ada perangkat printer bluetooth yang dipilih.');
      }

      device.addEventListener('gattserverdisconnected', () => {
        this.characteristic = null;
        this.notify();
      });

      const server = await device.gatt.connect();

      // Locate writable characteristic across common printer services
      let foundChar: any = null;

      for (const serviceUuid of COMMON_PRINTER_SERVICE_UUIDS) {
        try {
          const service = await server.getPrimaryService(serviceUuid);
          const chars = await service.getCharacteristics();
          for (const c of chars) {
            if (c.properties.write || c.properties.writeWithoutResponse) {
              foundChar = c;
              break;
            }
          }
          if (foundChar) break;
        } catch {
          // Continue to next service UUID candidate
        }
      }

      if (!foundChar) {
        // Try getting all primary services if permissible
        try {
          const services = await server.getPrimaryServices();
          for (const s of services) {
            const chars = await s.getCharacteristics();
            for (const c of chars) {
              if (c.properties.write || c.properties.writeWithoutResponse) {
                foundChar = c;
                break;
              }
            }
            if (foundChar) break;
          }
        } catch {
          // Handled below
        }
      }

      if (!foundChar) {
        throw new Error('Karakteristik write ESC/POS tidak ditemukan pada printer ini.');
      }

      this.device = device;
      this.characteristic = foundChar;
      this.isConnecting = false;
      this.notify();
      return { success: true };
    } catch (err: any) {
      this.isConnecting = false;
      this.lastError = err.message || 'Gagal menyambungkan printer bluetooth';
      this.notify();
      return { success: false, error: this.lastError || undefined };
    }
  }

  public async disconnect(): Promise<void> {
    if (this.isSimulated) {
      this.isSimulated = false;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('caozy_bt_simulated');
      }
    } else if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }
    this.device = null;
    this.characteristic = null;
    this.notify();
  }

  /**
   * Send ESC/POS bytes directly to the Bluetooth Thermal Printer
   */
  public async printBytes(bytes: Uint8Array): Promise<{ success: boolean; error?: string }> {
    if (!this.getStatus().isConnected) {
      return { success: false, error: 'Printer bluetooth belum terhubung.' };
    }

    this.isPrinting = true;
    this.lastError = null;
    this.notify();

    try {
      if (this.isSimulated) {
        // Simulate printing delay
        await new Promise((r) => setTimeout(r, 600));
        this.lastPrintedAt = new Date().toISOString();
        this.isPrinting = false;
        this.notify();
        return { success: true };
      }

      if (!this.characteristic) {
        throw new Error('Karakteristik printer bluetooth terputus.');
      }

      // Chunk writing (max 100 bytes per BLE write to prevent buffer overflow)
      const CHUNK_SIZE = 100;
      for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
        const chunk = bytes.slice(i, i + CHUNK_SIZE);
        if (this.characteristic.writeValueWithoutResponse) {
          await this.characteristic.writeValueWithoutResponse(chunk);
        } else {
          await this.characteristic.writeValue(chunk);
        }
        // Micro-pause between packets for thermal printer buffer
        await new Promise((r) => setTimeout(r, 25));
      }

      this.lastPrintedAt = new Date().toISOString();
      this.isPrinting = false;
      this.notify();
      return { success: true };
    } catch (err: any) {
      this.isPrinting = false;
      this.lastError = err.message || 'Gagal mengirim data cetak ke printer bluetooth';
      this.notify();
      return { success: false, error: this.lastError || undefined };
    }
  }

  /**
   * Print a complete transaction receipt directly to the Bluetooth printer
   */
  public async printReceipt(
    sale: Sale,
    settings: BusinessSettings,
    paperWidth: '58mm' | '80mm' = '58mm',
    isReprint = false
  ): Promise<{ success: boolean; error?: string }> {
    const bytes = buildReceiptEscPos(sale, settings, paperWidth, isReprint);
    return await this.printBytes(bytes);
  }

  /**
   * Run diagnostic test print
   */
  public async testPrint(paperWidth: '58mm' | '80mm' = '58mm'): Promise<{ success: boolean; error?: string }> {
    const status = this.getStatus();
    const printerName = status.deviceName || 'Printer Bluetooth 58mm';
    const bytes = buildTestPrintEscPos(printerName, paperWidth);
    return await this.printBytes(bytes);
  }

  private notify() {
    const status = this.getStatus();
    this.listeners.forEach((l) => l(status));
  }
}

export const bluetoothPrinterService = new BluetoothPrinterService();
