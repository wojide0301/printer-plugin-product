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

## UTS Compatibility Notes

- UTS object literal types must be declared with `type`; do not use inline object literal types in function parameters.
- Android native callback implementations should use `class ... extends AndroidCallbackClass` instead of JavaScript-style `new Callback({ ... })` object literals.
- iOS delegate implementations should use `class ... implements Protocol` instead of JavaScript-style `new Delegate({ ... })` object literals.
- Shared UTS utilities avoid `Array.from`, array `map`/`forEach`/`reduce`, `Math.max`/`Math.min`, and string `repeat` to reduce cross-platform compiler differences.
- `String.charCodeAt` is nullable in UTS; always coalesce before numeric comparisons.

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

## Noryox NB55 Android QA

1. Build a custom Android base after adding the AIDL files and manifest `<queries>` entry.
2. Install the custom base on the Noryox NB55 device.
3. Confirm the system printer service is present:

```bash
adb shell "pm list packages | toybox grep -Ei 'com.incar.printerservice|printer'"
adb shell "service list | toybox grep -Ei 'printer|incar|nyx'"
```

4. Open `pages/printer/index`.
5. Tap `扫描打印机`.
6. Confirm the list shows `Noryox NB55 Built-in Printer` with value `内置`.
7. Tap the built-in printer row.
8. Tap `语义打印`.
9. Confirm the printer outputs:

```text
YUNTU PRINTER
Printer Plugin
Time <current time>
Status OK
```

10. Tap `ESC打印`.
11. Confirm it prints the ESC/POS sample.

## Known Limits

- BLE scanning supports BLE printers only.
- Noryox NB55 / Handheld_POS_V28 built-in printers use the system AIDL service `com.incar.printerservice`.
- Android classic Bluetooth SPP printers need a separate transport implementation.
- Non-ASCII text is encoded as `?` in the first pass; add GB18030/GBK encoding after validating target printer code page behavior on hardware.
