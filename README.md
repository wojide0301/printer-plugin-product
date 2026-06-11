# Yuntu Printer UTS

Android / iOS BLE 打印机 UTS 插件与 uni-app 验证工程。

本项目基于 Wot Starter 扩展，用于开发、调试和验证 `yuntu-printer-uts` 原生打印插件。插件面向 App 端蓝牙低功耗打印机，提供设备扫描、连接、断开、ESC/POS 指令构建、原始字节写入和文本小票打印能力。

## 功能特性

- 扫描附近 BLE 打印机设备
- 通过 `deviceId` 连接打印机
- 断开连接并查询当前连接设备
- 构建 GPrinter 兼容风格的 ESC/POS 指令
- 写入原始 ESC/POS 字节数据
- 通过语义化接口打印文本小票
- 提供 Android / iOS 真机验证页面
- 集成 Wot UI、Pinia、UnoCSS、Alova、Uni ECharts 等 uni-app 工程能力

## 平台支持

| 平台 | 状态 | 说明 |
| --- | --- | --- |
| Android App | 支持 | 通过 Android Bluetooth API 实现 BLE 扫描、连接和写入 |
| iOS App | 支持 | 通过 CoreBluetooth 实现 BLE 扫描、连接和写入 |
| H5 | 不支持插件能力 | H5 可用于页面开发，不能调用原生 UTS 蓝牙能力 |
| 小程序 | 不支持插件能力 | 当前插件面向 App 原生运行时 |

> 原生蓝牙能力需要编译进 App 运行时，Android 和 iOS 调试请使用自定义基座。

## 环境要求

- Node.js `>=20.19.0 || >=22.12.0 || >=24.0.0`
- pnpm `9.9.0`
- HBuilderX / uni-app App 真机调试环境
- Android 或 iOS 真机
- 支持 BLE 的 ESC/POS 打印机

## 快速开始

```bash
pnpm install
```

H5 开发预览：

```bash
pnpm dev:h5
```

Android App 开发：

```bash
pnpm dev:app-android
```

iOS App 开发：

```bash
pnpm dev:app-ios
```

构建 H5：

```bash
pnpm build:h5
```

构建 App：

```bash
pnpm build:app
```

## 打印插件使用示例

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
      title: 'YUNTU PRINTER',
      lines: ['Printer Plugin', 'Status OK'],
      feed: 3,
      cut: true,
    })
  },
})

disconnectPrinter({})
stopScanPrinters()
```

## 真机验证流程

1. 添加插件后构建 Android 或 iOS 自定义基座。
2. 将自定义基座安装到真机。
3. 打开应用并进入 `pages/printer/index`。
4. 点击 `扫描打印机`。
5. 授权蓝牙扫描、蓝牙连接等系统权限。
6. 在设备列表中选择 BLE 打印机并连接。
7. 点击 `语义打印` 或 `ESC打印`。
8. 确认打印机输出示例小票。

预期输出示例：

```text
YUNTU PRINTER
Printer Plugin
Time <current time>
Status OK
```

更完整的 Android / iOS QA 步骤见 [docs/printer-uts-plugin.md](./docs/printer-uts-plugin.md)。

## 目录结构

```text
.
├── src
│   ├── pages/printer/index.vue              # 打印插件验证页面
│   ├── composables/usePrinter.ts            # 页面侧打印状态与操作封装
│   ├── utils/printerEsc.ts                  # TypeScript ESC/POS 构建工具与测试目标
│   └── uni_modules/yuntu-printer-uts        # Android / iOS UTS 打印插件
├── docs/printer-uts-plugin.md               # 插件需求、兼容说明与真机 QA
├── vite.config.ts                           # uni-app / Wot UI / UnoCSS 插件配置
└── package.json                             # 项目脚本与依赖
```

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `pnpm dev:h5` | 启动 H5 开发服务 |
| `pnpm dev:app-android` | 运行 Android App 开发构建 |
| `pnpm dev:app-ios` | 运行 iOS App 开发构建 |
| `pnpm build:h5` | 构建 H5 产物 |
| `pnpm build:app` | 构建 App 产物 |
| `pnpm type-check` | 执行 TypeScript 类型检查 |
| `pnpm lint` | 执行 ESLint 检查 |
| `pnpm test` | 执行 Vitest 测试 |
| `pnpm commit` | 使用 git-cz 提交变更 |

## 权限说明

Android 端需要蓝牙扫描、蓝牙连接权限。旧版本 Android 的 BLE 扫描行为还可能需要定位权限。

iOS 端需要配置 `NSBluetoothAlwaysUsageDescription`，用于系统蓝牙权限弹窗说明。

项目内的 `usePrinter` 已封装 Android 权限申请提示，验证页面会在扫描前按系统版本申请必要权限。

## 已知限制

- 当前首版聚焦 BLE 打印机。
- Android 经典蓝牙 SPP 打印机需要单独的传输实现。
- 首版非 ASCII 文本会按 `?` 处理；中文打印需要结合目标打印机码页补充 GB18030 / GBK 编码验证。
- `escImage` 涉及平台图片解码，需在 UTS 侧结合目标平台能力实现和验证。

## 技术栈

- [uni-app](https://uniapp.dcloud.net.cn/)
- [UTS 插件](https://uniapp.dcloud.net.cn/plugin/uts-plugin.html)
- [Vue 3](https://vuejs.org/)
- [Vite](https://vitejs.dev/)
- [Wot UI](https://github.com/wot-ui/wot-ui)
- [@wot-ui/router](https://github.com/wot-ui/my-uni)
- [UnoCSS](https://unocss.dev/)
- [Pinia](https://pinia.vuejs.org/)
- [Alova](https://alova.js.org/)
- [Uni ECharts](https://uni-echarts.xiaohe.ink/)

## 鸣谢

本项目工程底座来自 [Wot Starter](https://github.com/wot-ui/wot-starter)，感谢 Wot UI、uni-helper、uni-ku 等生态项目提供的 uni-app 开发能力。

## 开源协议

[MIT](./LICENSE)
