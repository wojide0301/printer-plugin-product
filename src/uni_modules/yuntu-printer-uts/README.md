# Yuntu Printer UTS 打印插件

`yuntu-printer-uts` 是一个面向 uni-app App 端的 UTS 打印插件，支持蓝牙 BLE 打印机、局域网 Wi-Fi/TCP 打印机，以及 Noryox NB55 / Handheld_POS_V28 Android 设备的内置打印机。插件统一使用 ESC/POS 指令输出，适合小票、订单、标签前置内容、二维码等热敏打印场景。

## 功能介绍

- 支持 Android App 和 iOS App，基于原生蓝牙、Socket、系统打印服务实现。
- 支持扫描附近 BLE 打印机，返回设备名称、设备 ID、RSSI、服务 UUID 等信息。
- 支持按设备 ID 连接 BLE 打印机，可指定服务 UUID 和写入特征 UUID。
- 支持按 IP 和端口连接 Wi-Fi/TCP 打印机。
- 支持 Noryox NB55 / Handheld_POS_V28 Android 设备内置打印机，通过系统 AIDL 打印服务发送 ESC/POS 数据。
- 支持查询当前连接、断开连接、判断是否已连接。
- 支持连接状态监听：连接成功、断开连接、连接失败。
- 支持蓝牙状态监听和打印机返回数据监听。
- 支持直接发送原始 ESC/POS 字节数组。
- 支持内置小票文本打印 API：标题、正文多行、走纸、切纸。
- 支持链式构建 ESC/POS 指令缓冲区后统一发送。
- 支持打印初始化、对齐方式、字号、加粗、换行、走纸、切纸。
- 支持 58mm 小票常用二列、三列、四列文本排版辅助方法。
- 支持二维码 ESC/POS 指令生成。
- 支持字符串指令和字节指令追加，便于对接特殊打印机指令。
- 支持蓝牙写入分包，默认 BLE 每包 20 字节；Wi-Fi 和 Noryox 默认一次写入完整数据。
- 支持 `success`、`fail`、`complete` 风格回调，便于和 uni-app API 风格保持一致。

## 平台支持

| 平台 | 支持情况 | 说明 |
| --- | --- | --- |
| Android App | 支持 | BLE 通过 Android Bluetooth API，Wi-Fi 通过 TCP Socket，Noryox 内置打印机通过 AIDL 服务。 |
| iOS App | 支持 | BLE 通过 CoreBluetooth，Wi-Fi 通过 TCP Stream。 |
| H5 | 不支持 | UTS 原生插件能力不支持 H5。 |
| 小程序 | 不支持 | UTS 原生插件能力不支持小程序。 |

> 修改 Android AIDL、Manifest 或 iOS 原生配置后，需要重新制作或运行自定义基座再测试。

## 权限配置

### Android

插件会用到以下权限或能力：

- `android.permission.BLUETOOTH`
- `android.permission.BLUETOOTH_ADMIN`
- `android.permission.BLUETOOTH_SCAN`
- `android.permission.BLUETOOTH_CONNECT`
- `android.permission.ACCESS_FINE_LOCATION`
- `android.permission.INTERNET`
- `android.permission.ACCESS_NETWORK_STATE`
- `android.permission.ACCESS_WIFI_STATE`
- Noryox 内置打印服务包可见性：`com.incar.printerservice`

Android 12 及以上通常需要动态申请 `BLUETOOTH_SCAN` 和 `BLUETOOTH_CONNECT`；Android 旧版本 BLE 扫描通常需要动态申请 `ACCESS_FINE_LOCATION`。

### iOS

需要在 iOS 配置中声明：

- `NSBluetoothAlwaysUsageDescription`
- `NSLocalNetworkUsageDescription`

## 快速开始

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
    console.log('发现的打印机', res.devices)
  },
  fail(err) {
    console.error(err.errMsg)
  },
  complete() {
    console.log('扫描结束')
  },
})

connectPrinter({
  deviceId: '蓝牙设备 ID',
  success() {
    printText({
      title: 'YUNTU PRINTER',
      lines: ['订单号: 10001', '状态: OK'],
      feed: 3,
      cut: true,
    })
  },
})

stopScanPrinters({})
disconnectPrinter({})
```

## 连接 Wi-Fi 打印机

```ts
import {
  connectNet,
  disconnectPrinter,
  printText,
} from '@/uni_modules/yuntu-printer-uts'

connectNet({
  ip: '192.168.100.110',
  port: 8000,
  timeout: 10000,
  success(res) {
    console.log('Wi-Fi 打印机已连接', res.deviceId)
    printText({
      title: 'Wi-Fi Printer',
      lines: ['TCP connected', 'Print OK'],
      feed: 3,
      cut: true,
    })
  },
  fail(err) {
    console.error(err.errMsg)
  },
})

disconnectPrinter({})
```

## 连接 Noryox 内置打印机

Noryox NB55 / Handheld_POS_V28 Android 设备的内置打印机不是蓝牙外设，插件通过设备内置的系统 AIDL 服务连接：

- 服务包名：`com.incar.printerservice`
- 服务 Action：`com.incar.printerservice.IPrinterService`
- 插件内置设备 ID：`noryox:built-in`
- 写入方式：调用服务的 `printEscposData(byte[])`

推荐先调用 `checkBuiltInPrinter` 检测内置打印服务是否可用，再使用返回的设备 ID 调用 `connectPrinter`。

```ts
import {
  checkBuiltInPrinter,
  connectPrinter,
  printText,
} from '@/uni_modules/yuntu-printer-uts'

checkBuiltInPrinter({
  success(res) {
    if (!res.available || !res.device) {
      console.log('当前设备未检测到 Noryox 内置打印服务')
      return
    }

    connectPrinter({
      deviceId: res.device.deviceId,
      success() {
        printText({
          title: 'Noryox Printer',
          lines: ['Built-in printer', 'Print OK'],
          feed: 3,
          cut: true,
        })
      },
    })
  },
})
```

## 打印文本小票

`printText` 会自动生成一组基础 ESC/POS 指令：初始化打印机、居中打印标题、左对齐打印正文、走纸，并按需切纸。

```ts
import { printText } from '@/uni_modules/yuntu-printer-uts'

printText({
  title: '云途小票',
  lines: [
    '商品A        2 x 10.00',
    '商品B        1 x 19.90',
    '合计         39.90',
  ],
  feed: 3,
  cut: true,
  chunkSize: 20,
  success() {
    console.log('发送成功')
  },
  fail(err) {
    console.error(err.errMsg)
  },
})
```

## 构建 ESC/POS 指令打印

当需要更精细控制格式时，可以先清空指令缓冲区，再逐条追加 ESC/POS 指令，最后调用 `writeData` 发送。

```ts
import {
  addPrintAndFeedLines,
  clearCommandBuffer,
  escCutPaper,
  escInitializePrinter,
  escJustification,
  escNewLine,
  escQRCode,
  escSetCharcterSize,
  escText,
  escTurnEmphasizedMode,
  escTwoText58,
  writeData,
} from '@/uni_modules/yuntu-printer-uts'

clearCommandBuffer()
escInitializePrinter()

escJustification('center')
escSetCharcterSize(2)
escTurnEmphasizedMode(true)
escText('YUNTU')
escNewLine()

escSetCharcterSize(1)
escTurnEmphasizedMode(false)
escJustification('left')
escText(escTwoText58({ left: '商品A', right: '10.00' }))
escNewLine()
escText(escTwoText58({ left: '商品B', right: '19.90' }))
escNewLine()

escJustification('center')
escQRCode({ content: 'https://example.com/order/10001', size: 6 })
addPrintAndFeedLines(3)
escCutPaper()

writeData((info) => {
  console.log('写入结果', info.complete, info.byteLength, info.chunkCount, info.msg)
})
```

## 发送原始 ESC/POS 字节

如果业务侧已经生成完整 ESC/POS 数据，可以直接调用 `printEsc`。

```ts
import { printEsc } from '@/uni_modules/yuntu-printer-uts'

printEsc({
  bytes: [0x1B, 0x40, 0x48, 0x65, 0x6C, 0x6C, 0x6F, 0x0A],
  chunkSize: 20,
  success() {
    console.log('原始指令发送成功')
  },
})
```

## 事件监听

```ts
import {
  onBlueStateChange,
  onConnectStateChange,
  onDataReceive,
} from '@/uni_modules/yuntu-printer-uts'

onBlueStateChange((on) => {
  console.log('蓝牙状态', on)
})

onConnectStateChange((payload) => {
  console.log('连接状态', payload.state, payload.deviceId, payload.errMsg)
})

onDataReceive((data) => {
  console.log('打印机返回数据', data)
})
```

连接状态 `state` 取值：

- `connectSuccess`：连接成功。
- `disconnect`：连接断开。
- `connectFail`：连接或写入失败。

## API 列表

### 推荐连接 API

| API | 说明 |
| --- | --- |
| `scanPrinters(options)` | 扫描 BLE 打印机，支持 `timeout`、`serviceUUIDs`。 |
| `stopScanPrinters(options)` | 停止 BLE 扫描。 |
| `connectPrinter(options)` | 连接 BLE 打印机或 Noryox 内置打印机。 |
| `connectNet(options)` | 通过 IP 和端口连接 Wi-Fi/TCP 打印机。 |
| `disconnectPrinter(options)` | 断开当前打印机连接。 |
| `getConnectedPrinter(options)` | 获取当前连接信息；未连接时返回空连接对象。 |
| `checkBuiltInPrinter(options)` | 检测 Android Noryox 内置打印服务是否可用。 |
| `printText(options)` | 按标题和多行文本快速打印小票。 |
| `printEsc(options)` | 直接发送原始 ESC/POS 字节数组。 |

### 事件 API

| API | 说明 |
| --- | --- |
| `onBlueStateChange(callback)` | 监听蓝牙是否可用或扫描是否发现设备。 |
| `onConnectStateChange(callback)` | 监听连接成功、断开、连接失败等状态。 |
| `onDataReceive(callback)` | 监听蓝牙、Wi-Fi 或 Noryox 服务返回的数据。 |

### ESC/POS 指令 API

| API | 说明 |
| --- | --- |
| `clearCommandBuffer()` | 清空当前 ESC/POS 指令缓冲区。 |
| `escInitializePrinter()` | 初始化打印机。 |
| `escJustification(position)` | 设置对齐方式，`left`、`center`、`right`。 |
| `escSetCharcterSize(size)` | 设置字符大小，支持 `1` 或 `2`。 |
| `escTurnEmphasizedMode(on)` | 开启或关闭加粗。 |
| `escText(text)` | 追加文本。 |
| `escNewLine()` | 追加换行。 |
| `addPrintAndFeedLines(lines)` | 打印并走纸指定行数。 |
| `escCutPaper()` | 追加切纸指令。 |
| `escQRCode({ content, size })` | 追加二维码指令。 |
| `escStringCommand(command)` | 追加字符串指令。 |
| `escBytesCommand(command)` | 追加字节数组指令。 |
| `writeData(callback)` | 发送当前缓冲区中的 ESC/POS 指令。 |

### 58mm 排版辅助 API

| API | 说明 |
| --- | --- |
| `escTwoText58({ left, right })` | 生成 58mm 二列文本。 |
| `escThreeText58({ left, middle, right })` | 生成 58mm 三列文本。 |
| `escFourText58({ one, two, three, four })` | 生成 58mm 四列文本。 |

### 兼容旧 API

以下 API 保留用于兼容旧调用方式，推荐新业务优先使用上面的 `scanPrinters`、`connectPrinter`、`disconnectPrinter` 等对象参数 API。

| API | 说明 |
| --- | --- |
| `scanBlue(callback)` | 扫描 BLE 打印机，并在发现设备时回调最新设备。 |
| `stopScanBlue()` | 停止 BLE 扫描。 |
| `connectBlue(deviceId)` | 按设备 ID 连接 BLE 打印机。 |
| `disconnect()` | 断开当前连接。 |
| `isConnect()` | 判断当前是否已连接。 |

## 类型说明

```ts
type PrinterConnectionType = 'bluetooth' | 'wifi' | 'noryox'
type ConnectState = 'connectSuccess' | 'disconnect' | 'connectFail'
type EscJustification = 'left' | 'center' | 'right'

type PrinterDevice = {
  deviceId: string
  name: string
  rssi: number
  serviceUUIDs: string[]
  type?: PrinterConnectionType
}

type PrinterConnection = {
  deviceId: string
  name: string
  serviceUUID: string
  writeCharacteristicUUID: string
  type?: PrinterConnectionType
  ip?: string
  port?: number
}

type PrinterError = {
  errCode: number
  errMsg: string
}
```

## 错误码

| 错误码 | 说明 |
| --- | --- |
| `1001` | 蓝牙不可用或未开启。 |
| `1002` | 蓝牙权限未授予。 |
| `1003` | 扫描失败。 |
| `1004` | 未找到设备。 |
| `1005` | 连接失败。 |
| `1006` | 未找到蓝牙服务。 |
| `1007` | 未找到可写特征值。 |
| `1008` | 打印机未连接。 |
| `1009` | 写入失败。 |
| `1010` | 打印数据为空或不合法。 |
| `1011` | 当前平台不支持。 |
| `1012` | 内置打印机不可用。 |
| `1013` | 内置打印服务绑定失败。 |
| `1014` | 内置打印服务未连接。 |

## 注意事项

- BLE 打印前请先完成系统权限申请，再调用 `scanPrinters`。
- iOS 连接蓝牙外设前通常需要先扫描，插件会根据扫描结果保存外设对象。
- Android 可通过设备 MAC 地址连接 BLE 打印机；iOS 使用 CoreBluetooth 外设 UUID。
- 默认写入特征 UUID 包含常见打印机特征：`0000ff02-0000-1000-8000-00805f9b34fb`、`0000ff01-0000-1000-8000-00805f9b34fb`、`49535343-8841-43f4-a8d4-ecbe34729bb3`。如打印机使用其他特征，请在 `connectPrinter` 中传入 `writeCharacteristicUUIDs`。
- 当前 `escText` 和 `escQRCode` 的内置编码以 ASCII 为主，非 ASCII 字符会按 `?` 处理；如需完整中文打印，建议业务侧根据目标打印机编码生成字节后使用 `printEsc` 或 `escBytesCommand`。
- `escImage` 当前接口已预留，但通用图片解码和光栅化未实现，直接调用会抛出错误；图片打印请先在业务侧生成打印机支持的 ESC/POS 光栅字节后通过 `printEsc` 发送。
- Wi-Fi 打印机需要手机和打印机在可访问的同一网络内，并确认打印机端口已开放。
- 可参考项目中的 `src/composables/usePrinter.ts` 和 `src/pages/printer/index.vue` 查看完整页面接入示例。

## 调试建议

- 原生插件必须编译进 App 运行时，调试时请使用自定义基座或正式 App 包。
- Android 增加或修改 AIDL、Manifest 后，请重新制作自定义基座。
- 先用 `getConnectedPrinter` 和 `onConnectStateChange` 确认连接状态，再发送打印数据。
- 打印无反应时，优先确认写入特征 UUID、打印机编码、打印机纸张状态和 ESC/POS 指令是否被目标机型支持。
- 设备验证流程可参考 `docs/printer-uts-plugin.md`。
