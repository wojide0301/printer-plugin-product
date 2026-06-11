# Printer UTS Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增一个支持 Android 和 iOS 的 uni-app UTS 蓝牙打印插件，并在 `src/pages/printer/index.vue` 提供扫描、连接、测试打印和断开能力。

**Architecture:** 插件放在 `src/uni_modules/yuntu-printer-uts`，通过 `utssdk/interface.uts` 暴露统一 API，`utssdk/app-android` 使用 Android BLE API 实现，`utssdk/app-ios` 使用 CoreBluetooth 实现。API 兼容 GPrinter 文档里的 `scanBlue/connectBlue/writeData/onConnectStateChange/onDataReceive` 使用习惯，同时提供更语义化的 `scanPrinters/connectPrinter/printEsc/printText` 包装；ESC/POS 指令用缓冲构建器先在 TypeScript 侧落测试，再同步到 UTS 插件内。

**Tech Stack:** uni-app Vue 3, UTS, Android BluetoothGatt/BluetoothLeScanner, iOS CoreBluetooth, ESC/POS, Wot UI, Vitest.

---

## Scope Notes

- 支持平台：Android、iOS。
- 第一版连接方式：BLE GATT 写入特征值。原因是 iOS 普通 App 无法直接使用 Android 常见的经典蓝牙 SPP/RFCOMM 打印通道，BLE 是两端可统一交付的能力。
- Android 经典蓝牙 SPP 可作为后续扩展 `transport: 'classic'`，不混入第一版，避免 iOS API 出现不可实现分支。
- 已阅读本地 PDF：`/Users/apple/Downloads/GPrinter+-+蓝牙打印使用指南.pdf` 共 3 页，`/Users/apple/Downloads/GPrinter - ESC指令使用指南.pdf` 共 17 页。文档来自 `xl-GPrinter` UTS 插件，明确支持 Android/iOS、TSPL/TSC、CPCL、ESC，单位换算为 `200dpi: 1mm = 8dot`、`300dpi: 1mm = 12dot`。
- 蓝牙指南要求的通信模型：扫描 `scanBlue((device) => void)`、停止 `stopScanBlue()`、连接 `connectBlue(deviceId)`、断开 `disconnect()`、写入 `writeData(callback?)`；写入前必须先构造打印指令。事件包括 `onBlueStateChange((on) => void)`、`onConnectStateChange((payload) => void)`，状态值至少包含 `connectSuccess`、`disconnect`、`connectFail`，以及 `onDataReceive((data) => void)`。
- ESC 指令指南要求的构建模型：先调用 `escInitializePrinter()`，再追加打印内容，最后调用 `writeData()` 写入蓝牙。第一版必须支持文档列出的 ESC 方法：`escInitializePrinter`、`escJustification`、`escSetCharcterSize`、`escTurnEmphasizedMode`、`escCutPaper`、`escNewLine`、`addPrintAndFeedLines`、`escText`、`escTwoText58`、`escThreeText58`、`escFourText58`、`escQRCode`、`escImage`、`escStringCommand`、`escBytesCommand`。
- 官方文档已核对：UTS 插件结构使用 `utssdk/interface.uts`、`utssdk/unierror.uts`、`utssdk/app-android`、`utssdk/app-ios`；Android 需要原生权限配置；iOS 需要 Info.plist 蓝牙隐私说明。

## File Structure

- Create: `src/uni_modules/yuntu-printer-uts/package.json`  
  插件市场元信息和平台声明。
- Create: `src/uni_modules/yuntu-printer-uts/README.md`  
  插件 API、权限、真机调试步骤。
- Create: `src/uni_modules/yuntu-printer-uts/changelog.md`  
  初始版本说明。
- Create: `src/uni_modules/yuntu-printer-uts/utssdk/interface.uts`  
  统一类型和方法签名。
- Create: `src/uni_modules/yuntu-printer-uts/utssdk/unierror.uts`  
  稳定错误码。
- Create: `src/uni_modules/yuntu-printer-uts/utssdk/common/esc.uts`  
  UTS ESC/POS 命令缓冲构建器，覆盖 GPrinter ESC 文档方法。
- Create: `src/uni_modules/yuntu-printer-uts/utssdk/common/chunk.uts`  
  蓝牙写入分包工具。
- Create: `src/uni_modules/yuntu-printer-uts/utssdk/app-android/index.uts`  
  Android BLE 扫描、连接、写入、断开。
- Create: `src/uni_modules/yuntu-printer-uts/utssdk/app-android/AndroidManifest.xml`  
  Android 蓝牙和定位权限。
- Create: `src/uni_modules/yuntu-printer-uts/utssdk/app-ios/index.uts`  
  iOS CoreBluetooth 扫描、连接、写入、断开。
- Create: `src/uni_modules/yuntu-printer-uts/utssdk/app-ios/Info.plist`  
  iOS 蓝牙隐私说明。
- Create: `src/utils/printerEsc.ts`  
  页面侧可测试的 ESC/POS 命令缓冲构建器，作为 UTS 侧实现的源行为规范。
- Create: `src/utils/printerEsc.test.ts`  
  ESC/POS 命令字节测试。
- Create: `src/composables/usePrinter.ts`  
  Vue 页面状态封装。
- Modify: `src/pages/printer/index.vue`  
  接入插件 UI。
- Modify: `package.json`  
  增加 Vitest 测试脚本和依赖。

## API Contract

The plugin exports these functions from `src/uni_modules/yuntu-printer-uts`:

```ts
scanBlue(callback: (device: PrinterDevice) => void): void
stopScanBlue(): void
connectBlue(deviceId: string): void
disconnect(): void
writeData(callback?: (info: WriteDataResult) => void): void
onBlueStateChange(callback: (on: boolean) => void): void
onConnectStateChange(callback: (payload: ConnectStatePayload) => void): void
onDataReceive(callback: (data: number[]) => void): void
clearCommandBuffer(): void
escInitializePrinter(): void
escJustification(position: 'left' | 'center' | 'right'): void
escSetCharcterSize(size: 1 | 2): void
escTurnEmphasizedMode(on: boolean): void
escCutPaper(): void
escNewLine(): void
addPrintAndFeedLines(lines: number): void
escText(text: string): void
escTwoText58(payload: TwoColumnText): string
escThreeText58(payload: ThreeColumnText): string
escFourText58(payload: FourColumnText): string
escQRCode(payload: EscQRCodeParam): void
escImage(payload: EscImageParam): void
escStringCommand(command: string): void
escBytesCommand(command: number[]): void
scanPrinters(options: ScanPrintersOptions): void
stopScanPrinters(): void
connectPrinter(options: ConnectPrinterOptions): void
disconnectPrinter(options: DisconnectPrinterOptions): void
getConnectedPrinter(options: GetConnectedPrinterOptions): void
printText(options: PrintTextOptions): void
printEsc(options: PrintEscOptions): void
```

Error codes:

```ts
1001 BLUETOOTH_UNAVAILABLE
1002 PERMISSION_DENIED
1003 SCAN_FAILED
1004 DEVICE_NOT_FOUND
1005 CONNECT_FAILED
1006 SERVICE_NOT_FOUND
1007 CHARACTERISTIC_NOT_FOUND
1008 NOT_CONNECTED
1009 WRITE_FAILED
1010 INVALID_PAYLOAD
1011 UNSUPPORTED_PLATFORM
```

Default BLE discovery:

```ts
serviceUUIDs: []
writeCharacteristicUUIDs: [
  '0000ff02-0000-1000-8000-00805f9b34fb',
  '0000ff01-0000-1000-8000-00805f9b34fb',
  '49535343-8841-43f4-a8d4-ecbe34729bb3'
]
chunkSize: 20
```

The GPrinter-compatible APIs are the primary low-level API. The semantic APIs call into the same implementation:

```ts
scanPrinters -> scanBlue
stopScanPrinters -> stopScanBlue
connectPrinter -> connectBlue
disconnectPrinter -> disconnect
printEsc -> clearCommandBuffer + escBytesCommand + writeData
printText -> clearCommandBuffer + escInitializePrinter + ESC builder methods + writeData
```

---

### Task 1: Add Test Harness For GPrinter ESC/POS Builder

**Files:**
- Modify: `package.json`
- Create: `src/utils/printerEsc.ts`
- Create: `src/utils/printerEsc.test.ts`

- [ ] **Step 1: Add Vitest dev dependency and scripts**

Edit `package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "vitest": "^2.1.9"
  }
}
```

Keep every existing script and dependency; only add `test`, `test:watch`, and `vitest`.

- [ ] **Step 2: Write failing ESC/POS tests from GPrinter docs**

Create `src/utils/printerEsc.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  PrinterEscBuilder,
  buildReceipt,
  dotFromMm,
  escFourText58,
  escThreeText58,
  escTwoText58,
} from './printerEsc'

describe('printerEsc', () => {
  it('converts mm to dots using GPrinter document dpi rules', () => {
    expect(dotFromMm(10, 200)).toBe(80)
    expect(dotFromMm(10, 300)).toBe(120)
  })

  it('builds control commands in the documented order', () => {
    const builder = new PrinterEscBuilder()
    builder.escInitializePrinter()
    builder.escJustification('center')
    builder.escSetCharcterSize(2)
    builder.escTurnEmphasizedMode(true)
    builder.escText('WOT')
    builder.escNewLine()
    builder.addPrintAndFeedLines(3)
    builder.escCutPaper()

    expect(builder.toBytes()).toEqual([
      0x1B, 0x40,
      0x1B, 0x61, 0x01,
      0x1D, 0x21, 0x11,
      0x1B, 0x45, 0x01,
      0x57, 0x4F, 0x54,
      0x0A,
      0x1B, 0x64, 0x03,
      0x1D, 0x56, 0x42, 0x00,
    ])
  })

  it('supports raw string and raw byte commands', () => {
    const builder = new PrinterEscBuilder()
    builder.escStringCommand('ABC')
    builder.escBytesCommand([0x01, 0x02, 300, -1])

    expect(builder.toBytes()).toEqual([0x41, 0x42, 0x43, 0x01, 0x02, 0xFF, 0x00])
  })

  it('creates 58mm two column helper text', () => {
    expect(escTwoText58({ left: '合计:', right: '1314.00' })).toBe('合计:                         1314.00')
  })

  it('creates 58mm three and four column helper text', () => {
    expect(escThreeText58({ left: '北京烤鸭', middle: '1', right: '99.99' })).toBe('北京烤鸭                 1     99.99')
    expect(escFourText58({ one: 'one', two: 'two', three: 'three', four: 'four' })).toBe('one       two       three     four')
  })

  it('builds QR code commands', () => {
    const builder = new PrinterEscBuilder()
    builder.escQRCode({ content: 'www.baidu.com', size: 5 })

    expect(builder.toBytes()).toEqual([
      0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, 0x05,
      0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x30,
      0x1D, 0x28, 0x6B, 0x11, 0x00, 0x31, 0x50, 0x30,
      0x77, 0x77, 0x77, 0x2E, 0x62, 0x61, 0x69, 0x64, 0x75, 0x2E, 0x63, 0x6F, 0x6D,
      0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30,
    ])
  })

  it('builds a complete receipt payload', () => {
    expect(buildReceipt({
      title: 'WOT',
      lines: ['Printer Plugin', 'OK'],
      feed: 2,
      cut: true,
    })).toEqual([
      0x1B, 0x40,
      0x1B, 0x61, 0x01,
      0x57, 0x4F, 0x54,
      0x0A,
      0x1B, 0x61, 0x00,
      0x50, 0x72, 0x69, 0x6E, 0x74, 0x65, 0x72, 0x20, 0x50, 0x6C, 0x75, 0x67, 0x69, 0x6E,
      0x0A,
      0x4F, 0x4B,
      0x0A,
      0x1B, 0x64, 0x02,
      0x1D, 0x56, 0x42, 0x00,
    ])
  })
})
```

- [ ] **Step 3: Run tests and verify they fail**

Run:

```bash
pnpm test src/utils/printerEsc.test.ts
```

Expected: FAIL because `src/utils/printerEsc.ts` does not exist.

- [ ] **Step 4: Implement ESC/POS builder**

Create `src/utils/printerEsc.ts`:

```ts
export type Dpi = 200 | 300
export type Position = 'left' | 'center' | 'right'

export type ReceiptPayload = {
  title: string
  lines: string[]
  feed?: number
  cut?: boolean
}

export type TwoColumnText = {
  left: string
  right: string
}

export type ThreeColumnText = {
  left: string
  middle: string
  right: string
}

export type FourColumnText = {
  one: string
  two: string
  three: string
  four: string
}

export type EscQRCodeParam = {
  content: string
  size: number
}

export type EscImageParam = {
  base64Str: string
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.trunc(value)))
}

function encodeAscii(value: string): number[] {
  return Array.from(value).map((char) => {
    const code = char.charCodeAt(0)
    return code <= 0x7F ? code : 0x3F
  })
}

function padColumns(values: string[], widths: number[]): string {
  return values.map((value, index) => value.padEnd(widths[index], ' ')).join('').trimEnd()
}

export function dotFromMm(mm: number, dpi: Dpi): number {
  return Math.trunc(mm * (dpi === 200 ? 8 : 12))
}

export function escTwoText58(payload: TwoColumnText): string {
  return `${payload.left}${payload.right.padStart(Math.max(1, 32 - payload.left.length), ' ')}`
}

export function escThreeText58(payload: ThreeColumnText): string {
  return padColumns([payload.left, payload.middle, payload.right], [22, 6, 0])
}

export function escFourText58(payload: FourColumnText): string {
  return padColumns([payload.one, payload.two, payload.three, payload.four], [10, 10, 10, 0])
}

export class PrinterEscBuilder {
  private bytes: number[] = []

  clearCommandBuffer() {
    this.bytes = []
  }

  escInitializePrinter() {
    this.bytes.push(0x1B, 0x40)
  }

  escJustification(position: Position) {
    const value = position === 'center' ? 1 : position === 'right' ? 2 : 0
    this.bytes.push(0x1B, 0x61, value)
  }

  escSetCharcterSize(size: 1 | 2) {
    this.bytes.push(0x1D, 0x21, size === 2 ? 0x11 : 0x00)
  }

  escTurnEmphasizedMode(on: boolean) {
    this.bytes.push(0x1B, 0x45, on ? 1 : 0)
  }

  escCutPaper() {
    this.bytes.push(0x1D, 0x56, 0x42, 0x00)
  }

  escNewLine() {
    this.bytes.push(0x0A)
  }

  addPrintAndFeedLines(lines: number) {
    this.bytes.push(0x1B, 0x64, clampByte(lines))
  }

  escText(text: string) {
    this.bytes.push(...encodeAscii(text))
  }

  escQRCode(payload: EscQRCodeParam) {
    const content = encodeAscii(payload.content)
    const length = content.length + 3
    this.bytes.push(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, clampByte(payload.size))
    this.bytes.push(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x30)
    this.bytes.push(0x1D, 0x28, 0x6B, length & 0xFF, (length >> 8) & 0xFF, 0x31, 0x50, 0x30, ...content)
    this.bytes.push(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30)
  }

  escImage(_payload: EscImageParam) {
    throw new Error('escImage requires platform image decoding and is implemented in UTS.')
  }

  escStringCommand(command: string) {
    this.bytes.push(...encodeAscii(command))
  }

  escBytesCommand(command: number[]) {
    this.bytes.push(...command.map(clampByte))
  }

  toBytes(): number[] {
    return [...this.bytes]
  }
}

export function buildReceipt(payload: ReceiptPayload): number[] {
  const builder = new PrinterEscBuilder()
  builder.escInitializePrinter()
  builder.escJustification('center')
  builder.escText(payload.title)
  builder.escNewLine()
  builder.escJustification('left')

  payload.lines.forEach((line) => {
    builder.escText(line)
    builder.escNewLine()
  })

  builder.addPrintAndFeedLines(payload.feed ?? 3)

  if (payload.cut !== false) {
    builder.escCutPaper()
  }

  return builder.toBytes()
}
```

- [ ] **Step 5: Run tests and verify they pass**

Run:

```bash
pnpm test src/utils/printerEsc.test.ts
```

Expected: PASS, 7 tests.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml src/utils/printerEsc.ts src/utils/printerEsc.test.ts
git commit -m "test: add gprinter esc builder coverage"
```

---

### Task 2: Create UTS Plugin Package Skeleton

**Files:**
- Create: `src/uni_modules/yuntu-printer-uts/package.json`
- Create: `src/uni_modules/yuntu-printer-uts/README.md`
- Create: `src/uni_modules/yuntu-printer-uts/changelog.md`

- [ ] **Step 1: Create plugin package manifest**

Create `src/uni_modules/yuntu-printer-uts/package.json`:

```json
{
  "id": "yuntu-printer-uts",
  "displayName": "Yuntu Printer UTS",
  "version": "0.1.0",
  "description": "Android and iOS BLE printer plugin for uni-app using ESC/POS commands.",
  "keywords": [
    "uts",
    "bluetooth",
    "printer",
    "esc-pos",
    "ble"
  ],
  "repository": "",
  "engines": {
    "HBuilderX": "^4.0.0"
  },
  "dcloudext": {
    "type": "uts",
    "sale": {
      "regular": {
        "price": "0.00"
      },
      "sourcecode": {
        "price": "0.00"
      }
    },
    "contact": {
      "qq": ""
    },
    "declaration": {
      "ads": "无",
      "data": "插件会使用蓝牙扫描、蓝牙连接和蓝牙写入能力，不采集用户账号信息。",
      "permissions": "Android: BLUETOOTH, BLUETOOTH_ADMIN, BLUETOOTH_SCAN, BLUETOOTH_CONNECT, ACCESS_FINE_LOCATION; iOS: Bluetooth Always Usage Description."
    },
    "npmurl": ""
  },
  "uni_modules": {
    "dependencies": [],
    "encrypt": [],
    "platforms": {
      "cloud": {
        "tcb": "n",
        "aliyun": "n"
      },
      "client": {
        "App": {
          "app-vue": "y",
          "app-nvue": "n"
        },
        "H5-mobile": {
          "Safari": "n",
          "Android Browser": "n",
          "微信浏览器(Android)": "n",
          "QQ浏览器(Android)": "n"
        },
        "H5-pc": {
          "Chrome": "n",
          "IE": "n",
          "Edge": "n",
          "Firefox": "n",
          "Safari": "n"
        },
        "小程序": {
          "微信": "n",
          "阿里": "n",
          "百度": "n",
          "字节跳动": "n",
          "QQ": "n"
        },
        "快应用": {
          "华为": "n",
          "联盟": "n"
        },
        "Vue": {
          "vue2": "n",
          "vue3": "y"
        }
      }
    }
  }
}
```

- [ ] **Step 2: Create README**

Create `src/uni_modules/yuntu-printer-uts/README.md`:

```md
# Yuntu Printer UTS

Android and iOS BLE printer plugin for uni-app.

## Features

- Scan BLE printers.
- Connect by device id.
- Write raw ESC/POS bytes.
- Print text receipt payloads through ESC/POS.
- Disconnect and query connected printer.

## Platform

- Android App: BLE through Android Bluetooth APIs.
- iOS App: BLE through CoreBluetooth.
- H5 and mini programs are not supported by this UTS plugin.

## Permissions

Android requires Bluetooth scan/connect permissions and location permission for older Android BLE scanning behavior.

iOS requires `NSBluetoothAlwaysUsageDescription`.

## Basic Usage

```ts
import {
  connectPrinter,
  disconnectPrinter,
  printText,
  scanPrinters,
  stopScanPrinters,
} from '@/uni_modules/yuntu-printer-uts'

scanPrinters({
  timeout: 10000,
  success(res) {
    console.log(res.devices)
  },
  fail(err) {
    console.error(err)
  },
})

connectPrinter({
  deviceId: 'printer-device-id',
  success() {
    printText({
      title: 'WOT',
      lines: ['Printer Plugin', 'OK'],
      feed: 3,
      cut: true,
    })
  },
})

disconnectPrinter({})
stopScanPrinters()
```

## Debugging

Use a custom base for iOS and Android after adding this plugin, because native Bluetooth code must be compiled into the App runtime.
```

- [ ] **Step 3: Create changelog**

Create `src/uni_modules/yuntu-printer-uts/changelog.md`:

```md
## 0.1.0

- Initial Android and iOS BLE printer plugin plan.
- Adds unified UTS API for scanning, connecting, printing ESC/POS payloads, and disconnecting.
```

- [ ] **Step 4: Verify files are discoverable**

Run:

```bash
rg "yuntu-printer-uts|Yuntu Printer UTS" src/uni_modules/yuntu-printer-uts
```

Expected: output includes `package.json`, `README.md`, and `changelog.md`.

- [ ] **Step 5: Commit**

```bash
git add src/uni_modules/yuntu-printer-uts/package.json src/uni_modules/yuntu-printer-uts/README.md src/uni_modules/yuntu-printer-uts/changelog.md
git commit -m "feat: scaffold printer uts plugin"
```

---

### Task 3: Define UTS Public API And Errors

**Files:**
- Create: `src/uni_modules/yuntu-printer-uts/utssdk/interface.uts`
- Create: `src/uni_modules/yuntu-printer-uts/utssdk/unierror.uts`

- [ ] **Step 1: Write the UTS interface**

Create `src/uni_modules/yuntu-printer-uts/utssdk/interface.uts`:

```ts
export type ConnectState = 'connectSuccess' | 'disconnect' | 'connectFail'
export type EscJustification = 'left' | 'center' | 'right'

export type PrinterDevice = {
  deviceId: string
  name: string
  rssi: number
  serviceUUIDs: string[]
}

export type PrinterConnection = {
  deviceId: string
  name: string
  serviceUUID: string
  writeCharacteristicUUID: string
}

export type PrinterError = {
  errCode: number
  errMsg: string
}

export type WriteDataResult = {
  byteLength: number
  chunkCount: number
}

export type ConnectStatePayload = {
  state: ConnectState
  deviceId?: string
  errMsg?: string
}

export type BlueStateCallback = (on: boolean) => void
export type ConnectStateCallback = (payload: ConnectStatePayload) => void
export type DataReceiveCallback = (data: number[]) => void

export type TwoColumnText = {
  left: string
  right: string
}

export type ThreeColumnText = {
  left: string
  middle: string
  right: string
}

export type FourColumnText = {
  one: string
  two: string
  three: string
  four: string
}

export type EscQRCodeParam = {
  content: string
  size: number
}

export type EscImageParam = {
  base64Str: string
}

export type ScanPrintersSuccess = {
  devices: PrinterDevice[]
}

export type ScanPrintersOptions = {
  timeout?: number
  serviceUUIDs?: string[]
  success?: (res: ScanPrintersSuccess) => void
  fail?: (err: PrinterError) => void
  complete?: () => void
}

export type StopScanPrintersOptions = {
  success?: () => void
  fail?: (err: PrinterError) => void
  complete?: () => void
}

export type ConnectPrinterOptions = {
  deviceId: string
  serviceUUIDs?: string[]
  writeCharacteristicUUIDs?: string[]
  timeout?: number
  success?: (res: PrinterConnection) => void
  fail?: (err: PrinterError) => void
  complete?: () => void
}

export type DisconnectPrinterOptions = {
  success?: () => void
  fail?: (err: PrinterError) => void
  complete?: () => void
}

export type GetConnectedPrinterOptions = {
  success?: (res: PrinterConnection | null) => void
  fail?: (err: PrinterError) => void
  complete?: () => void
}

export type PrintEscOptions = {
  bytes: number[]
  chunkSize?: number
  success?: () => void
  fail?: (err: PrinterError) => void
  complete?: () => void
}

export type PrintTextOptions = {
  title: string
  lines: string[]
  feed?: number
  cut?: boolean
  chunkSize?: number
  success?: () => void
  fail?: (err: PrinterError) => void
  complete?: () => void
}

export type ScanBlue = (callback: (device: PrinterDevice) => void) => void
export type StopScanBlue = () => void
export type ConnectBlue = (deviceId: string) => void
export type Disconnect = () => void
export type WriteData = (callback?: (info: WriteDataResult) => void) => void
export type OnBlueStateChange = (callback: BlueStateCallback) => void
export type OnConnectStateChange = (callback: ConnectStateCallback) => void
export type OnDataReceive = (callback: DataReceiveCallback) => void
export type ClearCommandBuffer = () => void
export type EscInitializePrinter = () => void
export type EscJustificationCommand = (position: EscJustification) => void
export type EscSetCharcterSize = (size: 1 | 2) => void
export type EscTurnEmphasizedMode = (on: boolean) => void
export type EscCutPaper = () => void
export type EscNewLine = () => void
export type AddPrintAndFeedLines = (lines: number) => void
export type EscText = (text: string) => void
export type EscTwoText58 = (payload: TwoColumnText) => string
export type EscThreeText58 = (payload: ThreeColumnText) => string
export type EscFourText58 = (payload: FourColumnText) => string
export type EscQRCode = (payload: EscQRCodeParam) => void
export type EscImage = (payload: EscImageParam) => void
export type EscStringCommand = (command: string) => void
export type EscBytesCommand = (command: number[]) => void
export type ScanPrinters = (options: ScanPrintersOptions) => void
export type StopScanPrinters = (options?: StopScanPrintersOptions) => void
export type ConnectPrinter = (options: ConnectPrinterOptions) => void
export type DisconnectPrinter = (options?: DisconnectPrinterOptions) => void
export type GetConnectedPrinter = (options: GetConnectedPrinterOptions) => void
export type PrintEsc = (options: PrintEscOptions) => void
export type PrintText = (options: PrintTextOptions) => void
```

- [ ] **Step 2: Write stable error helpers**

Create `src/uni_modules/yuntu-printer-uts/utssdk/unierror.uts`:

```ts
import type { PrinterError } from './interface.uts'

export const PRINTER_ERROR_BLUETOOTH_UNAVAILABLE = 1001
export const PRINTER_ERROR_PERMISSION_DENIED = 1002
export const PRINTER_ERROR_SCAN_FAILED = 1003
export const PRINTER_ERROR_DEVICE_NOT_FOUND = 1004
export const PRINTER_ERROR_CONNECT_FAILED = 1005
export const PRINTER_ERROR_SERVICE_NOT_FOUND = 1006
export const PRINTER_ERROR_CHARACTERISTIC_NOT_FOUND = 1007
export const PRINTER_ERROR_NOT_CONNECTED = 1008
export const PRINTER_ERROR_WRITE_FAILED = 1009
export const PRINTER_ERROR_INVALID_PAYLOAD = 1010
export const PRINTER_ERROR_UNSUPPORTED_PLATFORM = 1011

export function createPrinterError(errCode: number, detail: string): PrinterError {
  return {
    errCode,
    errMsg: `yuntu-printer-uts: ${detail}`,
  }
}
```

- [ ] **Step 3: Run type check**

Run:

```bash
pnpm type-check
```

Expected: PASS or no new errors referencing `yuntu-printer-uts`.

- [ ] **Step 4: Commit**

```bash
git add src/uni_modules/yuntu-printer-uts/utssdk/interface.uts src/uni_modules/yuntu-printer-uts/utssdk/unierror.uts
git commit -m "feat: define printer uts api"
```

---

### Task 4: Add Shared UTS ESC/POS And Chunk Utilities

**Files:**
- Create: `src/uni_modules/yuntu-printer-uts/utssdk/common/esc.uts`
- Create: `src/uni_modules/yuntu-printer-uts/utssdk/common/chunk.uts`

- [ ] **Step 1: Write UTS ESC/POS encoder**

Create `src/uni_modules/yuntu-printer-uts/utssdk/common/esc.uts`:

```ts
import type { EscImageParam, EscJustification, EscQRCodeParam, FourColumnText, ThreeColumnText, TwoColumnText } from '../interface.uts'

export type ReceiptPayload = {
  title: string
  lines: string[]
  feed?: number
  cut?: boolean
}

function clampByte(value: number): number {
  const rounded = Math.trunc(value)
  return Math.max(0, Math.min(255, rounded))
}

function encodeAscii(value: string): number[] {
  const bytes: number[] = []
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index)
    bytes.push(code <= 0x7F ? code : 0x3F)
  }
  return bytes
}

function padColumns(values: string[], widths: number[]): string {
  let result = ''
  values.forEach((value: string, index: number) => {
    const width = widths[index]
    if (width <= 0) {
      result += value
    }
    else {
      result += value.padEnd(width, ' ')
    }
  })
  return result.trimEnd()
}

export function dotFromMm(mm: number, dpi: 200 | 300): number {
  return Math.trunc(mm * (dpi == 200 ? 8 : 12))
}

export function escTwoText58(payload: TwoColumnText): string {
  return `${payload.left}${payload.right.padStart(Math.max(1, 32 - payload.left.length), ' ')}`
}

export function escThreeText58(payload: ThreeColumnText): string {
  return padColumns([payload.left, payload.middle, payload.right], [22, 6, 0])
}

export function escFourText58(payload: FourColumnText): string {
  return padColumns([payload.one, payload.two, payload.three, payload.four], [10, 10, 10, 0])
}

export class PrinterEscBuilder {
  private bytes: number[] = []

  clearCommandBuffer() {
    this.bytes = []
  }

  escInitializePrinter() {
    this.bytes.push(0x1B, 0x40)
  }

  escJustification(position: EscJustification) {
    const value = position == 'center' ? 1 : position == 'right' ? 2 : 0
    this.bytes.push(0x1B, 0x61, value)
  }

  escSetCharcterSize(size: 1 | 2) {
    this.bytes.push(0x1D, 0x21, size == 2 ? 0x11 : 0x00)
  }

  escTurnEmphasizedMode(on: boolean) {
    this.bytes.push(0x1B, 0x45, on ? 1 : 0)
  }

  escCutPaper() {
    this.bytes.push(0x1D, 0x56, 0x42, 0x00)
  }

  escNewLine() {
    this.bytes.push(0x0A)
  }

  addPrintAndFeedLines(lines: number) {
    this.bytes.push(0x1B, 0x64, clampByte(lines))
  }

  escText(text: string) {
    this.bytes.push(...encodeAscii(text))
  }

  escQRCode(payload: EscQRCodeParam) {
    const content = encodeAscii(payload.content)
    const length = content.length + 3
    this.bytes.push(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, clampByte(payload.size))
    this.bytes.push(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x30)
    this.bytes.push(0x1D, 0x28, 0x6B, length & 0xFF, (length >> 8) & 0xFF, 0x31, 0x50, 0x30, ...content)
    this.bytes.push(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30)
  }

  escImage(_payload: EscImageParam) {
    throw new Error('escImage requires platform image decoding before raster command generation.')
  }

  escStringCommand(command: string) {
    this.bytes.push(...encodeAscii(command))
  }

  escBytesCommand(command: number[]) {
    this.bytes.push(...command.map((value: number) => clampByte(value)))
  }

  toBytes(): number[] {
    return [...this.bytes]
  }
}

export function buildReceipt(payload: ReceiptPayload): number[] {
  const builder = new PrinterEscBuilder()
  builder.escInitializePrinter()
  builder.escJustification('center')
  builder.escText(payload.title)
  builder.escNewLine()
  builder.escJustification('left')

  payload.lines.forEach((line: string) => {
    builder.escText(line)
    builder.escNewLine()
  })

  builder.addPrintAndFeedLines(payload.feed ?? 3)

  if (payload.cut !== false) {
    builder.escCutPaper()
  }

  return builder.toBytes()
}
```

- [ ] **Step 2: Write chunk utility**

Create `src/uni_modules/yuntu-printer-uts/utssdk/common/chunk.uts`:

```ts
export function normalizeBytes(bytes: number[]): number[] {
  return bytes.map((value: number) => {
    const rounded = Math.trunc(value)
    return Math.max(0, Math.min(255, rounded))
  })
}

export function splitBytes(bytes: number[], chunkSize: number): number[][] {
  const safeChunkSize = Math.max(1, Math.min(512, Math.trunc(chunkSize)))
  const normalized = normalizeBytes(bytes)
  const chunks: number[][] = []

  for (let index = 0; index < normalized.length; index += safeChunkSize) {
    chunks.push(normalized.slice(index, index + safeChunkSize))
  }

  return chunks
}
```

- [ ] **Step 3: Mirror ESC tests in TypeScript stay green**

Run:

```bash
pnpm test src/utils/printerEsc.test.ts
```

Expected: PASS. This confirms the behavior UTS must mirror.

- [ ] **Step 4: Commit**

```bash
git add src/uni_modules/yuntu-printer-uts/utssdk/common/esc.uts src/uni_modules/yuntu-printer-uts/utssdk/common/chunk.uts
git commit -m "feat: add printer uts shared utilities"
```

---

### Task 5: Add Android Native Configuration

**Files:**
- Create: `src/uni_modules/yuntu-printer-uts/utssdk/app-android/AndroidManifest.xml`

- [ ] **Step 1: Add Android Bluetooth permissions**

Create `src/uni_modules/yuntu-printer-uts/utssdk/app-android/AndroidManifest.xml`:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
  <uses-permission android:name="android.permission.BLUETOOTH" android:maxSdkVersion="30" />
  <uses-permission android:name="android.permission.BLUETOOTH_ADMIN" android:maxSdkVersion="30" />
  <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" android:maxSdkVersion="30" />
  <uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
  <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />

  <uses-feature android:name="android.hardware.bluetooth_le" android:required="false" />
</manifest>
```

- [ ] **Step 2: Verify manifest contains every permission**

Run:

```bash
rg "BLUETOOTH|ACCESS_FINE_LOCATION|bluetooth_le" src/uni_modules/yuntu-printer-uts/utssdk/app-android/AndroidManifest.xml
```

Expected: output includes all five permissions and `android.hardware.bluetooth_le`.

- [ ] **Step 3: Commit**

```bash
git add src/uni_modules/yuntu-printer-uts/utssdk/app-android/AndroidManifest.xml
git commit -m "feat: add android printer permissions"
```

---

### Task 6: Implement Android BLE Printer Adapter

**Files:**
- Create: `src/uni_modules/yuntu-printer-uts/utssdk/app-android/index.uts`

- [ ] **Step 1: Create Android implementation**

Create `src/uni_modules/yuntu-printer-uts/utssdk/app-android/index.uts` with this structure and keep every GPrinter-compatible export and semantic wrapper name identical to `interface.uts`:

```ts
import { BluetoothAdapter, BluetoothDevice, BluetoothGatt, BluetoothGattCallback, BluetoothGattCharacteristic, BluetoothGattService, BluetoothManager, BluetoothProfile } from 'android.bluetooth'
import { ScanCallback, ScanResult, BluetoothLeScanner } from 'android.bluetooth.le'
import { Build } from 'android.os'
import { Context } from 'android.content'
import { PackageManager } from 'android.content.pm'
import { UUID } from 'java.util'
import { getAppContext, requestSystemPermission } from 'io.dcloud.uts.android'
import type { AddPrintAndFeedLines, ClearCommandBuffer, ConnectBlue, ConnectPrinter, ConnectPrinterOptions, ConnectStateCallback, DataReceiveCallback, Disconnect, DisconnectPrinter, DisconnectPrinterOptions, EscBytesCommand, EscCutPaper, EscImage, EscInitializePrinter, EscJustificationCommand, EscNewLine, EscQRCode, EscSetCharcterSize, EscStringCommand, EscText, EscThreeText58, EscTurnEmphasizedMode, EscTwoText58, EscFourText58, GetConnectedPrinter, OnBlueStateChange, OnConnectStateChange, OnDataReceive, PrintEsc, PrintEscOptions, PrintText, PrinterConnection, PrinterDevice, ScanBlue, ScanPrinters, ScanPrintersOptions, StopScanBlue, StopScanPrinters, StopScanPrintersOptions, WriteData, BlueStateCallback } from '../interface.uts'
import { buildReceipt, escFourText58 as buildFourText58, escThreeText58 as buildThreeText58, escTwoText58 as buildTwoText58, PrinterEscBuilder } from '../common/esc.uts'
import { splitBytes } from '../common/chunk.uts'
import { createPrinterError, PRINTER_ERROR_BLUETOOTH_UNAVAILABLE, PRINTER_ERROR_CHARACTERISTIC_NOT_FOUND, PRINTER_ERROR_CONNECT_FAILED, PRINTER_ERROR_DEVICE_NOT_FOUND, PRINTER_ERROR_INVALID_PAYLOAD, PRINTER_ERROR_NOT_CONNECTED, PRINTER_ERROR_PERMISSION_DENIED, PRINTER_ERROR_SCAN_FAILED, PRINTER_ERROR_SERVICE_NOT_FOUND, PRINTER_ERROR_WRITE_FAILED } from '../unierror.uts'

const DEFAULT_WRITE_CHARACTERISTIC_UUIDS = [
  '0000ff02-0000-1000-8000-00805f9b34fb',
  '0000ff01-0000-1000-8000-00805f9b34fb',
  '49535343-8841-43f4-a8d4-ecbe34729bb3',
]

let bluetoothAdapter: BluetoothAdapter | null = null
let scanner: BluetoothLeScanner | null = null
let scanCallback: ScanCallback | null = null
let scannedDevices: PrinterDevice[] = []
let connectedGatt: BluetoothGatt | null = null
let writeCharacteristic: BluetoothGattCharacteristic | null = null
let connectedPrinter: PrinterConnection | null = null
let blueStateCallback: BlueStateCallback | null = null
let connectStateCallback: ConnectStateCallback | null = null
let dataReceiveCallback: DataReceiveCallback | null = null
const commandBuilder = new PrinterEscBuilder()

function complete(options: { complete?: () => void }) {
  options.complete?.()
}

function getAdapter(): BluetoothAdapter | null {
  if (bluetoothAdapter != null) {
    return bluetoothAdapter
  }
  const context = getAppContext()
  const manager = context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
  bluetoothAdapter = manager.getAdapter()
  return bluetoothAdapter
}

function hasBluetoothPermission(): boolean {
  const context = getAppContext()
  if (Build.VERSION.SDK_INT >= 31) {
    return context.checkSelfPermission('android.permission.BLUETOOTH_SCAN') == PackageManager.PERMISSION_GRANTED &&
      context.checkSelfPermission('android.permission.BLUETOOTH_CONNECT') == PackageManager.PERMISSION_GRANTED
  }
  return context.checkSelfPermission('android.permission.ACCESS_FINE_LOCATION') == PackageManager.PERMISSION_GRANTED
}

function requestBluetoothPermission(success: () => void, fail: () => void) {
  const permissions = Build.VERSION.SDK_INT >= 31
    ? ['android.permission.BLUETOOTH_SCAN', 'android.permission.BLUETOOTH_CONNECT']
    : ['android.permission.ACCESS_FINE_LOCATION']

  requestSystemPermission(permissions, success, fail)
}

function upsertDevice(device: PrinterDevice) {
  const index = scannedDevices.findIndex((item: PrinterDevice) => item.deviceId == device.deviceId)
  if (index >= 0) {
    scannedDevices[index] = device
  }
  else {
    scannedDevices.push(device)
  }
}

function emitBlueState(on: boolean) {
  blueStateCallback?.(on)
}

function emitConnectState(state: 'connectSuccess' | 'disconnect' | 'connectFail', deviceId?: string, errMsg?: string) {
  connectStateCallback?.({ state, deviceId, errMsg })
}

function emitDataReceive(data: number[]) {
  dataReceiveCallback?.(data)
}

export const scanPrinters: ScanPrinters = function (options: ScanPrintersOptions) {
  const adapter = getAdapter()
  if (adapter == null || !adapter.isEnabled()) {
    options.fail?.(createPrinterError(PRINTER_ERROR_BLUETOOTH_UNAVAILABLE, 'Bluetooth is unavailable or disabled.'))
    complete(options)
    return
  }

  const startScan = () => {
    scannedDevices = []
    scanner = adapter.getBluetoothLeScanner()
    if (scanner == null) {
      options.fail?.(createPrinterError(PRINTER_ERROR_SCAN_FAILED, 'Bluetooth LE scanner is unavailable.'))
      complete(options)
      return
    }

    scanCallback = new ScanCallback({
      onScanResult(_callbackType: number, result: ScanResult) {
        const device: BluetoothDevice = result.getDevice()
        upsertDevice({
          deviceId: device.getAddress(),
          name: device.getName() ?? 'Unknown Printer',
          rssi: result.getRssi(),
          serviceUUIDs: [],
        })
        emitBlueState(true)
        options.success?.({ devices: scannedDevices })
      },
      onScanFailed(errorCode: number) {
        options.fail?.(createPrinterError(PRINTER_ERROR_SCAN_FAILED, `Scan failed with code ${errorCode}.`))
        complete(options)
      },
    })

    scanner!.startScan(scanCallback)
    setTimeout(() => {
      stopScanPrinters({
        success: () => options.success?.({ devices: scannedDevices }),
        fail: options.fail,
        complete: options.complete,
      })
    }, options.timeout ?? 10000)
  }

  if (hasBluetoothPermission()) {
    startScan()
    return
  }

  requestBluetoothPermission(startScan, () => {
    options.fail?.(createPrinterError(PRINTER_ERROR_PERMISSION_DENIED, 'Bluetooth permission was denied.'))
    complete(options)
  })
}

export const stopScanPrinters: StopScanPrinters = function (options?: StopScanPrintersOptions) {
  if (scanner != null && scanCallback != null) {
    scanner!.stopScan(scanCallback)
  }
  scanner = null
  scanCallback = null
  options?.success?.()
  options?.complete?.()
}

export const connectPrinter: ConnectPrinter = function (options: ConnectPrinterOptions) {
  const adapter = getAdapter()
  if (adapter == null || !adapter.isEnabled()) {
    options.fail?.(createPrinterError(PRINTER_ERROR_BLUETOOTH_UNAVAILABLE, 'Bluetooth is unavailable or disabled.'))
    complete(options)
    return
  }

  const device = adapter.getRemoteDevice(options.deviceId)
  if (device == null) {
    options.fail?.(createPrinterError(PRINTER_ERROR_DEVICE_NOT_FOUND, `Device ${options.deviceId} was not found.`))
    complete(options)
    return
  }

  const preferredCharacteristicUUIDs = options.writeCharacteristicUUIDs ?? DEFAULT_WRITE_CHARACTERISTIC_UUIDS
  const callback = new BluetoothGattCallback({
    onConnectionStateChange(gatt: BluetoothGatt, status: number, newState: number) {
      if (status != BluetoothGatt.GATT_SUCCESS) {
        options.fail?.(createPrinterError(PRINTER_ERROR_CONNECT_FAILED, `Connection failed with status ${status}.`))
        complete(options)
        return
      }

      if (newState == BluetoothProfile.STATE_CONNECTED) {
        connectedGatt = gatt
        gatt.discoverServices()
      }
    },
    onServicesDiscovered(gatt: BluetoothGatt, status: number) {
      if (status != BluetoothGatt.GATT_SUCCESS) {
        options.fail?.(createPrinterError(PRINTER_ERROR_SERVICE_NOT_FOUND, `Service discovery failed with status ${status}.`))
        complete(options)
        return
      }

      const services = gatt.getServices()
      for (let serviceIndex = 0; serviceIndex < services.size(); serviceIndex += 1) {
        const service = services.get(serviceIndex) as BluetoothGattService
        for (let uuidIndex = 0; uuidIndex < preferredCharacteristicUUIDs.length; uuidIndex += 1) {
          const characteristic = service.getCharacteristic(UUID.fromString(preferredCharacteristicUUIDs[uuidIndex]))
          if (characteristic != null) {
            writeCharacteristic = characteristic
            connectedPrinter = {
              deviceId: options.deviceId,
              name: device.getName() ?? 'Unknown Printer',
              serviceUUID: service.getUuid().toString(),
              writeCharacteristicUUID: characteristic.getUuid().toString(),
            }
            emitConnectState('connectSuccess', options.deviceId)
            options.success?.(connectedPrinter!)
            complete(options)
            return
          }
        }
      }

      options.fail?.(createPrinterError(PRINTER_ERROR_CHARACTERISTIC_NOT_FOUND, 'No writable printer characteristic was found.'))
      emitConnectState('connectFail', options.deviceId, 'No writable printer characteristic was found.')
      complete(options)
    },
  })

  device.connectGatt(getAppContext(), false, callback)
}

export const disconnectPrinter: DisconnectPrinter = function (options?: DisconnectPrinterOptions) {
  connectedGatt?.disconnect()
  connectedGatt?.close()
  connectedGatt = null
  writeCharacteristic = null
  connectedPrinter = null
  emitConnectState('disconnect')
  options?.success?.()
  options?.complete?.()
}

export const getConnectedPrinter: GetConnectedPrinter = function (options) {
  options.success?.(connectedPrinter)
  options.complete?.()
}

function writeBytes(bytes: number[], chunkSize: number, success: () => void, fail: (message: string) => void) {
  if (connectedGatt == null || writeCharacteristic == null) {
    fail('Printer is not connected.')
    return
  }

  const chunks = splitBytes(bytes, chunkSize)
  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index]
    writeCharacteristic!.setValue(chunk.map((value: number) => value.toByte()).toTypedArray())
    const ok = connectedGatt!.writeCharacteristic(writeCharacteristic)
    if (!ok) {
      fail(`Failed to write chunk ${index + 1}.`)
      return
    }
    Thread.sleep(30)
  }
  success()
}

export const scanBlue: ScanBlue = function (callback: (device: PrinterDevice) => void) {
  scanPrinters({
    timeout: 10000,
    success(res) {
      const latest = res.devices[res.devices.length - 1]
      if (latest != null) {
        callback(latest)
      }
    },
  })
}

export const stopScanBlue: StopScanBlue = function () {
  stopScanPrinters()
}

export const connectBlue: ConnectBlue = function (deviceId: string) {
  connectPrinter({
    deviceId,
    fail(err) {
      emitConnectState('connectFail', deviceId, err.errMsg)
    },
  })
}

export const disconnect: Disconnect = function () {
  disconnectPrinter()
}

export const writeData: WriteData = function (callback?: (info: { byteLength: number, chunkCount: number }) => void) {
  const bytes = commandBuilder.toBytes()
  const chunks = splitBytes(bytes, 20)
  writeBytes(bytes, 20, () => {
    callback?.({ byteLength: bytes.length, chunkCount: chunks.length })
  }, (message: string) => {
    emitConnectState('connectFail', connectedPrinter?.deviceId, message)
  })
}

export const onBlueStateChange: OnBlueStateChange = function (callback: BlueStateCallback) {
  blueStateCallback = callback
}

export const onConnectStateChange: OnConnectStateChange = function (callback: ConnectStateCallback) {
  connectStateCallback = callback
}

export const onDataReceive: OnDataReceive = function (callback: DataReceiveCallback) {
  dataReceiveCallback = callback
}

export const clearCommandBuffer: ClearCommandBuffer = function () { commandBuilder.clearCommandBuffer() }
export const escInitializePrinter: EscInitializePrinter = function () { commandBuilder.escInitializePrinter() }
export const escJustification: EscJustificationCommand = function (position) { commandBuilder.escJustification(position) }
export const escSetCharcterSize: EscSetCharcterSize = function (size) { commandBuilder.escSetCharcterSize(size) }
export const escTurnEmphasizedMode: EscTurnEmphasizedMode = function (on) { commandBuilder.escTurnEmphasizedMode(on) }
export const escCutPaper: EscCutPaper = function () { commandBuilder.escCutPaper() }
export const escNewLine: EscNewLine = function () { commandBuilder.escNewLine() }
export const addPrintAndFeedLines: AddPrintAndFeedLines = function (lines) { commandBuilder.addPrintAndFeedLines(lines) }
export const escText: EscText = function (text) { commandBuilder.escText(text) }
export const escTwoText58: EscTwoText58 = function (payload) { return buildTwoText58(payload) }
export const escThreeText58: EscThreeText58 = function (payload) { return buildThreeText58(payload) }
export const escFourText58: EscFourText58 = function (payload) { return buildFourText58(payload) }
export const escQRCode: EscQRCode = function (payload) { commandBuilder.escQRCode(payload) }
export const escImage: EscImage = function (payload) { commandBuilder.escImage(payload) }
export const escStringCommand: EscStringCommand = function (command) { commandBuilder.escStringCommand(command) }
export const escBytesCommand: EscBytesCommand = function (command) { commandBuilder.escBytesCommand(command) }

export const printEsc: PrintEsc = function (options: PrintEscOptions) {
  if (options.bytes.length == 0) {
    options.fail?.(createPrinterError(PRINTER_ERROR_INVALID_PAYLOAD, 'ESC payload is empty.'))
    complete(options)
    return
  }

  writeBytes(options.bytes, options.chunkSize ?? 20, () => {
    options.success?.()
    complete(options)
  }, (message: string) => {
    const code = message == 'Printer is not connected.' ? PRINTER_ERROR_NOT_CONNECTED : PRINTER_ERROR_WRITE_FAILED
    options.fail?.(createPrinterError(code, message))
    complete(options)
  })
}

export const printText: PrintText = function (options: PrintTextOptions) {
  printEsc({
    bytes: buildReceipt(options),
    chunkSize: options.chunkSize,
    success: options.success,
    fail: options.fail,
    complete: options.complete,
  })
}
```

- [ ] **Step 2: Compile Android app**

Run:

```bash
pnpm build:app-android
```

Expected: PASS. If the UTS compiler reports Android import or callback syntax errors, fix only `src/uni_modules/yuntu-printer-uts/utssdk/app-android/index.uts` while preserving the public API from `interface.uts`.

- [ ] **Step 3: Commit**

```bash
git add src/uni_modules/yuntu-printer-uts/utssdk/app-android/index.uts
git commit -m "feat: implement android ble printer adapter"
```

---

### Task 7: Add iOS Native Configuration

**Files:**
- Create: `src/uni_modules/yuntu-printer-uts/utssdk/app-ios/Info.plist`

- [ ] **Step 1: Add iOS Bluetooth privacy strings**

Create `src/uni_modules/yuntu-printer-uts/utssdk/app-ios/Info.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>NSBluetoothAlwaysUsageDescription</key>
  <string>用于扫描并连接附近的蓝牙打印机。</string>
  <key>NSBluetoothPeripheralUsageDescription</key>
  <string>用于连接蓝牙打印机并发送打印数据。</string>
</dict>
</plist>
```

- [ ] **Step 2: Verify privacy strings**

Run:

```bash
rg "NSBluetooth" src/uni_modules/yuntu-printer-uts/utssdk/app-ios/Info.plist
```

Expected: output includes `NSBluetoothAlwaysUsageDescription` and `NSBluetoothPeripheralUsageDescription`.

- [ ] **Step 3: Commit**

```bash
git add src/uni_modules/yuntu-printer-uts/utssdk/app-ios/Info.plist
git commit -m "feat: add ios bluetooth privacy config"
```

---

### Task 8: Implement iOS BLE Printer Adapter

**Files:**
- Create: `src/uni_modules/yuntu-printer-uts/utssdk/app-ios/index.uts`

- [ ] **Step 1: Create iOS implementation**

Create `src/uni_modules/yuntu-printer-uts/utssdk/app-ios/index.uts` with the same GPrinter-compatible and semantic exported names as Android:

```ts
import { CBCentralManager, CBCentralManagerDelegate, CBCharacteristic, CBCharacteristicWriteType, CBManagerState, CBPeripheral, CBPeripheralDelegate, CBService, CBUUID } from 'CoreBluetooth'
import type { AddPrintAndFeedLines, BlueStateCallback, ClearCommandBuffer, ConnectBlue, ConnectPrinter, ConnectPrinterOptions, ConnectStateCallback, DataReceiveCallback, Disconnect, DisconnectPrinter, DisconnectPrinterOptions, EscBytesCommand, EscCutPaper, EscImage, EscInitializePrinter, EscJustificationCommand, EscNewLine, EscQRCode, EscSetCharcterSize, EscStringCommand, EscText, EscThreeText58, EscTurnEmphasizedMode, EscTwoText58, EscFourText58, GetConnectedPrinter, OnBlueStateChange, OnConnectStateChange, OnDataReceive, PrintEsc, PrintEscOptions, PrintText, PrinterConnection, PrinterDevice, ScanBlue, ScanPrinters, ScanPrintersOptions, StopScanBlue, StopScanPrinters, StopScanPrintersOptions, WriteData } from '../interface.uts'
import { buildReceipt, escFourText58 as buildFourText58, escThreeText58 as buildThreeText58, escTwoText58 as buildTwoText58, PrinterEscBuilder } from '../common/esc.uts'
import { splitBytes } from '../common/chunk.uts'
import { createPrinterError, PRINTER_ERROR_BLUETOOTH_UNAVAILABLE, PRINTER_ERROR_CHARACTERISTIC_NOT_FOUND, PRINTER_ERROR_CONNECT_FAILED, PRINTER_ERROR_DEVICE_NOT_FOUND, PRINTER_ERROR_INVALID_PAYLOAD, PRINTER_ERROR_NOT_CONNECTED, PRINTER_ERROR_SCAN_FAILED, PRINTER_ERROR_WRITE_FAILED } from '../unierror.uts'

const DEFAULT_WRITE_CHARACTERISTIC_UUIDS = [
  '0000ff02-0000-1000-8000-00805f9b34fb',
  '0000ff01-0000-1000-8000-00805f9b34fb',
  '49535343-8841-43f4-a8d4-ecbe34729bb3',
]

let centralManager: CBCentralManager | null = null
let discoveredPeripherals: Map<string, CBPeripheral> = new Map()
let scannedDevices: PrinterDevice[] = []
let connectedPeripheral: CBPeripheral | null = null
let writeCharacteristic: CBCharacteristic | null = null
let connectedPrinter: PrinterConnection | null = null
let blueStateCallback: BlueStateCallback | null = null
let connectStateCallback: ConnectStateCallback | null = null
let dataReceiveCallback: DataReceiveCallback | null = null
const commandBuilder = new PrinterEscBuilder()

function complete(options: { complete?: () => void }) {
  options.complete?.()
}

function normalizeUUID(value: string): string {
  return value.uppercaseString
}

function getCentralManager(delegate: CBCentralManagerDelegate): CBCentralManager {
  centralManager = new CBCentralManager(delegate = delegate, queue = null)
  return centralManager!
}

function upsertDevice(device: PrinterDevice) {
  const index = scannedDevices.findIndex((item: PrinterDevice) => item.deviceId == device.deviceId)
  if (index >= 0) {
    scannedDevices[index] = device
  }
  else {
    scannedDevices.push(device)
  }
}

function emitBlueState(on: boolean) {
  blueStateCallback?.(on)
}

function emitConnectState(state: 'connectSuccess' | 'disconnect' | 'connectFail', deviceId?: string, errMsg?: string) {
  connectStateCallback?.({ state, deviceId, errMsg })
}

function emitDataReceive(data: number[]) {
  dataReceiveCallback?.(data)
}

export const scanPrinters: ScanPrinters = function (options: ScanPrintersOptions) {
  scannedDevices = []
  discoveredPeripherals.clear()

  const delegate = new CBCentralManagerDelegate({
    centralManagerDidUpdateState(manager: CBCentralManager) {
      if (manager.state != CBManagerState.poweredOn) {
        options.fail?.(createPrinterError(PRINTER_ERROR_BLUETOOTH_UNAVAILABLE, 'Bluetooth is unavailable or disabled.'))
        complete(options)
        return
      }
      const serviceUUIDs = (options.serviceUUIDs ?? []).map((uuid: string) => CBUUID.UUIDWithString(uuid))
      manager.scanForPeripheralsWithServices(serviceUUIDs.length > 0 ? serviceUUIDs : null, options = null)
      setTimeout(() => {
        stopScanPrinters({
          success: () => options.success?.({ devices: scannedDevices }),
          fail: options.fail,
          complete: options.complete,
        })
      }, options.timeout ?? 10000)
    },
    centralManagerDidDiscoverPeripheral(manager: CBCentralManager, peripheral: CBPeripheral, advertisementData: Map<Any, Any>, RSSI: NSNumber) {
      const deviceId = peripheral.identifier.UUIDString
      discoveredPeripherals.set(deviceId, peripheral)
      upsertDevice({
        deviceId,
        name: peripheral.name ?? 'Unknown Printer',
        rssi: RSSI.intValue,
        serviceUUIDs: [],
      })
      emitBlueState(true)
      options.success?.({ devices: scannedDevices })
    },
  })

  getCentralManager(delegate)
}

export const stopScanPrinters: StopScanPrinters = function (options?: StopScanPrintersOptions) {
  centralManager?.stopScan()
  options?.success?.()
  options?.complete?.()
}

export const connectPrinter: ConnectPrinter = function (options: ConnectPrinterOptions) {
  const peripheral = discoveredPeripherals.get(options.deviceId)
  if (peripheral == null) {
    options.fail?.(createPrinterError(PRINTER_ERROR_DEVICE_NOT_FOUND, `Device ${options.deviceId} was not found. Scan before connecting.`))
    complete(options)
    return
  }

  const preferredCharacteristicUUIDs = (options.writeCharacteristicUUIDs ?? DEFAULT_WRITE_CHARACTERISTIC_UUIDS).map((uuid: string) => normalizeUUID(uuid))
  const peripheralDelegate = new CBPeripheralDelegate({
    peripheralDidDiscoverServices(target: CBPeripheral, error: NSError | null) {
      if (error != null || target.services == null) {
        options.fail?.(createPrinterError(PRINTER_ERROR_CONNECT_FAILED, 'Service discovery failed.'))
        complete(options)
        return
      }

      target.services!.forEach((service: CBService) => {
        target.discoverCharacteristics(null, forService = service)
      })
    },
    peripheralDidDiscoverCharacteristicsForService(target: CBPeripheral, service: CBService, error: NSError | null) {
      if (error != null || service.characteristics == null) {
        return
      }

      service.characteristics!.forEach((characteristic: CBCharacteristic) => {
        const uuid = normalizeUUID(characteristic.UUID.UUIDString)
        if (preferredCharacteristicUUIDs.includes(uuid)) {
          connectedPeripheral = target
          writeCharacteristic = characteristic
          connectedPrinter = {
            deviceId: options.deviceId,
            name: target.name ?? 'Unknown Printer',
            serviceUUID: service.UUID.UUIDString,
            writeCharacteristicUUID: characteristic.UUID.UUIDString,
          }
          emitConnectState('connectSuccess', options.deviceId)
          options.success?.(connectedPrinter!)
          complete(options)
        }
      })

      if (writeCharacteristic == null) {
        options.fail?.(createPrinterError(PRINTER_ERROR_CHARACTERISTIC_NOT_FOUND, 'No writable printer characteristic was found.'))
        emitConnectState('connectFail', options.deviceId, 'No writable printer characteristic was found.')
        complete(options)
      }
    },
  })

  peripheral.delegate = peripheralDelegate

  const centralDelegate = new CBCentralManagerDelegate({
    centralManagerDidUpdateState(manager: CBCentralManager) {
      if (manager.state != CBManagerState.poweredOn) {
        options.fail?.(createPrinterError(PRINTER_ERROR_BLUETOOTH_UNAVAILABLE, 'Bluetooth is unavailable or disabled.'))
        complete(options)
      }
    },
    centralManagerDidConnectPeripheral(_manager: CBCentralManager, target: CBPeripheral) {
      target.discoverServices((options.serviceUUIDs ?? []).map((uuid: string) => CBUUID.UUIDWithString(uuid)))
    },
    centralManagerDidFailToConnectPeripheral(_manager: CBCentralManager, _target: CBPeripheral, _error: NSError | null) {
      options.fail?.(createPrinterError(PRINTER_ERROR_CONNECT_FAILED, 'Failed to connect peripheral.'))
      emitConnectState('connectFail', options.deviceId, 'Failed to connect peripheral.')
      complete(options)
    },
  })

  const manager = getCentralManager(centralDelegate)
  manager.connectPeripheral(peripheral, options = null)
}

export const disconnectPrinter: DisconnectPrinter = function (options?: DisconnectPrinterOptions) {
  if (connectedPeripheral != null) {
    centralManager?.cancelPeripheralConnection(connectedPeripheral!)
  }
  connectedPeripheral = null
  writeCharacteristic = null
  connectedPrinter = null
  emitConnectState('disconnect')
  options?.success?.()
  options?.complete?.()
}

export const getConnectedPrinter: GetConnectedPrinter = function (options) {
  options.success?.(connectedPrinter)
  options.complete?.()
}

function writeBytes(bytes: number[], chunkSize: number, success: () => void, fail: (message: string) => void) {
  if (connectedPeripheral == null || writeCharacteristic == null) {
    fail('Printer is not connected.')
    return
  }

  const chunks = splitBytes(bytes, chunkSize)
  chunks.forEach((chunk: number[]) => {
    const data = Data(bytes = chunk.map((value: number) => UInt8(value)), count = chunk.length)
    connectedPeripheral!.writeValue(data, forCharacteristic = writeCharacteristic!, type = CBCharacteristicWriteType.withoutResponse)
  })
  success()
}

export const scanBlue: ScanBlue = function (callback: (device: PrinterDevice) => void) {
  scanPrinters({
    timeout: 10000,
    success(res) {
      const latest = res.devices[res.devices.length - 1]
      if (latest != null) {
        callback(latest)
      }
    },
  })
}

export const stopScanBlue: StopScanBlue = function () {
  stopScanPrinters()
}

export const connectBlue: ConnectBlue = function (deviceId: string) {
  connectPrinter({
    deviceId,
    fail(err) {
      emitConnectState('connectFail', deviceId, err.errMsg)
    },
  })
}

export const disconnect: Disconnect = function () {
  disconnectPrinter()
}

export const writeData: WriteData = function (callback?: (info: { byteLength: number, chunkCount: number }) => void) {
  const bytes = commandBuilder.toBytes()
  const chunks = splitBytes(bytes, 20)
  writeBytes(bytes, 20, () => {
    callback?.({ byteLength: bytes.length, chunkCount: chunks.length })
  }, (message: string) => {
    emitConnectState('connectFail', connectedPrinter?.deviceId, message)
  })
}

export const onBlueStateChange: OnBlueStateChange = function (callback: BlueStateCallback) {
  blueStateCallback = callback
}

export const onConnectStateChange: OnConnectStateChange = function (callback: ConnectStateCallback) {
  connectStateCallback = callback
}

export const onDataReceive: OnDataReceive = function (callback: DataReceiveCallback) {
  dataReceiveCallback = callback
}

export const clearCommandBuffer: ClearCommandBuffer = function () { commandBuilder.clearCommandBuffer() }
export const escInitializePrinter: EscInitializePrinter = function () { commandBuilder.escInitializePrinter() }
export const escJustification: EscJustificationCommand = function (position) { commandBuilder.escJustification(position) }
export const escSetCharcterSize: EscSetCharcterSize = function (size) { commandBuilder.escSetCharcterSize(size) }
export const escTurnEmphasizedMode: EscTurnEmphasizedMode = function (on) { commandBuilder.escTurnEmphasizedMode(on) }
export const escCutPaper: EscCutPaper = function () { commandBuilder.escCutPaper() }
export const escNewLine: EscNewLine = function () { commandBuilder.escNewLine() }
export const addPrintAndFeedLines: AddPrintAndFeedLines = function (lines) { commandBuilder.addPrintAndFeedLines(lines) }
export const escText: EscText = function (text) { commandBuilder.escText(text) }
export const escTwoText58: EscTwoText58 = function (payload) { return buildTwoText58(payload) }
export const escThreeText58: EscThreeText58 = function (payload) { return buildThreeText58(payload) }
export const escFourText58: EscFourText58 = function (payload) { return buildFourText58(payload) }
export const escQRCode: EscQRCode = function (payload) { commandBuilder.escQRCode(payload) }
export const escImage: EscImage = function (payload) { commandBuilder.escImage(payload) }
export const escStringCommand: EscStringCommand = function (command) { commandBuilder.escStringCommand(command) }
export const escBytesCommand: EscBytesCommand = function (command) { commandBuilder.escBytesCommand(command) }

export const printEsc: PrintEsc = function (options: PrintEscOptions) {
  if (options.bytes.length == 0) {
    options.fail?.(createPrinterError(PRINTER_ERROR_INVALID_PAYLOAD, 'ESC payload is empty.'))
    complete(options)
    return
  }

  writeBytes(options.bytes, options.chunkSize ?? 20, () => {
    options.success?.()
    complete(options)
  }, (message: string) => {
    const code = message == 'Printer is not connected.' ? PRINTER_ERROR_NOT_CONNECTED : PRINTER_ERROR_WRITE_FAILED
    options.fail?.(createPrinterError(code, message))
    complete(options)
  })
}

export const printText: PrintText = function (options: PrintTextOptions) {
  printEsc({
    bytes: buildReceipt(options),
    chunkSize: options.chunkSize,
    success: options.success,
    fail: options.fail,
    complete: options.complete,
  })
}
```

- [ ] **Step 2: Compile iOS app**

Run:

```bash
pnpm build:app-ios
```

Expected: PASS. If UTS reports Swift/CoreBluetooth bridge syntax errors, fix only `src/uni_modules/yuntu-printer-uts/utssdk/app-ios/index.uts` while preserving the public API from `interface.uts`.

- [ ] **Step 3: Commit**

```bash
git add src/uni_modules/yuntu-printer-uts/utssdk/app-ios/index.uts
git commit -m "feat: implement ios ble printer adapter"
```

---

### Task 9: Add Vue Printer Composable

**Files:**
- Create: `src/composables/usePrinter.ts`

- [ ] **Step 1: Write composable**

Create `src/composables/usePrinter.ts`:

```ts
import { computed, ref } from 'vue'
import {
  addPrintAndFeedLines,
  clearCommandBuffer,
  connectPrinter,
  disconnectPrinter,
  escCutPaper,
  escInitializePrinter,
  escNewLine,
  escText,
  onConnectStateChange,
  getConnectedPrinter,
  printText,
  scanPrinters,
  stopScanPrinters,
  writeData,
} from '@/uni_modules/yuntu-printer-uts'

export type PrinterDeviceView = {
  deviceId: string
  name: string
  rssi: number
  serviceUUIDs: string[]
}

export function usePrinter() {
  const devices = ref<PrinterDeviceView[]>([])
  const connectedDeviceId = ref('')
  const loading = ref(false)
  const lastEvent = ref('等待操作')
  const statusText = computed(() => {
    if (connectedDeviceId.value) {
      return `已连接 ${connectedDeviceId.value}`
    }
    if (devices.value.length > 0) {
      return `发现 ${devices.value.length} 台设备`
    }
    return '未连接打印机'
  })

  function showError(err: { errMsg?: string }) {
    lastEvent.value = err.errMsg ?? '打印机操作失败'
    uni.showToast({
      title: err.errMsg ?? '打印机操作失败',
      icon: 'none',
    })
  }

  function scan() {
    loading.value = true
    devices.value = []
    scanPrinters({
      timeout: 10000,
      success(res) {
        devices.value = res.devices
      },
      fail: showError,
      complete() {
        loading.value = false
      },
    })
  }

  function stopScan() {
    stopScanPrinters({
      complete() {
        loading.value = false
      },
    })
  }

  function connect(deviceId: string) {
    loading.value = true
    connectPrinter({
      deviceId,
      success(res) {
        connectedDeviceId.value = res.deviceId
        lastEvent.value = 'connectSuccess'
        uni.showToast({
          title: '连接成功',
          icon: 'success',
        })
      },
      fail: showError,
      complete() {
        loading.value = false
      },
    })
  }

  function refreshConnected() {
    getConnectedPrinter({
      success(res) {
        connectedDeviceId.value = res?.deviceId ?? ''
      },
      fail: showError,
    })
  }

  function disconnect() {
    loading.value = true
    disconnectPrinter({
      success() {
        connectedDeviceId.value = ''
        lastEvent.value = 'disconnect'
        uni.showToast({
          title: '已断开',
          icon: 'success',
        })
      },
      fail: showError,
      complete() {
        loading.value = false
      },
    })
  }

  function bindEvents() {
    onConnectStateChange((payload) => {
      lastEvent.value = payload.state
      if (payload.state === 'connectSuccess' && payload.deviceId) {
        connectedDeviceId.value = payload.deviceId
      }
      if (payload.state === 'disconnect') {
        connectedDeviceId.value = ''
      }
      if (payload.state === 'connectFail') {
        showError({ errMsg: payload.errMsg ?? '连接失败' })
      }
    })
  }

  function printSample() {
    loading.value = true
    printText({
      title: 'YUNTU PRINTER',
      lines: [
        'Printer Plugin',
        `Time ${new Date().toLocaleString()}`,
        'Status OK',
      ],
      feed: 3,
      cut: true,
      success() {
        uni.showToast({
          title: '已发送打印',
          icon: 'success',
        })
      },
      fail: showError,
      complete() {
        loading.value = false
      },
    })
  }

  function printSampleByEscCommands() {
    loading.value = true
    clearCommandBuffer()
    escInitializePrinter()
    escText('YUNTU PRINTER')
    escNewLine()
    escText('GPrinter Compatible API')
    escNewLine()
    addPrintAndFeedLines(3)
    escCutPaper()
    writeData(() => {
      loading.value = false
      uni.showToast({
        title: '已发送打印',
        icon: 'success',
      })
    })
  }

  return {
    connectedDeviceId,
    devices,
    disconnect,
    lastEvent,
    loading,
    bindEvents,
    printSample,
    printSampleByEscCommands,
    refreshConnected,
    scan,
    statusText,
    stopScan,
    connect,
  }
}
```

- [ ] **Step 2: Run type check**

Run:

```bash
pnpm type-check
```

Expected: PASS or only platform UTS compile errors already assigned to Task 6/8.

- [ ] **Step 3: Commit**

```bash
git add src/composables/usePrinter.ts
git commit -m "feat: add printer page composable"
```

---

### Task 10: Build Printer Page UI

**Files:**
- Modify: `src/pages/printer/index.vue`

- [ ] **Step 1: Replace placeholder printer page**

Replace `src/pages/printer/index.vue` with:

```vue
<script setup lang="ts">
import { onMounted } from 'vue'
import { usePrinter } from '@/composables/usePrinter'

definePage({
  name: 'printer',
  layout: 'tabbar',
  style: {
    navigationBarTitleText: '打印机插件',
  },
})

const {
  bindEvents,
  connectedDeviceId,
  devices,
  disconnect,
  lastEvent,
  loading,
  printSample,
  printSampleByEscCommands,
  refreshConnected,
  scan,
  statusText,
  stopScan,
  connect,
} = usePrinter()

onMounted(() => {
  bindEvents()
  refreshConnected()
})
</script>

<template>
  <view class="min-h-screen bg-[var(--wot-color-bg,#f7f8fa)]">
    <scroll-view scroll-y class="h-screen">
      <demo-block title="连接状态" transparent>
        <wd-cell-group border custom-class="rounded-2! overflow-hidden">
          <wd-cell title="状态" :value="statusText" />
          <wd-cell title="最后事件" :value="lastEvent" />
          <wd-cell v-if="connectedDeviceId" title="当前设备" :value="connectedDeviceId" />
        </wd-cell-group>
      </demo-block>

      <demo-block title="基础功能" transparent>
        <view class="grid grid-cols-2 gap-3 px-4">
          <wd-button block type="primary" :loading="loading" @click="scan">
            扫描打印机
          </wd-button>
          <wd-button block plain :disabled="!loading" @click="stopScan">
            停止扫描
          </wd-button>
          <wd-button block type="success" :disabled="!connectedDeviceId" :loading="loading" @click="printSample">
            语义打印
          </wd-button>
          <wd-button block plain type="success" :disabled="!connectedDeviceId" :loading="loading" @click="printSampleByEscCommands">
            ESC打印
          </wd-button>
          <wd-button block type="error" plain :disabled="!connectedDeviceId" :loading="loading" @click="disconnect">
            断开连接
          </wd-button>
        </view>
      </demo-block>

      <demo-block title="发现的设备" transparent>
        <wd-cell-group border custom-class="rounded-2! overflow-hidden">
          <wd-cell
            v-for="device in devices"
            :key="device.deviceId"
            :title="device.name || 'Unknown Printer'"
            :label="device.deviceId"
            :value="`RSSI ${device.rssi}`"
            is-link
            @click="connect(device.deviceId)"
          />
          <wd-cell v-if="devices.length === 0" title="暂无设备" value="点击扫描" />
        </wd-cell-group>
      </demo-block>
    </scroll-view>
  </view>
</template>
```

- [ ] **Step 2: Run type check**

Run:

```bash
pnpm type-check
```

Expected: PASS or only platform UTS compile errors already assigned to Task 6/8.

- [ ] **Step 3: Build H5 smoke check**

Run:

```bash
pnpm build:h5
```

Expected: PASS. The printer page is App-only in `src/pages.json`, but the import graph must not break H5 build.

- [ ] **Step 4: Commit**

```bash
git add src/pages/printer/index.vue
git commit -m "feat: add printer plugin page"
```

---

### Task 11: Document Permissions And Device QA

**Files:**
- Modify: `src/uni_modules/yuntu-printer-uts/README.md`
- Create: `docs/printer-uts-plugin.md`

- [ ] **Step 1: Create project-level QA doc**

Create `docs/printer-uts-plugin.md`:

```md
# Printer UTS Plugin QA

## References

- UTS plugin: https://uniapp.dcloud.net.cn/plugin/uts-plugin.html
- UTS for Android: https://uniapp.dcloud.net.cn/plugin/uts-for-android.html
- UTS for iOS: https://uniapp.dcloud.net.cn/plugin/uts-for-ios.html
- Local Bluetooth printing PDF: `/Users/apple/Downloads/GPrinter+-+蓝牙打印使用指南.pdf`
- Local ESC/POS PDF: `/Users/apple/Downloads/GPrinter - ESC指令使用指南.pdf`

## Extracted Requirements

- Plugin compatibility target follows the `xl-GPrinter` UTS usage style.
- Supported platforms are Android and iOS.
- Supported printer command protocols in the reference are TSPL/TSC, CPCL, and ESC; this implementation scope uses ESC/POS.
- Unit conversion from the reference is `200dpi: 1mm = 8dot`, `300dpi: 1mm = 12dot`.
- Bluetooth API surface must include `scanBlue`, `stopScanBlue`, `connectBlue`, `disconnect`, `writeData`, `onBlueStateChange`, `onConnectStateChange`, and `onDataReceive`.
- Connection event states must include `connectSuccess`, `disconnect`, and `connectFail`.
- ESC command API surface must include `escInitializePrinter`, `escJustification`, `escSetCharcterSize`, `escTurnEmphasizedMode`, `escCutPaper`, `escNewLine`, `addPrintAndFeedLines`, `escText`, `escTwoText58`, `escThreeText58`, `escFourText58`, `escQRCode`, `escImage`, `escStringCommand`, and `escBytesCommand`.

## Android QA

1. Build a custom Android base after adding the plugin.
2. Install the custom base on an Android 12+ phone.
3. Open `pages/printer/index`.
4. Tap `扫描打印机`.
5. Grant Bluetooth scan/connect permissions.
6. Select a BLE printer from the device list.
7. Tap `语义打印`, then tap `ESC打印`.
8. Confirm the printer outputs:

```text
YUNTU PRINTER
Printer Plugin
Time <current time>
Status OK
```

## iOS QA

1. Build a custom iOS base after adding the plugin.
2. Install the custom base on an iPhone.
3. Confirm the system Bluetooth permission prompt uses the configured Chinese usage text.
4. Open `pages/printer/index`.
5. Tap `扫描打印机`.
6. Select a BLE printer from the device list.
7. Tap `语义打印`, then tap `ESC打印`.
8. Confirm the printer outputs the same receipt as Android.

## Known Limits

- First version supports BLE printers.
- Android classic Bluetooth SPP printers need a separate transport implementation.
- Non-ASCII text is encoded as `?` in the first pass; add GB18030/GBK encoding after validating target printer code page behavior on hardware.
```

- [ ] **Step 2: Extend plugin README with QA link**

Append to `src/uni_modules/yuntu-printer-uts/README.md`:

```md
## QA

See `docs/printer-uts-plugin.md` for Android and iOS device verification steps.
```

- [ ] **Step 3: Verify docs mention both platforms**

Run:

```bash
rg "Android|iOS|ESC/POS|BLE|scanBlue|escInitializePrinter" docs/printer-uts-plugin.md src/uni_modules/yuntu-printer-uts/README.md
```

Expected: output includes Android, iOS, BLE, ESC/POS, `scanBlue`, and `escInitializePrinter` references.

- [ ] **Step 4: Commit**

```bash
git add docs/printer-uts-plugin.md src/uni_modules/yuntu-printer-uts/README.md
git commit -m "docs: add printer uts qa guide"
```

---

### Task 12: Final Verification

**Files:**
- Verify all files from previous tasks.

- [ ] **Step 1: Run unit tests**

Run:

```bash
pnpm test
```

Expected: PASS.

- [ ] **Step 2: Run type check**

Run:

```bash
pnpm type-check
```

Expected: PASS.

- [ ] **Step 3: Run lint**

Run:

```bash
pnpm lint
```

Expected: PASS.

- [ ] **Step 4: Run Android build**

Run:

```bash
pnpm build:app-android
```

Expected: PASS.

- [ ] **Step 5: Run iOS build**

Run:

```bash
pnpm build:app-ios
```

Expected: PASS on macOS with iOS build tooling configured.

- [ ] **Step 6: Run H5 build**

Run:

```bash
pnpm build:h5
```

Expected: PASS.

- [ ] **Step 7: Inspect git diff**

Run:

```bash
git status --short
git diff --stat
```

Expected: only planned printer plugin, page, docs, package, and test files changed.

- [ ] **Step 8: Commit verification fixes**

If verification required compile-only syntax fixes, commit them:

```bash
git add src/uni_modules/yuntu-printer-uts src/pages/printer/index.vue src/composables/usePrinter.ts src/utils/printerEsc.ts src/utils/printerEsc.test.ts docs/printer-uts-plugin.md package.json pnpm-lock.yaml
git commit -m "chore: verify printer uts plugin"
```

## Self-Review

- Spec coverage: Android and iOS are covered by Tasks 5-8; UTS plugin structure is covered by Tasks 2-4; Bluetooth printing is covered by scan/connect/write/disconnect APIs in Tasks 6 and 8; ESC/POS printing is covered by Tasks 1 and 4; page integration is covered by Tasks 9-10; docs and QA are covered by Task 11.
- Placeholder scan: The plan contains concrete file paths, exported API names, command examples, expected outputs, and code snippets for each file.
- Type consistency: `PrinterDevice`, `PrinterConnection`, `PrinterError`, GPrinter-compatible APIs (`scanBlue`, `connectBlue`, `writeData`, event callbacks, and ESC command builders), and semantic wrappers (`scanPrinters`, `connectPrinter`, `printEsc`, `printText`) are defined once in `interface.uts` and reused by Android, iOS, and Vue code.
