# Noryox NB55 Printer Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Android built-in printer support for Noryox NB55 / Handheld_POS_V28 devices while keeping the existing BLE printer implementation working.

**Architecture:** The Noryox SDK uses Android AIDL to bind the system printer service `com.incar.printerservice` with action `com.incar.printerservice.IPrinterService`. Keep the existing BLE GATT transport for external printers, add a Noryox AIDL transport for the built-in printer, and route existing ESC/POS byte output through `IPrinterService.printEscposData(byte[])` when the built-in printer is selected.

**Tech Stack:** uni-app Vue 3, UTS Android, Android AIDL, Android bound service, Noryox `printer-client` branch `a13`, existing ESC/POS builder, Vitest.

---

## Source Findings

- Device properties from ADB identify the target as:
  - manufacturer: `Tongliang Intelligent`
  - brand: `Noryox`
  - model: `NB55`
  - build display id: `Handheld_POS_V28_15052026`
- SDK repository checked: `https://gitee.com/noryox/printer-client/tree/a13`
- SDK integration mode: AIDL, not Bluetooth.
- Service package: `com.incar.printerservice`
- Service action: `com.incar.printerservice.IPrinterService`
- Main AIDL interface: `app/src/main/aidl/net/nyx/printerservice/print/IPrinterService.aidl`
- Required parcelable:
  - `app/src/main/aidl/net/nyx/printerservice/print/PrintTextFormat.aidl`
  - `app/src/main/java/net/nyx/printerservice/print/PrintTextFormat.java`
- Best first print API for this project: `byte[] printEscposData(in byte[] cmd)`, because `src/uni_modules/yuntu-printer-uts/utssdk/common/esc.uts` already builds ESC/POS bytes.
- Noryox README notes `printEscposData` is asynchronous for normal print queueing, and supports response commands such as `GS r` from PrinterService v1.9.6 onward.
- Android 11+ package visibility requires a manifest `<queries>` entry for `com.incar.printerservice`.
- DCloud UTS Android docs say UTS plugins compile into Android lib modules, `utssdk/app-android/AndroidManifest.xml` follows normal Android manifest rules, and Android native config changes require rebuilding the custom base.

## File Structure

- Modify: `src/uni_modules/yuntu-printer-uts/utssdk/interface.uts`
  - Add transport metadata and built-in printer detection API types.
- Modify: `src/uni_modules/yuntu-printer-uts/utssdk/unierror.uts`
  - Add service unavailable and built-in printer error codes.
- Modify: `src/uni_modules/yuntu-printer-uts/utssdk/app-android/AndroidManifest.xml`
  - Add Noryox printer service package visibility.
- Create: `src/uni_modules/yuntu-printer-uts/utssdk/app-android/aidl/net/nyx/printerservice/print/IPrinterService.aidl`
  - Copy from Noryox SDK branch `a13`.
- Create: `src/uni_modules/yuntu-printer-uts/utssdk/app-android/aidl/net/nyx/printerservice/print/PrintTextFormat.aidl`
  - Copy from Noryox SDK branch `a13`.
- Create: `src/uni_modules/yuntu-printer-uts/utssdk/app-android/java/net/nyx/printerservice/print/PrintTextFormat.java`
  - Copy from Noryox SDK branch `a13`.
- Modify: `src/uni_modules/yuntu-printer-uts/utssdk/app-android/index.uts`
  - Add Noryox service binding, built-in device detection, Noryox connection branch, and Noryox write branch.
- Modify: `src/composables/usePrinter.ts`
  - Prefer built-in Noryox detection on Android before requesting Bluetooth permissions.
- Modify: `src/composables/usePrinter.test.ts`
  - Cover built-in printer detection path and BLE fallback path.
- Modify: `src/pages/printer/index.vue`
  - Show transport label so the user can distinguish built-in printer from BLE printers.
- Modify: `src/uni_modules/yuntu-printer-uts/README.md`
  - Document NB55 built-in printer support and custom base requirement.
- Modify: `docs/printer-uts-plugin.md`
  - Add Noryox NB55 QA steps.

## Integration Decisions

1. Use one logical device id for the internal printer:

```ts
const NORYOX_BUILT_IN_DEVICE_ID = 'noryox:built-in'
```

2. Extend device metadata without breaking existing callers:

```ts
export type PrinterTransport = 'ble' | 'noryox'

export type PrinterDevice = {
  deviceId: string
  name: string
  rssi: number
  serviceUUIDs: string[]
  transport?: PrinterTransport
}
```

3. Keep existing `scanPrinters`, `connectPrinter`, `printText`, `writeData` names. They route by device id or connection transport.

4. Add built-in detection API so page code does not need Bluetooth permission to show NB55 internal printer:

```ts
export type CheckBuiltInPrinterSuccess = {
  available: boolean
  device?: PrinterDevice
}

export type CheckBuiltInPrinterOptions = {
  success?: (res: CheckBuiltInPrinterSuccess) => void
  fail?: (err: PrinterError) => void
  complete?: () => void
}

export type CheckBuiltInPrinter = (options: CheckBuiltInPrinterOptions) => void
```

5. Only use Android AIDL on Android. Keep iOS unchanged.

---

### Task 1: Copy Noryox AIDL Contracts Into The UTS Android Module

**Files:**
- Create: `src/uni_modules/yuntu-printer-uts/utssdk/app-android/aidl/net/nyx/printerservice/print/IPrinterService.aidl`
- Create: `src/uni_modules/yuntu-printer-uts/utssdk/app-android/aidl/net/nyx/printerservice/print/PrintTextFormat.aidl`
- Create: `src/uni_modules/yuntu-printer-uts/utssdk/app-android/java/net/nyx/printerservice/print/PrintTextFormat.java`
- Modify: `src/uni_modules/yuntu-printer-uts/utssdk/app-android/AndroidManifest.xml`

- [ ] **Step 1: Copy AIDL interface from SDK**

Run:

```bash
mkdir -p src/uni_modules/yuntu-printer-uts/utssdk/app-android/aidl/net/nyx/printerservice/print
cp /private/tmp/noryox-printer-client-a13/app/src/main/aidl/net/nyx/printerservice/print/IPrinterService.aidl src/uni_modules/yuntu-printer-uts/utssdk/app-android/aidl/net/nyx/printerservice/print/IPrinterService.aidl
cp /private/tmp/noryox-printer-client-a13/app/src/main/aidl/net/nyx/printerservice/print/PrintTextFormat.aidl src/uni_modules/yuntu-printer-uts/utssdk/app-android/aidl/net/nyx/printerservice/print/PrintTextFormat.aidl
```

Expected:

```text
src/uni_modules/yuntu-printer-uts/utssdk/app-android/aidl/net/nyx/printerservice/print/IPrinterService.aidl
src/uni_modules/yuntu-printer-uts/utssdk/app-android/aidl/net/nyx/printerservice/print/PrintTextFormat.aidl
```

- [ ] **Step 2: Copy parcelable Java class from SDK**

Run:

```bash
mkdir -p src/uni_modules/yuntu-printer-uts/utssdk/app-android/java/net/nyx/printerservice/print
cp /private/tmp/noryox-printer-client-a13/app/src/main/java/net/nyx/printerservice/print/PrintTextFormat.java src/uni_modules/yuntu-printer-uts/utssdk/app-android/java/net/nyx/printerservice/print/PrintTextFormat.java
```

Expected:

```text
src/uni_modules/yuntu-printer-uts/utssdk/app-android/java/net/nyx/printerservice/print/PrintTextFormat.java
```

- [ ] **Step 3: Add Android package visibility**

Modify `src/uni_modules/yuntu-printer-uts/utssdk/app-android/AndroidManifest.xml` to:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
  <uses-permission android:name="android.permission.BLUETOOTH" android:maxSdkVersion="30" />
  <uses-permission android:name="android.permission.BLUETOOTH_ADMIN" android:maxSdkVersion="30" />
  <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" android:maxSdkVersion="30" />
  <uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
  <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />

  <queries>
    <package android:name="com.incar.printerservice" />
  </queries>

  <uses-feature android:name="android.hardware.bluetooth_le" android:required="false" />
</manifest>
```

- [ ] **Step 4: Run a compile check**

Run:

```bash
pnpm build:app-android
```

Expected:

```text
Build should reach Android/UTS compilation without unresolved net.nyx.printerservice.print symbols.
```

If this fails because the UTS Android lib module does not compile `aidl/` sources, use the fallback in Task 1 Step 5.

- [ ] **Step 5: Fallback only if AIDL source compilation fails**

Create a tiny Android library from the Noryox `aidl` and `PrintTextFormat.java`, build an AAR, then place it here:

```text
src/uni_modules/yuntu-printer-uts/utssdk/app-android/libs/noryox-printer-aidl.aar
```

Create `src/uni_modules/yuntu-printer-uts/utssdk/app-android/config.json`:

```json
{
  "dependencies": []
}
```

The AAR must expose these classes:

```text
net.nyx.printerservice.print.IPrinterService
net.nyx.printerservice.print.PrintTextFormat
```

Run:

```bash
pnpm build:app-android
```

Expected:

```text
Build should resolve net.nyx.printerservice.print.IPrinterService from the local AAR.
```

### Task 2: Extend Shared Plugin Types

**Files:**
- Modify: `src/uni_modules/yuntu-printer-uts/utssdk/interface.uts`
- Modify: `src/uni_modules/yuntu-printer-uts/utssdk/unierror.uts`

- [ ] **Step 1: Add transport and built-in check types**

Modify `src/uni_modules/yuntu-printer-uts/utssdk/interface.uts` near the top:

```ts
export type PrinterTransport = 'ble' | 'noryox'
export type ConnectState = 'connectSuccess' | 'disconnect' | 'connectFail'
export type EscJustification = 'left' | 'center' | 'right'

export type PrinterDevice = {
  deviceId: string
  name: string
  rssi: number
  serviceUUIDs: string[]
  transport?: PrinterTransport
}
```

Add after `GetConnectedPrinterOptions`:

```ts
export type CheckBuiltInPrinterSuccess = {
  available: boolean
  device?: PrinterDevice
}

export type CheckBuiltInPrinterOptions = {
  success?: (res: CheckBuiltInPrinterSuccess) => void
  fail?: (err: PrinterError) => void
  complete?: () => void
}
```

Add near exported function types:

```ts
export type CheckBuiltInPrinter = (options: CheckBuiltInPrinterOptions) => void
```

- [ ] **Step 2: Add Noryox error codes**

Modify `src/uni_modules/yuntu-printer-uts/utssdk/unierror.uts`:

```ts
export const PRINTER_ERROR_BUILT_IN_UNAVAILABLE = 1012
export const PRINTER_ERROR_SERVICE_BIND_FAILED = 1013
export const PRINTER_ERROR_SERVICE_NOT_CONNECTED = 1014
```

- [ ] **Step 3: Run type checks**

Run:

```bash
pnpm type-check
```

Expected:

```text
No TypeScript errors from the changed UTS interface declarations.
```

### Task 3: Add Noryox AIDL Transport In Android UTS

**Files:**
- Modify: `src/uni_modules/yuntu-printer-uts/utssdk/app-android/index.uts`

- [ ] **Step 1: Add Android and Noryox imports**

At the top of `src/uni_modules/yuntu-printer-uts/utssdk/app-android/index.uts`, extend imports:

```ts
import { ComponentName, Context, Intent, ServiceConnection } from 'android.content'
import { IBinder } from 'android.os'
import { IPrinterService } from 'net.nyx.printerservice.print'
```

Keep existing Android imports and merge duplicate `Context` / `Build` / `Handler` imports instead of adding a second import line for the same package.

- [ ] **Step 2: Extend imported plugin types and errors**

Add these types to the existing type import:

```ts
CheckBuiltInPrinter,
CheckBuiltInPrinterOptions,
PrinterTransport,
```

Add these errors to the existing error import:

```ts
PRINTER_ERROR_BUILT_IN_UNAVAILABLE,
PRINTER_ERROR_SERVICE_BIND_FAILED,
PRINTER_ERROR_SERVICE_NOT_CONNECTED,
```

- [ ] **Step 3: Add Noryox constants and state**

Add after `DEFAULT_WRITE_CHARACTERISTIC_UUIDS`:

```ts
const NORYOX_PACKAGE_NAME = 'com.incar.printerservice'
const NORYOX_SERVICE_ACTION = 'com.incar.printerservice.IPrinterService'
const NORYOX_BUILT_IN_DEVICE_ID = 'noryox:built-in'
const NORYOX_SERVICE_UUID = 'noryox-aidl'
const NORYOX_WRITE_CHARACTERISTIC_UUID = 'printEscposData'
```

Add after the existing global connection state:

```ts
let noryoxPrinterService: IPrinterService | null = null
let noryoxServiceBound = false
let pendingNoryoxConnectOptions: ConnectPrinterOptions | null = null
let pendingNoryoxCompleteTimer: Handler | null = null
```

- [ ] **Step 4: Add helper functions**

Add below `createEmptyConnection()`:

```ts
function createNoryoxDevice(): PrinterDevice {
  return {
    deviceId: NORYOX_BUILT_IN_DEVICE_ID,
    name: 'Noryox NB55 Built-in Printer',
    rssi: 0,
    serviceUUIDs: [NORYOX_SERVICE_UUID],
    transport: 'noryox',
  }
}

function createNoryoxConnection(): PrinterConnection {
  return {
    deviceId: NORYOX_BUILT_IN_DEVICE_ID,
    name: 'Noryox NB55 Built-in Printer',
    serviceUUID: NORYOX_SERVICE_UUID,
    writeCharacteristicUUID: NORYOX_WRITE_CHARACTERISTIC_UUID,
  }
}

function isNoryoxDeviceId(deviceId: string): boolean {
  return deviceId == NORYOX_BUILT_IN_DEVICE_ID
}

function isNoryoxConnected(): boolean {
  return connectedPrinter != null && connectedPrinter!.deviceId == NORYOX_BUILT_IN_DEVICE_ID && noryoxPrinterService != null
}

function isPackageInstalled(packageName: string): boolean {
  const context = getContext()
  if (context == null) {
    return false
  }
  try {
    context.getPackageManager().getPackageInfo(packageName, 0)
    return true
  }
  catch (_error) {
    return false
  }
}

function createNoryoxIntent(): Intent {
  const intent = new Intent()
  intent.setPackage(NORYOX_PACKAGE_NAME)
  intent.setAction(NORYOX_SERVICE_ACTION)
  return intent
}
```

- [ ] **Step 5: Add service connection class**

Add below helper functions:

```ts
class NoryoxPrinterServiceConnection implements ServiceConnection {
  override onServiceConnected(name: ComponentName, service: IBinder) {
    noryoxPrinterService = IPrinterService.Stub.asInterface(service)
    noryoxServiceBound = true
    connectedPrinter = createNoryoxConnection()
    const options = pendingNoryoxConnectOptions
    pendingNoryoxConnectOptions = null
    if (options != null) {
      emitConnectState('connectSuccess', NORYOX_BUILT_IN_DEVICE_ID, '')
      options.success?.(connectedPrinter!)
      runComplete(options.complete ?? null)
    }
  }

  override onServiceDisconnected(_name: ComponentName) {
    noryoxPrinterService = null
    noryoxServiceBound = false
    if (connectedPrinter != null && connectedPrinter!.deviceId == NORYOX_BUILT_IN_DEVICE_ID) {
      connectedPrinter = null
      emitConnectState('disconnect', NORYOX_BUILT_IN_DEVICE_ID, '')
    }
  }
}

const noryoxServiceConnection = new NoryoxPrinterServiceConnection()
```

- [ ] **Step 6: Add bind and unbind helpers**

Add below `noryoxServiceConnection`:

```ts
function bindNoryoxPrinter(options: ConnectPrinterOptions) {
  const context = getContext()
  if (context == null) {
    options.fail?.(createPrinterError(PRINTER_ERROR_BUILT_IN_UNAVAILABLE, 'Android context is unavailable.'))
    runComplete(options.complete ?? null)
    return
  }

  if (!isPackageInstalled(NORYOX_PACKAGE_NAME)) {
    options.fail?.(createPrinterError(PRINTER_ERROR_BUILT_IN_UNAVAILABLE, 'Noryox printer service is not installed.'))
    runComplete(options.complete ?? null)
    return
  }

  if (noryoxPrinterService != null) {
    connectedPrinter = createNoryoxConnection()
    emitConnectState('connectSuccess', NORYOX_BUILT_IN_DEVICE_ID, '')
    options.success?.(connectedPrinter!)
    runComplete(options.complete ?? null)
    return
  }

  pendingNoryoxConnectOptions = options
  const bound = context.bindService(createNoryoxIntent(), noryoxServiceConnection, Context.BIND_AUTO_CREATE)
  if (!bound) {
    pendingNoryoxConnectOptions = null
    options.fail?.(createPrinterError(PRINTER_ERROR_SERVICE_BIND_FAILED, 'Failed to bind Noryox printer service.'))
    runComplete(options.complete ?? null)
  }
}

function unbindNoryoxPrinter() {
  const context = getContext()
  if (context != null && noryoxServiceBound) {
    context.unbindService(noryoxServiceConnection)
  }
  noryoxPrinterService = null
  noryoxServiceBound = false
}
```

- [ ] **Step 7: Export built-in printer detection**

Add before `scanPrinters`:

```ts
export const checkBuiltInPrinter: CheckBuiltInPrinter = function (options: CheckBuiltInPrinterOptions) {
  if (isPackageInstalled(NORYOX_PACKAGE_NAME)) {
    options.success?.({
      available: true,
      device: createNoryoxDevice(),
    })
  }
  else {
    options.success?.({
      available: false,
    })
  }
  runComplete(options.complete ?? null)
}
```

- [ ] **Step 8: Route connectPrinter to Noryox when selected**

At the start of `connectPrinter`, before Bluetooth adapter lookup:

```ts
  if (isNoryoxDeviceId(options.deviceId)) {
    bindNoryoxPrinter(options)
    return
  }
```

- [ ] **Step 9: Route disconnectPrinter for Noryox**

At the start of `disconnectPrinter`:

```ts
  if (connectedPrinter != null && connectedPrinter!.deviceId == NORYOX_BUILT_IN_DEVICE_ID) {
    unbindNoryoxPrinter()
    connectedPrinter = null
    emitConnectState('disconnect', NORYOX_BUILT_IN_DEVICE_ID, '')
    options.success?.()
    runComplete(options.complete ?? null)
    return
  }
```

- [ ] **Step 10: Route writeBytes to Noryox printEscposData**

At the start of `writeBytes`:

```ts
  if (connectedPrinter != null && connectedPrinter!.deviceId == NORYOX_BUILT_IN_DEVICE_ID) {
    if (noryoxPrinterService == null) {
      fail('Noryox printer service is not connected.')
      return
    }
    try {
      noryoxPrinterService!.printEscposData(bytesToNative(bytes))
      success()
      return
    }
    catch (_error) {
      fail('Failed to write ESC/POS data to Noryox printer service.')
      return
    }
  }
```

- [ ] **Step 11: Keep scanPrinters BLE-only**

Do not add Noryox into `scanPrinters`. Built-in detection is explicit through `checkBuiltInPrinter`. This prevents Bluetooth permission prompts from blocking the built-in printer flow.

- [ ] **Step 12: Run Android build**

Run:

```bash
pnpm build:app-android
```

Expected:

```text
No unresolved Android, AIDL, or UTS symbols.
```

### Task 4: Prefer Built-In Printer In The Vue Composable

**Files:**
- Modify: `src/composables/usePrinter.ts`
- Modify: `src/composables/usePrinter.test.ts`

- [ ] **Step 1: Import the new built-in detection API**

Modify the plugin import in `src/composables/usePrinter.ts`:

```ts
import {
  addPrintAndFeedLines,
  checkBuiltInPrinter,
  clearCommandBuffer,
  connectPrinter,
  disconnectPrinter,
  escCutPaper,
  escInitializePrinter,
  escNewLine,
  escText,
  getConnectedPrinter,
  onConnectStateChange,
  printText,
  scanPrinters,
  stopScanPrinters,
  writeData,
} from '@/uni_modules/yuntu-printer-uts'
```

- [ ] **Step 2: Extend view model transport metadata**

Modify `PrinterDeviceView`:

```ts
export interface PrinterDeviceView {
  deviceId: string
  name: string
  rssi: number
  serviceUUIDs: string[]
  transport?: 'ble' | 'noryox'
}
```

- [ ] **Step 3: Add built-in detection helper**

Add inside `usePrinter()` before `scan()`:

```ts
  function detectBuiltInPrinter() {
    return new Promise<PrinterDeviceView | null>((resolve) => {
      const systemInfo = uni.getSystemInfoSync()
      if (systemInfo.uniPlatform !== 'app' || systemInfo.platform !== 'android') {
        resolve(null)
        return
      }

      checkBuiltInPrinter({
        success(res) {
          resolve(res.available && res.device ? res.device : null)
        },
        fail() {
          resolve(null)
        },
      })
    })
  }
```

- [ ] **Step 4: Prefer Noryox built-in device before BLE permission**

Replace `scan()` with:

```ts
  async function scan() {
    loading.value = true
    devices.value = []

    const builtInPrinter = await detectBuiltInPrinter()
    if (builtInPrinter) {
      devices.value = [builtInPrinter]
      lastEvent.value = '发现内置打印机'
      loading.value = false
      return
    }

    const hasPermission = await ensureBluetoothPermission()
    if (!hasPermission) {
      loading.value = false
      return
    }

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
```

- [ ] **Step 5: Fix existing error logging typo**

Replace:

```ts
    console.log(errMsg)
```

with:

```ts
    console.log(err.errMsg)
```

- [ ] **Step 6: Update tests for built-in detection**

Modify `src/composables/usePrinter.test.ts` mock:

```ts
const checkBuiltInPrinter = vi.fn()
const requestAndroidPermission = vi.fn()
const scanPrinters = vi.fn()

vi.mock('@/uni_modules/yuntu-printer-uts', () => ({
  addPrintAndFeedLines: vi.fn(),
  checkBuiltInPrinter,
  clearCommandBuffer: vi.fn(),
  connectPrinter: vi.fn(),
  disconnectPrinter: vi.fn(),
  escCutPaper: vi.fn(),
  escInitializePrinter: vi.fn(),
  escNewLine: vi.fn(),
  escText: vi.fn(),
  getConnectedPrinter: vi.fn(),
  onConnectStateChange: vi.fn(),
  printText: vi.fn(),
  scanPrinters,
  stopScanPrinters: vi.fn(),
  writeData: vi.fn(),
}))
```

In `beforeEach`, default built-in detection to unavailable:

```ts
    checkBuiltInPrinter.mockImplementation(({ success }) => {
      success({ available: false })
    })
```

Add test:

```ts
  it('uses the Noryox built-in printer without requesting bluetooth permission', async () => {
    checkBuiltInPrinter.mockImplementation(({ success }) => {
      success({
        available: true,
        device: {
          deviceId: 'noryox:built-in',
          name: 'Noryox NB55 Built-in Printer',
          rssi: 0,
          serviceUUIDs: ['noryox-aidl'],
          transport: 'noryox',
        },
      })
    })

    const { usePrinter } = await import('./usePrinter')
    const printer = usePrinter()

    await printer.scan()

    expect(requestAndroidPermission).not.toHaveBeenCalled()
    expect(scanPrinters).not.toHaveBeenCalled()
    expect(printer.devices.value).toEqual([
      {
        deviceId: 'noryox:built-in',
        name: 'Noryox NB55 Built-in Printer',
        rssi: 0,
        serviceUUIDs: ['noryox-aidl'],
        transport: 'noryox',
      },
    ])
    expect(printer.lastEvent.value).toBe('发现内置打印机')
  })
```

- [ ] **Step 7: Run composable tests**

Run:

```bash
pnpm test src/composables/usePrinter.test.ts
```

Expected:

```text
3 tests pass.
```

### Task 5: Show Transport Clearly On The Printer Page

**Files:**
- Modify: `src/pages/printer/index.vue`

- [ ] **Step 1: Add a small transport label helper**

Add in `<script setup>` after `onMounted`:

```ts
function getDeviceValue(device: { transport?: string, rssi: number }) {
  if (device.transport === 'noryox') {
    return '内置'
  }
  return `RSSI ${device.rssi}`
}
```

- [ ] **Step 2: Use the helper in the device list**

Replace:

```vue
:value="`RSSI ${device.rssi}`"
```

with:

```vue
:value="getDeviceValue(device)"
```

- [ ] **Step 3: Run type check**

Run:

```bash
pnpm type-check
```

Expected:

```text
No Vue or TypeScript errors.
```

### Task 6: Document Noryox NB55 Support And QA

**Files:**
- Modify: `src/uni_modules/yuntu-printer-uts/README.md`
- Modify: `docs/printer-uts-plugin.md`

- [ ] **Step 1: Update plugin README platform section**

Add to `src/uni_modules/yuntu-printer-uts/README.md`:

```md
## Noryox NB55 Built-In Printer

On Noryox NB55 / Handheld_POS_V28 Android devices, the internal printer is not a Bluetooth peripheral. It is exposed through the system AIDL service:

- package: `com.incar.printerservice`
- action: `com.incar.printerservice.IPrinterService`
- selected device id: `noryox:built-in`

The Android implementation binds this service and sends existing ESC/POS bytes through `printEscposData(byte[])`.

After adding or changing Android AIDL / manifest files, rebuild the custom Android base before testing on the device.
```

- [ ] **Step 2: Add Noryox QA steps**

Add to `docs/printer-uts-plugin.md` before `Known Limits`:

```md
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
```

- [ ] **Step 3: Run markdown lint if configured**

Run:

```bash
pnpm lint:docs
```

Expected:

```text
No lint errors from modified docs.
```

### Task 7: Build And Device Verification

**Files:**
- No code changes after this task unless verification reveals a concrete defect.

- [ ] **Step 1: Run unit tests**

Run:

```bash
pnpm test src/composables/usePrinter.test.ts src/utils/printerEsc.test.ts
```

Expected:

```text
All selected tests pass.
```

- [ ] **Step 2: Run type check**

Run:

```bash
pnpm type-check
```

Expected:

```text
No TypeScript errors.
```

- [ ] **Step 3: Build Android custom base/app**

Run:

```bash
pnpm build:app-android
```

Expected:

```text
Android build succeeds with AIDL-generated IPrinterService available to UTS.
```

- [ ] **Step 4: Verify service on device**

Run with NB55 connected:

```bash
adb shell getprop ro.product.manufacturer
adb shell getprop ro.product.brand
adb shell getprop ro.product.model
adb shell "pm list packages | toybox grep -Ei 'com.incar.printerservice|printer'"
```

Expected:

```text
Tongliang Intelligent
Noryox
NB55
package:com.incar.printerservice
```

- [ ] **Step 5: Manual print verification**

On the NB55:

```text
Open app -> Printer tab -> 扫描打印机 -> select Noryox NB55 Built-in Printer -> 语义打印 -> ESC打印
```

Expected:

```text
Both buttons print to the built-in thermal printer without Bluetooth scanning or Bluetooth permission prompts.
```

## Risk Notes

- If `aidl/` source files are not picked up by the UTS Android module, package the AIDL and `PrintTextFormat.java` as a small local AAR and place it in `utssdk/app-android/libs`.
- If `bindService` returns false even though the package exists, inspect the service action on the device with:

```bash
adb shell dumpsys package com.incar.printerservice
```

The expected action from the SDK is:

```text
com.incar.printerservice.IPrinterService
```

- The SDK example uses `QUERY_ALL_PACKAGES`, but this plan starts with a narrower `<queries>` entry. Add `QUERY_ALL_PACKAGES` only if package visibility prevents binding on the NB55 firmware and the deployment target is enterprise/self-distributed.
- `printEscposData` queues normal print data asynchronously. Treat a successful binder call as "submitted to printer service"; use `getPrinterStatus()` in a later enhancement if the product needs detailed paper/cover/overheat status in the UI.

## Self-Review

- Spec coverage: The plan covers Noryox SDK discovery, AIDL service binding, UTS plugin integration, Vue page behavior, tests, docs, Android build, and NB55 device QA.
- Placeholder scan: No placeholder markers or unspecified edge handling remains.
- Type consistency: The transport string is consistently `noryox`; the built-in device id is consistently `noryox:built-in`; the service package/action match the Noryox SDK.
