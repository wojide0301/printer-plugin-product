# Yuntu Printer UTS

Android / iOS 蓝牙与 Wi-Fi 打印机 UTS 插件与 uni-app 验证工程。

本项目用于开发、调试和验证 `yuntu-printer-uts` 原生打印插件。插件面向 App 端热敏打印机，支持 BLE 蓝牙、Wi-Fi/TCP 以及 Noryox 内置打印机，提供流式 ESC/POS 指令构建、语义化小票打印和 Promise 风格异步 API。

## 功能特性

- 扫描附近 BLE 打印机设备
- 通过 `deviceId` 连接 BLE 打印机
- 通过 IP + 端口连接 Wi-Fi/以太网打印机
- Noryox NB55 内置打印机支持（Android）
- 流式 ESC/POS 命令构建器（`createEscBuilder()`）
- 语义化小票打印（`printText()`）
- 直接发送原始 ESC/POS 字节（`printEsc()`）
- 连接状态事件监听
- 完整的命令测试页面（17 个测试用例覆盖所有 API）
- 集成 Wot UI、Pinia、UnoCSS 等 uni-app 工程能力

## 平台支持

| 平台 | 状态 | 说明 |
| --- | --- | --- |
| Android App | 支持 | BLE 蓝牙、Wi-Fi TCP Socket、Noryox AIDL 内置打印机 |
| iOS App | 支持 | BLE CoreBluetooth、Wi-Fi TCP Stream |
| H5 | 不支持插件能力 | 可用于页面开发，不能调用原生 UTS 打印能力 |
| 小程序 | 不支持插件能力 | 当前插件面向 App 原生运行时 |

## 环境要求

- Node.js `>=20.19.0 || >=22.12.0 || >=24.0.0`
- pnpm `9.9.0`
- HBuilderX / uni-app App 真机调试环境
- Android 或 iOS 真机
- 支持 BLE 或 Wi-Fi 的 ESC/POS 打印机

## 快速开始

```bash
pnpm install
```

H5 开发预览：

```bash
pnpm dev:h5
```

Android / iOS App 开发：

```bash
pnpm dev:app-android
pnpm dev:app-ios
```

## 打印插件使用示例

### BLE 打印

```ts
import {
  connectPrinter,
  createEscBuilder,
  disconnectPrinter,
  onConnectStateChange,
  sendEsc,
  printText,
  scanPrinters,
  stopScanPrinters,
} from '@/uni_modules/yuntu-printer-uts'

// 扫描
const { devices } = await scanPrinters({ timeout: 10000 })

// 监听连接状态
onConnectStateChange(({ state, deviceId, errMsg }) => {
  console.log(state, deviceId)
})

// 连接
await connectPrinter({ deviceId: devices[0].deviceId })

// 语义化打印
await printText({
  title: 'YUNTU PRINTER',
  lines: ['Printer Plugin', 'Status OK'],
  feed: 3,
  cut: true,
})

// 流式 ESC/POS 命令
const esc = createEscBuilder()
esc.clearCommandBuffer()
esc.escInitializePrinter()
esc.escJustification('center')
esc.escText('YUNTU PRINTER')
esc.escNewLine()
esc.escJustification('left')
esc.escText('Item 10.00')
esc.escNewLine()
esc.addPrintAndFeedLines(3)
esc.escCutPaper()
await sendEsc(esc)

// 断开
await disconnectPrinter()
stopScanPrinters()
```

### Wi-Fi 打印

```ts
import { connectWifi, disconnectPrinter, printText } from '@/uni_modules/yuntu-printer-uts'

await connectWifi({ ip: '192.168.100.110', port: 8000 })
await printText({ title: 'Wi-Fi Printer', lines: ['TCP Print OK'], feed: 3, cut: true })
await disconnectPrinter()
```

### Noryox 内置打印机

```ts
import {
  checkBuiltInPrinter,
  connectPrinter,
  printBuiltInBarcode,
  printBuiltInText,
} from '@/uni_modules/yuntu-printer-uts'

const { available, device } = await checkBuiltInPrinter()
if (available && device) {
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
}
```

## 真机验证流程

### BLE 验证

1. 构建 Android 或 iOS 自定义基座。
2. 安装到真机，进入 `pages/printer/index`。
3. 点击「扫描打印机」→ 授权蓝牙权限。
4. 选择 BLE 打印机并连接。
5. 点击「语义打印」或「ESC打印」确认输出。
6. 进入「打印命令测试」页面逐个验证 17 条命令。

### Wi-Fi 验证

1. 确认手机和 Wi-Fi 打印机在同一局域网。
2. 切换通信方式为「Wi-Fi」，输入 IP 和端口。
3. 点击「连接 Wi-Fi」。
4. 点击打印按钮确认输出。
5. 点击「断开连接」验证重连。

预期输出：

```text
YUNTU PRINTER
Printer Plugin
Time <current time>
Status OK
```

## 目录结构

```text
.
├── src
│   ├── pages/printer/index.vue              # 主验证页面（扫描/连接/打印）
│   ├── pages/printer/commands.vue           # 打印命令测试页面（17 个测试用例）
│   ├── composables/usePrinter.ts            # 打印机状态与操作封装
│   ├── utils/printerCommandTests.ts         # 打印命令测试定义
│   ├── utils/printerEsc.ts                  # TypeScript ESC/POS 工具（纯 TS 测试）
│   └── uni_modules/yuntu-printer-uts        # Android / iOS UTS 打印插件
├── vite.config.ts                           # uni-app / Wot UI / UnoCSS 配置
└── package.json
```

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `pnpm dev:h5` | 启动 H5 开发服务 |
| `pnpm dev:app-android` | 运行 Android App 开发构建 |
| `pnpm dev:app-ios` | 运行 iOS App 开发构建 |
| `pnpm build:h5` | 构建 H5 产物 |
| `pnpm build:app` | 构建 App 产物 |
| `pnpm type-check` | TypeScript 类型检查 |
| `pnpm lint` | ESLint 检查 |
| `pnpm test` | Vitest 测试（22 个用例） |
| `pnpm commit` | 使用 git-cz 提交 |

## 权限说明

Android 需要 `BLUETOOTH_SCAN`、`BLUETOOTH_CONNECT`（Android 12+）或 `ACCESS_FINE_LOCATION`（旧版本）。Wi-Fi 需要 `INTERNET`。

iOS 需要 `NSBluetoothAlwaysUsageDescription`、`NSLocalNetworkUsageDescription`。

项目内 `usePrinter` 已封装 Android 蓝牙权限申请。

## 已知限制

- Wi-Fi 打印需手动输入 IP + 端口，暂不提供局域网自动发现。
- 非 ASCII 字符会按 `?` 处理；中文打印需结合目标打印机码页通过 `printEsc` 发送编码字节。
- 原生 UTS 能力需自定义基座验证，H5 只能验证页面交互。

## 技术栈

- [uni-app](https://uniapp.dcloud.net.cn/) / [UTS 插件](https://uniapp.dcloud.net.cn/plugin/uts-plugin.html)
- [Vue 3](https://vuejs.org/) / [Vite](https://vitejs.dev/)
- [Wot UI](https://github.com/wot-ui/wot-ui)
- [UnoCSS](https://unocss.dev/)
- [Vitest](https://vitest.dev/)

## 鸣谢

工程底座来自 [Wot Starter](https://github.com/wot-ui/wot-starter)。

## 开源协议

[MIT](./LICENSE)
