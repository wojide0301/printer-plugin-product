declare module '@/uni_modules/yuntu-printer-uts' {
  // ---- types ----
  export type ConnectState = 'connectSuccess' | 'disconnect' | 'connectFail'
  export type EscJustification = 'left' | 'center' | 'right'
  export type PrinterConnectionType = 'bluetooth' | 'wifi' | 'noryox'
  export type BuiltInTextAlign = 'left' | 'center' | 'right'
  export type BuiltInTextStyle = 'normal' | 'bold' | 'italic' | 'boldItalic'
  export type BuiltInBarcodeSymbology =
    | 'code128'
    | 'code39'
    | 'code93'
    | 'upcA'
    | 'upcE'
    | 'ean13'
    | 'ean8'
    | 'itf'
    | 'codabar'
  export type BuiltInImageType = 'blackWhite' | 'grayscale'

  export interface PrinterDevice {
    deviceId: string
    name: string
    rssi: number
    serviceUUIDs: string[]
    type?: PrinterConnectionType
  }

  export interface PrinterConnection {
    deviceId: string
    name: string
    serviceUUID: string
    writeCharacteristicUUID: string
    type?: PrinterConnectionType
    ip?: string
    port?: number
  }

  export interface PrinterError {
    errCode: number
    errMsg: string
  }

  export interface WriteDataResult {
    byteLength: number
    chunkCount: number
    complete?: boolean
    msg?: string
  }

  export interface ConnectStatePayload {
    state: ConnectState
    deviceId?: string
    errMsg?: string
  }

  export interface ScanPrintersSuccess {
    devices: PrinterDevice[]
  }

  export interface CheckBuiltInPrinterSuccess {
    available: boolean
    device?: PrinterDevice
  }

  export interface BuiltInPrinterResult {
    code: number
    ok: boolean
    message: string
  }

  export interface ScanPrintersSimpleOptions {
    timeout?: number
    serviceUUIDs?: string[]
  }

  export interface ConnectPrinterSimpleOptions {
    deviceId: string
    serviceUUIDs?: string[]
    writeCharacteristicUUIDs?: string[]
    timeout?: number
  }

  export interface ConnectWifiSimpleOptions {
    ip: string
    port: string | number
    timeout?: number
  }

  export interface PrintTextSimpleOptions {
    title: string
    lines: string[]
    feed?: number
    cut?: boolean
    chunkSize?: number
  }

  export interface PrintBuiltInTextOptions {
    text: string
    format?: BuiltInTextFormat
    textWidth?: number
    align?: BuiltInTextAlign
    autoOut?: boolean
  }

  export interface PrintBuiltInBarcodeOptions {
    content: string
    width: number
    height: number
    textPosition?: number
    align?: BuiltInTextAlign
    symbology?: BuiltInBarcodeSymbology
    autoOut?: boolean
  }

  export interface PrintBuiltInQrCodeOptions {
    content: string
    width: number
    height: number
    align?: BuiltInTextAlign
    autoOut?: boolean
  }

  export interface PrintBuiltInImageOptions {
    base64Str: string
    type?: BuiltInImageType
    align?: BuiltInTextAlign
    autoOut?: boolean
  }

  export interface PrintBuiltInLabelOptions {
    height: number
    gap: number
    autoLocate?: boolean
    detectBeforeLocate?: boolean
    actions: BuiltInLabelAction[]
  }

  export interface PrintBuiltInTableOptions {
    rows: BuiltInTableRow[]
    autoOut?: boolean
  }

  export interface PrintBuiltInTwoColumnOptions {
    leftText: string
    rightText: string
    paperWidthDots?: number
    charWidthDots?: number
    autoOut?: boolean
  }

  export interface PrintBuiltInThreeColumnOptions {
    leftText: string
    middleText: string
    rightText: string
    middlePositionDots?: number
    rightPositionDots?: number
    autoOut?: boolean
  }

  export interface PrintBuiltInFourColumnOptions {
    oneText: string
    twoText: string
    threeText: string
    fourText: string
    twoPositionDots?: number
    threePositionDots?: number
    fourPositionDots?: number
    autoOut?: boolean
  }

  export interface BuiltInTextFormat {
    textSize?: number
    underline?: boolean
    textScaleX?: number
    textScaleY?: number
    letterSpacing?: number
    lineSpacing?: number
    topPadding?: number
    leftPadding?: number
    align?: BuiltInTextAlign
    style?: BuiltInTextStyle
    font?: number
    path?: string
  }

  export interface BuiltInTableRow {
    texts: string[]
    weights: number[]
    formats?: BuiltInTextFormat[]
  }

  export type BuiltInLabelAction = {
    type: string
    text?: string
    format?: BuiltInTextFormat
    content?: string
    width?: number
    height?: number
    textPosition?: number
    align?: BuiltInTextAlign
    symbology?: BuiltInBarcodeSymbology
  }

  // ---- classes ----

  export class EscBuilder {
    clearCommandBuffer(): void
    escInitializePrinter(): void
    escJustification(position: EscJustification): void
    escSetCharcterSize(size: 1 | 2): void
    escTurnEmphasizedMode(on: boolean): void
    escCutPaper(): void
    escNewLine(): void
    addPrintAndFeedLines(lines: number): void
    escText(text: string): void
    escQRCode(payload: EscQRCodeParam): void
    escTwoColumn(leftText: string, rightText: string, paperWidthDots?: number, charWidthDots?: number): void
    escThreeColumn(leftText: string, middleText: string, rightText: string, middlePositionDots?: number, rightPositionDots?: number): void
    escFourColumn(oneText: string, twoText: string, threeText: string, fourText: string, twoPositionDots?: number, threePositionDots?: number, fourPositionDots?: number): void
    escStringCommand(command: string): void
    escBytesCommand(command: number[]): void
  }

  export class BuiltInPrinter {
    printText(
      text: string,
      format?: BuiltInTextFormat,
      textWidth?: number,
      align?: BuiltInTextAlign,
      autoOut?: boolean,
    ): Promise<BuiltInPrinterResult>
    printBarcode(
      content: string,
      width: number,
      height: number,
      textPosition?: number,
      align?: BuiltInTextAlign,
      symbology?: BuiltInBarcodeSymbology,
      autoOut?: boolean,
    ): Promise<BuiltInPrinterResult>
    printQrCode(
      content: string,
      width: number,
      height: number,
      align?: BuiltInTextAlign,
      autoOut?: boolean,
    ): Promise<BuiltInPrinterResult>
    printImage(
      base64Str: string,
      type?: BuiltInImageType,
      align?: BuiltInTextAlign,
      autoOut?: boolean,
    ): Promise<BuiltInPrinterResult>
    printLabel(
      height: number,
      gap: number,
      actions: BuiltInLabelAction[],
      autoLocate?: boolean,
      detectBeforeLocate?: boolean,
    ): Promise<BuiltInPrinterResult>
    printTable(rows: BuiltInTableRow[], autoOut?: boolean): Promise<boolean>
    clearLabelLearning(): Promise<BuiltInPrinterResult>
  }

  // ---- functions ----

  export function createEscBuilder(): EscBuilder
  export function sendEsc(builder: EscBuilder): Promise<WriteDataResult>
  export function getBuiltInPrinter(): BuiltInPrinter | null

  export function scanPrinters(options?: ScanPrintersSimpleOptions): Promise<ScanPrintersSuccess>
  export function stopScanPrinters(): void
  export function connectPrinter(options: ConnectPrinterSimpleOptions): Promise<PrinterConnection>
  export function connectWifi(options: ConnectWifiSimpleOptions): Promise<PrinterConnection>
  export function disconnectPrinter(): Promise<boolean>
  export function getConnectedPrinter(): PrinterConnection | null
  export function checkBuiltInPrinter(): Promise<CheckBuiltInPrinterSuccess>
  export function testPrint(options: ConnectPrinterSimpleOptions): Promise<WriteDataResult>
  export function printText(options: PrintTextSimpleOptions): Promise<WriteDataResult>
  export function printEsc(bytes: number[], chunkSize?: number): Promise<WriteDataResult>
  export function printBuiltInText(options: PrintBuiltInTextOptions): Promise<BuiltInPrinterResult>
  export function printBuiltInBarcode(
    options: PrintBuiltInBarcodeOptions,
  ): Promise<BuiltInPrinterResult>
  export function printBuiltInQrCode(
    options: PrintBuiltInQrCodeOptions,
  ): Promise<BuiltInPrinterResult>
  export function printBuiltInImage(
    options: PrintBuiltInImageOptions,
  ): Promise<BuiltInPrinterResult>
  export function printBuiltInLabel(
    options: PrintBuiltInLabelOptions,
  ): Promise<BuiltInPrinterResult>
  export function printBuiltInTable(options: PrintBuiltInTableOptions): Promise<boolean>
  export function printBuiltInTwoColumn(
    options: PrintBuiltInTwoColumnOptions,
  ): Promise<BuiltInPrinterResult>
  export function printBuiltInThreeColumn(
    options: PrintBuiltInThreeColumnOptions,
  ): Promise<BuiltInPrinterResult>
  export function printBuiltInFourColumn(
    options: PrintBuiltInFourColumnOptions,
  ): Promise<BuiltInPrinterResult>
  export function onConnectStateChange(callback: (payload: ConnectStatePayload) => void): void
}
