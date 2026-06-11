# Yuntu Printer UTS

Android and iOS BLE printer plugin for uni-app.

## Features

- Scan BLE printers.
- Connect by device id.
- Build GPrinter-compatible ESC/POS command buffers.
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
      title: 'YUNTU',
      lines: ['Printer Plugin', 'OK'],
      feed: 3,
      cut: true,
    })
  },
})

disconnectPrinter({})
stopScanPrinters()
```

## QA

See `docs/printer-uts-plugin.md` for Android and iOS device verification steps.

## Debugging

Use a custom base for iOS and Android after adding this plugin, because native Bluetooth code must be compiled into the App runtime.
