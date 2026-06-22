declare module '@/uni_modules/yuntu-printer-uts' {
  export type ConnectState = 'connectSuccess' | 'disconnect' | 'connectFail'
  export type EscJustification = 'left' | 'center' | 'right'
  export type PrinterConnectionType = 'bluetooth' | 'wifi' | 'noryox'

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

  export interface TwoColumnText {
    left: string
    right: string
  }

  export interface ThreeColumnText {
    left: string
    middle: string
    right: string
  }

  export interface FourColumnText {
    one: string
    two: string
    three: string
    four: string
  }

  export interface EscQRCodeParam {
    content: string
    size: number
  }

  export interface EscImageParam {
    base64Str: string
  }

  export interface ScanPrintersSuccess {
    devices: PrinterDevice[]
  }

  export interface ScanPrintersOptions {
    timeout?: number
    serviceUUIDs?: string[]
    success?: (res: ScanPrintersSuccess) => void
    fail?: (err: PrinterError) => void
    complete?: () => void
  }

  export interface StopScanPrintersOptions {
    success?: () => void
    fail?: (err: PrinterError) => void
    complete?: () => void
  }

  export interface ConnectPrinterOptions {
    deviceId: string
    serviceUUIDs?: string[]
    writeCharacteristicUUIDs?: string[]
    timeout?: number
    success?: (res: PrinterConnection) => void
    fail?: (err: PrinterError) => void
    complete?: () => void
  }

  export interface ConnectNetOptions {
    ip: string
    port: string | number
    timeout?: number
    success?: (res: PrinterConnection) => void
    fail?: (err: PrinterError) => void
    complete?: () => void
  }

  export interface DisconnectPrinterOptions {
    success?: () => void
    fail?: (err: PrinterError) => void
    complete?: () => void
  }

  export interface GetConnectedPrinterOptions {
    success?: (res: PrinterConnection) => void
    fail?: (err: PrinterError) => void
    complete?: () => void
  }

  export interface CheckBuiltInPrinterSuccess {
    available: boolean
    device?: PrinterDevice
  }

  export interface CheckBuiltInPrinterOptions {
    success?: (res: CheckBuiltInPrinterSuccess) => void
    fail?: (err: PrinterError) => void
    complete?: () => void
  }

  export interface PrintEscOptions {
    bytes: number[]
    chunkSize?: number
    success?: () => void
    fail?: (err: PrinterError) => void
    complete?: () => void
  }

  export interface PrintTextOptions {
    title: string
    lines: string[]
    feed?: number
    cut?: boolean
    chunkSize?: number
    success?: () => void
    fail?: (err: PrinterError) => void
    complete?: () => void
  }

  export type BlueStateCallback = (on: boolean) => void
  export type ConnectStateCallback = (payload: ConnectStatePayload) => void
  export type DataReceiveCallback = (data: number[]) => void
  export type WriteDataCallback = (info: WriteDataResult) => void

  export const scanBlue: (callback: (device: PrinterDevice) => void) => void
  export const stopScanBlue: () => void
  export const connectBlue: (deviceId: string) => void
  export const disconnect: () => void
  export const isConnect: () => boolean
  export const writeData: (callback: WriteDataCallback | null) => void
  export const onBlueStateChange: (callback: BlueStateCallback) => void
  export const onConnectStateChange: (callback: ConnectStateCallback) => void
  export const onDataReceive: (callback: DataReceiveCallback) => void
  export const clearCommandBuffer: () => void
  export const escInitializePrinter: () => void
  export const escJustification: (position: EscJustification) => void
  export const escSetCharcterSize: (size: 1 | 2) => void
  export const escTurnEmphasizedMode: (on: boolean) => void
  export const escCutPaper: () => void
  export const escNewLine: () => void
  export const addPrintAndFeedLines: (lines: number) => void
  export const escText: (text: string) => void
  export const escTwoText58: (payload: TwoColumnText) => string
  export const escThreeText58: (payload: ThreeColumnText) => string
  export const escFourText58: (payload: FourColumnText) => string
  export const escQRCode: (payload: EscQRCodeParam) => void
  export const escImage: (payload: EscImageParam) => void
  export const escStringCommand: (command: string) => void
  export const escBytesCommand: (command: number[]) => void
  export const scanPrinters: (options: ScanPrintersOptions) => void
  export const stopScanPrinters: (options: StopScanPrintersOptions) => void
  export const connectPrinter: (options: ConnectPrinterOptions) => void
  export const connectNet: (options: ConnectNetOptions) => void
  export const disconnectPrinter: (options: DisconnectPrinterOptions) => void
  export const getConnectedPrinter: (options: GetConnectedPrinterOptions) => void
  export const checkBuiltInPrinter: (options: CheckBuiltInPrinterOptions) => void
  export const printEsc: (options: PrintEscOptions) => void
  export const printText: (options: PrintTextOptions) => void
}
