# Yuntu Printer UTS 打印插件

`yuntu-printer-uts` 是一个面向 uni-app App 端的 UTS 打印插件，支持蓝牙 BLE 打印机、局域网 Wi-Fi/TCP 打印机，以及 Noryox NB55 / Handheld_POS_V28 Android 设备的内置打印机。提供流式 ESC/POS 指令构建、语义化小票打印和 Promise 风格的异步连接 API。

## 功能介绍

- 扫描附近 BLE 打印机，返回设备名称、设备 ID、RSSI 等信息。
- 按设备 ID 连接 BLE 打印机，可指定服务 UUID 和写入特征 UUID。
- 按 IP 和端口连接 Wi-Fi/TCP 打印机。
- 支持 Noryox NB55 Android 设备内置打印机（通过 AIDL 服务）。
- 流式 ESC/POS 命令构建器：`clearCommandBuffer()`、`escInitializePrinter()`、`escJustification()`、`escText()`、`escQRCode()` 等方法。
- 58mm 小票二列、三列、四列文本排版工具。
- 语义化小票打印 `printText()`。
- 直接发送原始 ESC/POS 字节 `printEsc()`。
- Noryox 内置打印机顶层 API：文本、条码、二维码、图片、表格、标签。
- 连接状态事件监听。
- 蓝牙分包写入（BLE 每包 20 字节，Wi-Fi/Noryox 一次完成）。
- 全部异步 API 返回 Promise。

## 平台支持

| 平台        | 支持情况 | 说明                                                              |
| ----------- | -------- | ----------------------------------------------------------------- |
| Android App | 支持     | BLE 通过 Bluetooth API，Wi-Fi 通过 TCP Socket，Noryox 通过 AIDL。 |
| iOS App     | 支持     | BLE 通过 CoreBluetooth，Wi-Fi 通过 TCP Stream。内置打印机不可用。 |
| H5          | 不支持   | UTS 原生插件能力不支持 H5。                                       |
| 小程序      | 不支持   | UTS 原生插件能力不支持小程序。                                    |

## 权限配置

### Android

- `android.permission.BLUETOOTH_SCAN`
- `android.permission.BLUETOOTH_CONNECT`
- `android.permission.ACCESS_FINE_LOCATION`（Android < 12）
- `android.permission.INTERNET`
- `android.permission.ACCESS_NETWORK_STATE`
- Noryox 包可见性：`com.incar.printerservice`

### iOS

- `NSBluetoothAlwaysUsageDescription`
- `NSLocalNetworkUsageDescription`

## 快速开始

```ts
import {
  connectPrinter,
  createEscBuilder,
  disconnectPrinter,
  onConnectStateChange,
  printText,
  scanPrinters,
  sendEsc,
} from '@/uni_modules/yuntu-printer-uts'

// 扫描蓝牙打印机
const { devices } = await scanPrinters({ timeout: 10000 })

// 连接
const conn = await connectPrinter({ deviceId: devices[0].deviceId })

// 监听连接状态
onConnectStateChange(({ state, deviceId }) => {
  console.log(state, deviceId)
})

// 语义化小票打印
await printText({
  title: 'YUNTU PRINTER',
  lines: ['订单号: 10001', '状态: OK'],
  feed: 3,
  cut: true,
})

// 流式 ESC/POS 命令构建
const esc = createEscBuilder()
esc.clearCommandBuffer()
esc.escInitializePrinter()
esc.escJustification('center')
esc.escTurnEmphasizedMode(true)
esc.escSetCharcterSize(2)
esc.escText('TITLE')
esc.escNewLine()
esc.escTurnEmphasizedMode(false)
esc.escSetCharcterSize(1)
esc.escJustification('left')
esc.escText('Item A        10.00')
esc.escNewLine()
esc.escQRCode({ content: 'https://example.com/order/10001', size: 6 })
esc.addPrintAndFeedLines(3)
esc.escCutPaper()
await sendEsc(esc)

// 断开
await disconnectPrinter()
```

## 连接 Wi-Fi 打印机

```ts
import { connectWifi, printText, disconnectPrinter } from '@/uni_modules/yuntu-printer-uts'

await connectWifi({ ip: '192.168.100.110', port: 8000 })
await printText({ title: 'Wi-Fi Printer', lines: ['OK'], feed: 3, cut: true })
await disconnectPrinter()
```

## 连接 Noryox 内置打印机

```ts
import {
  checkBuiltInPrinter,
  connectPrinter,
  printBuiltInBarcode,
  printBuiltInText,
} from '@/uni_modules/yuntu-printer-uts'

const { available, device } = await checkBuiltInPrinter()
if (!available) return

await connectPrinter({ deviceId: device!.deviceId })
await printBuiltInText({
  text: 'Hello',
  format: { textSize: 32, align: 'center', style: 'bold' },
  autoOut: true,
})
await printBuiltInBarcode({
  content: '123456789',
  width: 300,
  height: 160,
  textPosition: 1,
  align: 'center',
  symbology: 'code128',
  autoOut: true,
})
```

## Noryox 内置打印机 API

推荐使用顶层 `printBuiltIn*` 方法。它们在 Android Noryox 设备上可用，iOS 会返回“内置打印机不可用”错误。`getBuiltInPrinter()` 仍保留为可选对象 API，主要用于兼容直接对象调用场景。

### 文本、条码、二维码、图片

```ts
await printBuiltInText({
  text: 'Noryox native text',
  format: { textSize: 32, align: 'center', style: 'bold' },
  autoOut: true,
})
await printBuiltInBarcode({
  content: '123456789',
  width: 300,
  height: 160,
  textPosition: 1,
  align: 'center',
  symbology: 'code128',
  autoOut: true,
})
await printBuiltInQrCode({
  content: '123456789',
  width: 300,
  height: 300,
  align: 'center',
  autoOut: true,
})
await printBuiltInImage({
  base64Str: 'data:image/png;base64,...',
  type: 'blackWhite',
  align: 'center',
  autoOut: true,
})
```

文本、条码、二维码、图片和表格方法均支持 `autoOut` 自动走纸出票。自定义字库可通过 `format.font = 5` 和 `format.path` 设置。

### 表格打印

```ts
const weights = [2, 1, 1, 1]
const center = { align: 'center' as const, textSize: 24 }

await printBuiltInTable({
  rows: [
    { texts: ['商品', '数量', '单价', '金额'], weights, formats: [center, center, center, center] },
    { texts: ['Coffee', '2', '12.00', '24.00'], weights },
  ],
  autoOut: true,
})
```

### 多列文本打印（ESC $ 绝对定位）

通过 ESC/POS `ESC $` 绝对定位指令实现精确的多列对齐，效果等价于 SDK 的 `Utils.printTwoColumn`。适用于 Noryox 内置打印机；BLE / Wi-Fi 打印机通过 `EscBuilder` 调用 `escTwoColumn` / `escThreeColumn` / `escFourColumn` 后 `sendEsc()` 即可。

```ts
import {
  printBuiltInTwoColumn,
  printBuiltInThreeColumn,
  printBuiltInFourColumn,
} from '@/uni_modules/yuntu-printer-uts'

// 两列
await printBuiltInTwoColumn({
  leftText: 'Total:',
  rightText: '9998.00',
  autoOut: true,
})

// 三列 — rightText 自动靠右对齐纸边，middlePositionDots 指定中列起始（默认 200）
await printBuiltInThreeColumn({
  leftText: 'Coffee',
  middleText: 'x2',
  rightText: '24.00',
})

// 四列 — fourText 自动靠右对齐纸边，twoPositionDots / threePositionDots 指定中间列（默认 140 / 260）
await printBuiltInFourColumn({
  oneText: 'Coffee',
  twoText: '2',
  threeText: '12.00',
  fourText: '24.00',
})
```

默认按 58mm 纸宽（384 点）计算列位置。使用 80mm 纸时传入更大的位置值（如 576）。

**BLE / Wi-Fi 多列示例**（通过 EscBuilder）：

```ts
const esc = createEscBuilder()
esc.escTwoColumn('Total:', '9998.00')
esc.escThreeColumn('Item', 'Qty', 'Price')
esc.escFourColumn('A', '2', '10', '20.00')
esc.addPrintAndFeedLines(3)
esc.escCutPaper()
await sendEsc(esc)
```

### 标签打印

```ts
await printBuiltInLabel({
  height: 240,
  gap: 16,
  actions: [
    { type: 'text', text: '\nModel:\t\tNB55', format: { textSize: 24 } },
    {
      type: 'barcode',
      content: '1234567890987654321',
      width: 320,
      height: 90,
      textPosition: 2,
      align: 'left',
      symbology: 'code128',
    },
  ],
  autoLocate: false,
  detectBeforeLocate: false,
})
```

## 发送原始 ESC/POS 字节

```ts
import { printEsc } from '@/uni_modules/yuntu-printer-uts'

await printEsc([0x1b, 0x40, 0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x0a])
```

## 事件监听

```ts
import { onConnectStateChange } from '@/uni_modules/yuntu-printer-uts'

onConnectStateChange(({ state, deviceId, errMsg }) => {
  // state: 'connectSuccess' | 'disconnect' | 'connectFail'
  console.log(state, deviceId, errMsg)
})
```

## API 参考

### 连接与状态

| API                        | 签名                                    |
| -------------------------- | --------------------------------------- |
| `scanPrinters(options?)`   | `Promise<{ devices: PrinterDevice[] }>` |
| `stopScanPrinters()`       | `void`                                  |
| `connectPrinter(options)`  | `Promise<PrinterConnection>`            |
| `connectWifi(options)`     | `Promise<PrinterConnection>`            |
| `disconnectPrinter()`      | `Promise<boolean>`                      |
| `getConnectedPrinter()`    | `PrinterConnection \| null`             |
| `checkBuiltInPrinter()`    | `Promise<{ available, device? }>`       |
| `testPrint(options)`       | `Promise<WriteDataResult>`              |
| `onConnectStateChange(cb)` | `void`                                  |

### 打印

| API                               | 签名                               |
| --------------------------------- | --------------------------------- |
| `printText(options)`              | `Promise<WriteDataResult>`      |
| `printEsc(bytes, chunkSize?)`     | `Promise<WriteDataResult>`      |
| `createEscBuilder()`              | `EscBuilder`                    |
| `sendEsc(builder)`                | `Promise<WriteDataResult>`      |
| `getBuiltInPrinter()`             | `BuiltInPrinter \| null`        |
| `printBuiltInText(options)`       | `Promise<BuiltInPrinterResult>` |
| `printBuiltInBarcode(options)`    | `Promise<BuiltInPrinterResult>` |
| `printBuiltInQrCode(options)`     | `Promise<BuiltInPrinterResult>` |
| `printBuiltInImage(options)`      | `Promise<BuiltInPrinterResult>` |
| `printBuiltInLabel(options)`      | `Promise<BuiltInPrinterResult>` |
| `printBuiltInTable(options)`      | `Promise<boolean>`              |
| `printBuiltInTwoColumn(options)`  | `Promise<BuiltInPrinterResult>` |
| `printBuiltInThreeColumn(options)`| `Promise<BuiltInPrinterResult>` |
| `printBuiltInFourColumn(options)` | `Promise<BuiltInPrinterResult>` |

### EscBuilder 方法

`EscBuilder` 方法会修改内部 `bytes` 缓冲区；调用 `sendEsc(builder)` 发送到已连接打印机。

| 方法                           | 说明                                      |
| ------------------------------ | ----------------------------------------- |
| `clearCommandBuffer()`         | 清空指令缓冲区                            |
| `escInitializePrinter()`       | ESC @ 初始化打印机                        |
| `escJustification(p)`          | 对齐：`'left'` \| `'center'` \| `'right'` |
| `escSetCharcterSize(s)`        | 字符大小：`1` 或 `2`                      |
| `escTurnEmphasizedMode(on)`    | 开/关加粗                                 |
| `escCutPaper()`                | GS V 切纸                                 |
| `escNewLine()`                 | LF 换行                                   |
| `addPrintAndFeedLines(n)`      | ESC d 走纸 n 行                           |
| `escText(s)`                   | 追加 ASCII 文本                           |
| `escQRCode({ content, size })` | GS ( k 二维码                             |
| `escTwoColumn(l, r, ...)`      | ESC $ 两栏精确定位                       |
| `escThreeColumn(l, m, r, ...)` | ESC $ 三栏精确定位                       |
| `escFourColumn(a, b, c, d, ...)` | ESC $ 四栏精确定位                       |
| `escStringCommand(command)`    | 追加原始字符串命令                        |
| `escBytesCommand(command)`     | 追加原始字节命令                          |

### BuiltInPrinter 方法

`BuiltInPrinter` 是兼容对象 API；新代码优先使用上方顶层 `printBuiltIn*` 方法。

| 方法                                                              | 返回                            |
| ----------------------------------------------------------------- | ------------------------------- |
| `printText(text, format?, textWidth?, align?, autoOut?)`          | `Promise<BuiltInPrinterResult>` |
| `printBarcode(content, w, h, pos?, align?, symbology?, autoOut?)` | `Promise<BuiltInPrinterResult>` |
| `printQrCode(content, w, h, align?, autoOut?)`                    | `Promise<BuiltInPrinterResult>` |
| `printImage(base64, type?, align?, autoOut?)`                     | `Promise<BuiltInPrinterResult>` |
| `printLabel(height, gap, actions, autoLocate?, detect?)`          | `Promise<BuiltInPrinterResult>` |
| `printTable(rows, autoOut?)`                                      | `Promise<boolean>`              |
| `clearLabelLearning()`                                            | `Promise<BuiltInPrinterResult>` |

## 类型说明

```ts
type PrinterDevice = {
  deviceId: string
  name: string
  rssi: number
  serviceUUIDs: string[]
  type?: 'bluetooth' | 'wifi' | 'noryox'
}

type PrinterConnection = {
  deviceId: string
  name: string
  serviceUUID: string
  writeCharacteristicUUID: string
  ip?: string
  port?: number
  type?: 'bluetooth' | 'wifi' | 'noryox'
}

type BuiltInPrinterResult = { code: number; ok: boolean; message: string }
type WriteDataResult = { byteLength: number; chunkCount: number; complete?: boolean; msg?: string }
```

## 错误码

| 错误码 | 说明                 |
| ------ | -------------------- |
| `1001` | 蓝牙不可用或未开启   |
| `1002` | 蓝牙权限未授予       |
| `1003` | 扫描失败             |
| `1004` | 未找到设备           |
| `1005` | 连接失败             |
| `1006` | 未找到蓝牙服务       |
| `1007` | 未找到可写特征值     |
| `1008` | 打印机未连接         |
| `1009` | 写入失败             |
| `1010` | 打印数据为空或不合法 |
| `1011` | 当前平台不支持       |
| `1012` | 内置打印机不可用     |
| `1013` | 内置打印服务绑定失败 |
| `1014` | 内置打印服务未连接   |

## 注意事项

- BLE 打印前请先完成系统权限申请，再调用 `scanPrinters`。
- iOS 连接蓝牙外设前需要先扫描，插件会缓存扫描到的外设对象。
- 默认写入特征 UUID：`0000ff02-...`、`0000ff01-...`、`49535343-...`。如打印机使用其他特征，请在 `connectPrinter` 中传入 `writeCharacteristicUUIDs`。
- 当前文本编码以 ASCII 为主，非 ASCII 字符会按 `?` 处理。中文打印建议业务侧生成 GB18030/GBK 字节后通过 `printEsc` 发送。
- Wi-Fi 打印机需手机和打印机在同一网络内。
- Noryox 内置打印机仅限 Android，设备 ID 为 `noryox:built-in`。
