# Yuntu Printer UTS

Android and iOS BLE and Wi-Fi printer plugin for uni-app.

## Features

- Scan BLE printers.
- Connect by device id.
- Connect Wi-Fi printers by IP and port.
- Build GPrinter-compatible ESC/POS command buffers.
- Write raw ESC/POS bytes.
- Print text receipt payloads through ESC/POS.
- Disconnect and query connected printer.

## Platform

- Android App: BLE through Android Bluetooth APIs and Wi-Fi through TCP sockets.
- iOS App: BLE through CoreBluetooth and Wi-Fi through TCP streams.
- H5 and mini programs are not supported by this UTS plugin.

## Permissions

Android requires Bluetooth scan/connect permissions and location permission for older Android BLE scanning behavior. Wi-Fi printing requires network access permissions.

iOS requires `NSBluetoothAlwaysUsageDescription`. Wi-Fi printing may require `NSLocalNetworkUsageDescription`.

## Noryox NB55 Built-In Printer

On Noryox NB55 / Handheld_POS_V28 Android devices, the internal printer is not a Bluetooth peripheral. It is exposed through the system AIDL service:

- package: `com.incar.printerservice`
- action: `com.incar.printerservice.IPrinterService`
- selected device id: `noryox:built-in`

The Android implementation binds this service and sends existing ESC/POS bytes through `printEscposData(byte[])`.

After adding or changing Android AIDL / manifest files, rebuild the custom Android base before testing on the device.

## Basic Usage

```ts
import {
  connectNet,
  connectPrinter,
  disconnectPrinter,
  isConnect,
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

## Wi-Fi Usage

```ts
import { connectNet, disconnect, isConnect, writeData } from '@/uni_modules/yuntu-printer-uts'

connectNet({
  ip: '192.168.100.110',
  port: '8000',
  success(res) {
    console.log('connected', res.deviceId)
  },
})

console.log(isConnect())

// Build ESC/POS commands first, then send the command buffer.
writeData((info) => {
  console.log(`writeData complete: ${info.complete}, msg: ${info.msg}`)
})

disconnect()
```

## QA

See `docs/printer-uts-plugin.md` for Android and iOS device verification steps.

## Debugging

Use a custom base for iOS and Android after adding this plugin, because native Bluetooth code must be compiled into the App runtime.
