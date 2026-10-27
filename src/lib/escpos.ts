import { Sale, BusinessSettings } from '../types';
import { formatIDR } from './currency';

/**
 * ESC/POS Command Constants
 */
export const ESC = 0x1b;
export const GS = 0x1d;

export const COMMANDS = {
  INIT: [ESC, 0x40], // Initialize printer
  ALIGN_LEFT: [ESC, 0x61, 0x00],
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  ALIGN_RIGHT: [ESC, 0x61, 0x02],
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],
  DOUBLE_HEIGHT_ON: [GS, 0x21, 0x01],
  DOUBLE_WIDTH_ON: [GS, 0x21, 0x10],
  DOUBLE_SIZE_ON: [GS, 0x21, 0x11],
  TEXT_NORMAL: [GS, 0x21, 0x00],
  LINE_FEED: [0x0a],
  PAPER_FEED_3: [ESC, 0x64, 0x03],
  PAPER_CUT_PARTIAL: [GS, 0x56, 0x42, 0x00],
};

export interface EscPosOptions {
  paperWidth: '58mm' | '80mm';
  charsPerLine?: number; // 32 for 58mm, 48 for 80mm
}

export class EscPosBuilder {
  private buffer: number[] = [];
  private charsPerLine: number;

  constructor(options: EscPosOptions = { paperWidth: '58mm' }) {
    this.charsPerLine = options.charsPerLine || (options.paperWidth === '58mm' ? 32 : 48);
    this.init();
  }

  public init(): this {
    this.buffer.push(...COMMANDS.INIT);
    return this;
  }

  public alignLeft(): this {
    this.buffer.push(...COMMANDS.ALIGN_LEFT);
    return this;
  }

  public alignCenter(): this {
    this.buffer.push(...COMMANDS.ALIGN_CENTER);
    return this;
  }

  public alignRight(): this {
    this.buffer.push(...COMMANDS.ALIGN_RIGHT);
    return this;
  }

  public bold(on = true): this {
    this.buffer.push(...(on ? COMMANDS.BOLD_ON : COMMANDS.BOLD_OFF));
    return this;
  }

  public titleSize(on = true): this {
    this.buffer.push(...(on ? COMMANDS.DOUBLE_SIZE_ON : COMMANDS.TEXT_NORMAL));
    return this;
  }

  public newLine(count = 1): this {
    for (let i = 0; i < count; i++) {
      this.buffer.push(...COMMANDS.LINE_FEED);
    }
    return this;
  }

  public text(str: string): this {
    const bytes = this.stringToBytes(str);
    this.buffer.push(...bytes);
    return this;
  }

  public textLine(str: string): this {
    this.text(str);
    this.newLine();
    return this;
  }

  public divider(char = '-'): this {
    const line = char.repeat(this.charsPerLine);
    this.textLine(line);
    return this;
  }

  /**
   * Print two columns (e.g. "Kopi Susu" on left, "Rp 22.000" on right)
   */
  public twoColumns(left: string, right: string): this {
    const maxLeftWidth = this.charsPerLine - right.length - 1;
    let formattedLeft = left;
    if (formattedLeft.length > maxLeftWidth) {
      formattedLeft = formattedLeft.substring(0, maxLeftWidth);
    }
    const spaces = Math.max(1, this.charsPerLine - formattedLeft.length - right.length);
    const line = formattedLeft + ' '.repeat(spaces) + right;
    this.textLine(line);
    return this;
  }

  public cut(): this {
    this.newLine(3);
    this.buffer.push(...COMMANDS.PAPER_CUT_PARTIAL);
    return this;
  }

  public feedAndFinish(): Uint8Array {
    this.newLine(4);
    return new Uint8Array(this.buffer);
  }

  private stringToBytes(str: string): number[] {
    const bytes: number[] = [];
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      if (code < 128) {
        bytes.push(code);
      } else {
        // Simple ASCII fallback for non-ASCII
        bytes.push(0x20); // space or replace
      }
    }
    return bytes;
  }
}

/**
 * Generate complete ESC/POS receipt byte sequence for Caozy
 */
export function buildReceiptEscPos(
  sale: Sale,
  settings: BusinessSettings,
  paperWidth: '58mm' | '80mm' = '58mm',
  isReprint = false
): Uint8Array {
  const charsPerLine = paperWidth === '58mm' ? 32 : 48;
  const builder = new EscPosBuilder({ paperWidth, charsPerLine });

  // 1. Header (Centered)
  builder
    .alignCenter()
    .bold(true)
    .titleSize(true)
    .textLine(settings.businessName.toUpperCase())
    .titleSize(false)
    .bold(false)
    .textLine(settings.address)
    .textLine(`Telp: ${settings.phone}`);

  // Reprint Banner if applicable
  if (isReprint || sale.isReprinted) {
    builder
      .newLine()
      .bold(true)
      .textLine('*** SALINAN STRUK (REPRINT) ***')
      .bold(false);
  }

  builder.divider('-');

  // 2. Transaction Info
  builder
    .alignLeft()
    .twoColumns('No:', sale.transactionNumber)
    .twoColumns('Waktu:', new Date(sale.createdAt).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }) + ' ' + new Date(sale.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB')
    .twoColumns('Kasir:', sale.cashierName);

  if (sale.syncStatus === 'pending_sync') {
    builder.alignCenter().textLine('[MODE OFFLINE - TERSIMPAN]').alignLeft();
  }

  builder.divider('-');

  // 3. Items list
  sale.items.forEach((item) => {
    builder.bold(true).textLine(item.productName).bold(false);
    if (item.variantName) {
      builder.textLine(` Varian: ${item.variantName}`);
    }
    if (item.selectedModifiers && item.selectedModifiers.length > 0) {
      item.selectedModifiers.forEach((m) => {
        builder.textLine(` + ${m.name}`);
      });
    }
    if (item.notes) {
      builder.textLine(` * ${item.notes}`);
    }
    if (item.itemDiscount && item.itemDiscount > 0) {
      builder.twoColumns(' Diskon Item:', `-${formatIDR(item.itemDiscount)}`);
    }
    builder.twoColumns(` ${item.quantity} x ${formatIDR(item.unitPrice)}`, formatIDR(item.itemTotal));
  });

  builder.divider('-');

  // 4. Totals
  builder.twoColumns('Subtotal:', formatIDR(sale.subtotal));
  if (sale.itemDiscountTotal && sale.itemDiscountTotal > 0) {
    builder.twoColumns('Diskon Item:', `-${formatIDR(sale.itemDiscountTotal)}`);
  }
  if (sale.discount > 0) {
    const discountLabel = sale.discountInfo?.type === 'percent'
      ? `Diskon Total (${sale.discountInfo.value}%):`
      : 'Diskon Total:';
    builder.twoColumns(discountLabel, `-${formatIDR(sale.discount)}`);
    if (sale.discountInfo?.reason) {
      builder.textLine(` * ${sale.discountInfo.reason}`);
    }
    if (sale.discountInfo?.approvedBy) {
      builder.textLine(` Otorisasi: ${sale.discountInfo.approvedBy}`);
    }
  }
  if (sale.serviceFee && sale.serviceFee > 0) {
    builder.twoColumns('Biaya Layanan:', `+${formatIDR(sale.serviceFee)}`);
  }
  if (sale.deliveryFee && sale.deliveryFee > 0) {
    builder.twoColumns('Ongkos Kirim:', `+${formatIDR(sale.deliveryFee)}`);
  }
  if (sale.tax > 0) {
    builder.twoColumns(`Pajak (PB1):`, formatIDR(sale.tax));
  }

  builder.bold(true).twoColumns('TOTAL:', formatIDR(sale.grandTotal)).bold(false);
  builder.divider('-');

  // 5. Payment Details
  if (sale.payment) {
    builder
      .twoColumns('Metode:', sale.payment.method.toUpperCase())
      .twoColumns('Status:', 'LUNAS');
    if (sale.payment.method === 'cash') {
      builder
        .twoColumns('Bayar:', formatIDR(sale.payment.amountPaid))
        .twoColumns('Kembali:', formatIDR(sale.payment.change));
    }
    if (sale.payment.externalReference) {
      builder.twoColumns('Ref:', sale.payment.externalReference);
    }
  }

  builder.divider('-');

  // 6. Footer (Centered)
  builder
    .alignCenter()
    .textLine('Terima kasih telah berkunjung!')
    .textLine('Follow IG: @caozy.id')
    .textLine('Saran & Kritik: 0812-3456-7890');

  return builder.feedAndFinish();
}

/**
 * Generate test print ESC/POS bytes
 */
export function buildTestPrintEscPos(printerName: string, paperWidth: '58mm' | '80mm' = '58mm'): Uint8Array {
  const charsPerLine = paperWidth === '58mm' ? 32 : 48;
  const builder = new EscPosBuilder({ paperWidth, charsPerLine });

  builder
    .alignCenter()
    .bold(true)
    .titleSize(true)
    .textLine('CAOZY ERP')
    .titleSize(false)
    .textLine('TEST PRINT BLUETOOTH OK')
    .bold(false)
    .divider('=')
    .alignLeft()
    .twoColumns('Perangkat:', printerName)
    .twoColumns('Kertas:', paperWidth)
    .twoColumns('Status:', 'TERHUBUNG')
    .twoColumns('Waktu:', new Date().toLocaleTimeString('id-ID') + ' WIB')
    .divider('=')
    .alignCenter()
    .textLine('Printer thermal siap digunakan!')
    .newLine(2);

  return builder.feedAndFinish();
}
