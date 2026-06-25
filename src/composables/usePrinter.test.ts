/* eslint-disable import/first */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  requestAndroidPermission,
  checkBuiltInPrinter,
  connectPrinter,
  connectWifi,
  disconnectPrinter,
  getConnectedPrinter,
  onConnectStateChange,
  scanPrinters,
} = vi.hoisted(() => ({
  requestAndroidPermission: vi.fn(),
  checkBuiltInPrinter: vi.fn(),
  connectPrinter: vi.fn(),
  connectWifi: vi.fn(),
  disconnectPrinter: vi.fn(),
  getConnectedPrinter: vi.fn(),
  onConnectStateChange: vi.fn(),
  scanPrinters: vi.fn(),
}))

vi.mock('@/uni_modules/x-perm-apply-instr-v2/js_sdk/index.js', () => ({
  requestAndroidPermission,
}))

vi.mock('@/uni_modules/yuntu-printer-uts', () => ({
  checkBuiltInPrinter,
  connectPrinter,
  connectWifi,
  createEscBuilder: vi.fn(() => ({
    clearCommandBuffer: vi.fn().mockReturnThis(),
    escInitializePrinter: vi.fn().mockReturnThis(),
    escText: vi.fn().mockReturnThis(),
    escNewLine: vi.fn().mockReturnThis(),
    addPrintAndFeedLines: vi.fn().mockReturnThis(),
    escCutPaper: vi.fn().mockReturnThis(),
    escJustification: vi.fn().mockReturnThis(),
    escTurnEmphasizedMode: vi.fn().mockReturnThis(),
    escSetCharcterSize: vi.fn().mockReturnThis(),
  })),
  disconnectPrinter,
  getConnectedPrinter,
  onConnectStateChange,
  printText: vi.fn().mockResolvedValue({ byteLength: 0, chunkCount: 0, complete: true, msg: 'ok' }),
  scanPrinters,
  sendEsc: vi.fn().mockResolvedValue({ byteLength: 0, chunkCount: 0, complete: true, msg: 'ok' }),
  stopScanPrinters: vi.fn(),
}))

const storage = new Map<string, unknown>()

// Set up uni global before importing usePrinter (it uses uni APIs at module level)
;(globalThis as unknown as { uni: UniApp.Uni }).uni = {
  getSystemInfoSync: vi.fn(() => ({
    osAndroidAPILevel: 33,
    platform: 'android',
    uniPlatform: 'app',
  })),
  getStorageSync: vi.fn((key: string) => storage.get(key) ?? ''),
  setStorageSync: vi.fn((key: string, value: unknown) => storage.set(key, value)),
  showToast: vi.fn(),
} as unknown as UniApp.Uni

import { usePrinter } from './usePrinter'

const STORAGE_KEY = 'yuntu:printer:managed-list:v1'

describe('usePrinter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    storage.clear()
    checkBuiltInPrinter.mockResolvedValue({ available: false })
    connectPrinter.mockResolvedValue({
      deviceId: 'BLE-001',
      name: 'BLE Printer',
      serviceUUID: 'service',
      type: 'bluetooth',
      writeCharacteristicUUID: 'write',
    })
    connectWifi.mockResolvedValue({
      deviceId: '192.168.100.110:8000',
      ip: '192.168.100.110',
      name: 'Wi-Fi Printer',
      port: 8000,
      serviceUUID: '',
      type: 'wifi',
      writeCharacteristicUUID: '',
    })
    disconnectPrinter.mockResolvedValue(undefined)
    getConnectedPrinter.mockReturnValue(null)
  })

  it('does not scan when bluetooth permission is denied', async () => {
    requestAndroidPermission.mockResolvedValue(0)
    const printer = usePrinter()

    await printer.scan()

    expect(requestAndroidPermission).toHaveBeenCalledWith('android.permission.BLUETOOTH_SCAN', {
      title: '蓝牙扫描权限申请说明',
      content: '应用需要扫描附近的蓝牙打印机，以便发现并连接设备。',
    })
    expect(scanPrinters).not.toHaveBeenCalled()
    expect(printer.loading.value).toBe(false)
    expect(printer.lastEvent.value).toBe('蓝牙权限未授予，无法扫描打印机')
  })

  it('scans after required bluetooth permissions are granted', async () => {
    requestAndroidPermission.mockResolvedValue(1)
    scanPrinters.mockResolvedValue({ devices: [] })
    const printer = usePrinter()

    await printer.scan()

    expect(requestAndroidPermission).toHaveBeenCalledWith('android.permission.BLUETOOTH_SCAN', expect.any(Object))
    expect(requestAndroidPermission).toHaveBeenCalledWith('android.permission.BLUETOOTH_CONNECT', expect.any(Object))
    expect(scanPrinters).toHaveBeenCalledTimes(1)
  })

  it('uses the Noryox built-in printer without requesting bluetooth permission', async () => {
    checkBuiltInPrinter.mockResolvedValue({
      available: true,
      device: {
        deviceId: 'noryox:built-in',
        name: 'Noryox NB55 Built-in Printer',
        rssi: 0,
        serviceUUIDs: ['noryox-aidl'],
        type: 'noryox',
      },
    })
    const printer = usePrinter()

    await printer.scanBuiltIn()

    expect(requestAndroidPermission).not.toHaveBeenCalled()
    expect(printer.devices.value).toEqual([
      {
        deviceId: 'noryox:built-in',
        name: 'Noryox NB55 Built-in Printer',
        rssi: 0,
        serviceUUIDs: ['noryox-aidl'],
        type: 'noryox',
      },
    ])
    expect(printer.lastEvent.value).toBe('发现内置打印机')
    expect(printer.loading.value).toBe(false)
  })

  it('connects wifi printer without requesting bluetooth permissions', async () => {
    const printer = usePrinter()

    printer.connectionType.value = 'wifi'
    printer.wifiIp.value = '192.168.100.110'
    printer.wifiPort.value = '8000'
    await printer.connectWifi()

    expect(requestAndroidPermission).not.toHaveBeenCalled()
    expect(connectWifi).toHaveBeenCalledWith(expect.objectContaining({
      ip: '192.168.100.110',
      port: '8000',
    }))
    expect(printer.connectedDeviceId.value).toBe('192.168.100.110:8000')
    expect(printer.statusText.value).toBe('已连接 192.168.100.110:8000')
    expect(printer.loading.value).toBe(false)
  })

  it('adds wifi printers to local storage and updates duplicates', () => {
    const printer = usePrinter()

    printer.addWifiPrinter({ name: 'Kitchen', ip: '192.168.1.8', port: '9100' })
    printer.addWifiPrinter({ name: 'Kitchen Updated', ip: '192.168.1.8', port: '9100' })

    expect(printer.managedPrinters.value).toHaveLength(1)
    expect(printer.managedPrinters.value[0]).toEqual(expect.objectContaining({
      deviceId: '192.168.1.8:9100',
      ip: '192.168.1.8',
      brand: '通拿',
      linkStatus: 'disconnected',
      name: 'Kitchen Updated',
      paperWidth: 58,
      port: 9100,
      printerKind: 'thermal',
      type: 'wifi',
    }))
    expect(uni.setStorageSync).toHaveBeenLastCalledWith(STORAGE_KEY, [
      expect.objectContaining({
        brand: '通拿',
        deviceId: '192.168.1.8:9100',
        name: 'Kitchen Updated',
        paperWidth: 58,
        printerKind: 'thermal',
        type: 'wifi',
      }),
    ])
  })

  it('hydrates legacy managed printers with local metadata defaults', () => {
    storage.set(STORAGE_KEY, [
      {
        id: 'bluetooth:BLE-001',
        deviceId: 'BLE-001',
        name: 'BLE Printer',
        serviceUUIDs: ['service'],
        rssi: -42,
        type: 'bluetooth',
        createdAt: 1,
        updatedAt: 2,
      },
    ])

    const printer = usePrinter()

    expect(printer.managedPrinters.value).toEqual([
      expect.objectContaining({
        brand: '通拿',
        deviceId: 'BLE-001',
        linkStatus: 'disconnected',
        paperWidth: 58,
        printerKind: 'thermal',
        type: 'bluetooth',
      }),
    ])
  })

  it('saves bluetooth, built-in, and wifi drafts with editable metadata', () => {
    const printer = usePrinter()

    printer.saveManagedPrinterDraft({
      sourceType: 'bluetooth',
      deviceId: 'BLE-001',
      name: 'Front Desk',
      brand: '佳博',
      paperWidth: 80,
      printerKind: 'label',
      rssi: -42,
      serviceUUIDs: ['service'],
    })
    printer.saveManagedPrinterDraft({
      sourceType: 'noryox',
      deviceId: 'noryox:built-in',
      name: '内置打印机',
      brand: '商米',
      paperWidth: 58,
      printerKind: 'thermal',
      rssi: 0,
      serviceUUIDs: ['noryox-aidl'],
    })
    printer.saveManagedPrinterDraft({
      sourceType: 'wifi',
      deviceId: '192.168.1.8:9100',
      name: 'Kitchen',
      brand: '通拿',
      ip: '192.168.1.8',
      paperWidth: 58,
      port: 9100,
      printerKind: 'thermal',
    })

    expect(printer.managedPrinters.value).toEqual([
      expect.objectContaining({
        brand: '佳博',
        deviceId: 'BLE-001',
        paperWidth: 80,
        printerKind: 'label',
        serviceUUIDs: ['service'],
        type: 'bluetooth',
      }),
      expect.objectContaining({
        brand: '商米',
        deviceId: 'noryox:built-in',
        paperWidth: 58,
        printerKind: 'thermal',
        type: 'noryox',
      }),
      expect.objectContaining({
        brand: '通拿',
        deviceId: '192.168.1.8:9100',
        ip: '192.168.1.8',
        paperWidth: 58,
        port: 9100,
        printerKind: 'thermal',
        type: 'wifi',
      }),
    ])
    expect(uni.setStorageSync).toHaveBeenLastCalledWith(STORAGE_KEY, [
      expect.objectContaining({ deviceId: 'BLE-001', brand: '佳博' }),
      expect.objectContaining({ deviceId: 'noryox:built-in', brand: '商米' }),
      expect.objectContaining({ deviceId: '192.168.1.8:9100', brand: '通拿' }),
    ])
  })

  it('updates duplicate drafts by type and device id', () => {
    const printer = usePrinter()

    printer.saveManagedPrinterDraft({
      sourceType: 'bluetooth',
      deviceId: 'BLE-001',
      name: 'Front Desk',
      brand: '通拿',
      paperWidth: 58,
      printerKind: 'thermal',
    })
    printer.saveManagedPrinterDraft({
      sourceType: 'bluetooth',
      deviceId: 'BLE-001',
      name: 'Front Desk Updated',
      brand: '商米',
      paperWidth: 80,
      printerKind: 'label',
    })

    expect(printer.managedPrinters.value).toHaveLength(1)
    expect(printer.managedPrinters.value[0]).toEqual(expect.objectContaining({
      brand: '商米',
      createdAt: expect.any(Number),
      deviceId: 'BLE-001',
      name: 'Front Desk Updated',
      paperWidth: 80,
      printerKind: 'label',
      type: 'bluetooth',
    }))
  })

  it('adds discovered bluetooth and built-in printers to the managed list', () => {
    const printer = usePrinter()

    printer.addDiscoveredPrinter({
      deviceId: 'BLE-001',
      name: 'BLE Printer',
      rssi: -42,
      serviceUUIDs: ['service'],
      type: 'bluetooth',
    })
    printer.addDiscoveredPrinter({
      deviceId: 'noryox:built-in',
      name: 'Built-in Printer',
      rssi: 0,
      serviceUUIDs: ['noryox-aidl'],
      type: 'noryox',
    })

    expect(printer.managedPrinters.value.map(item => item.deviceId)).toEqual(['BLE-001', 'noryox:built-in'])
    expect(printer.isManagedPrinter('BLE-001')).toBe(true)
    expect(printer.managedPrinters.value[0]).toEqual(expect.objectContaining({
      brand: '通拿',
      linkStatus: 'disconnected',
      paperWidth: 58,
      printerKind: 'thermal',
      rssi: -42,
      serviceUUIDs: ['service'],
      type: 'bluetooth',
    }))
  })

  it('searches bluetooth and built-in printers without dropping either result', async () => {
    requestAndroidPermission.mockResolvedValue(1)
    scanPrinters.mockResolvedValue({
      devices: [
        {
          deviceId: 'BLE-001',
          name: 'BLE Printer',
          rssi: -42,
          serviceUUIDs: ['service'],
          type: 'bluetooth',
        },
      ],
    })
    checkBuiltInPrinter.mockResolvedValue({
      available: true,
      device: {
        deviceId: 'noryox:built-in',
        name: 'Built-in Printer',
        rssi: 0,
        serviceUUIDs: ['noryox-aidl'],
        type: 'noryox',
      },
    })
    const printer = usePrinter()

    await printer.searchAvailablePrinters()

    expect(printer.devices.value.map(item => item.deviceId)).toEqual(['BLE-001', 'noryox:built-in'])
    expect(printer.lastEvent.value).toBe('已搜索到 2 台打印机')
    expect(printer.loading.value).toBe(false)
  })

  it('validates wifi drafts before saving manual network printers', () => {
    const printer = usePrinter()

    expect(printer.saveManagedPrinterDraft({
      sourceType: 'wifi',
      deviceId: '',
      name: 'Kitchen',
      brand: '通拿',
      ip: '',
      paperWidth: 58,
      port: 9100,
      printerKind: 'thermal',
    })).toBe(false)
    expect(printer.saveManagedPrinterDraft({
      sourceType: 'wifi',
      deviceId: '',
      name: 'Kitchen',
      brand: '通拿',
      ip: '192.168.1.8',
      paperWidth: 58,
      port: 0,
      printerKind: 'thermal',
    })).toBe(false)
    expect(printer.saveManagedPrinterDraft({
      sourceType: 'wifi',
      deviceId: '',
      name: 'Kitchen',
      brand: '通拿',
      ip: '192.168.1.8',
      paperWidth: 58,
      port: 9100,
      printerKind: 'thermal',
    })).toBe(true)

    expect(printer.managedPrinters.value).toEqual([
      expect.objectContaining({
        deviceId: '192.168.1.8:9100',
        ip: '192.168.1.8',
        port: 9100,
        type: 'wifi',
      }),
    ])
  })

  it('reloads managed printers saved by another page instance', () => {
    const listPagePrinter = usePrinter()
    const editPagePrinter = usePrinter()

    expect(listPagePrinter.managedPrinters.value).toEqual([])

    editPagePrinter.saveManagedPrinterDraft({
      sourceType: 'wifi',
      deviceId: '',
      name: 'Kitchen',
      brand: '通拿',
      ip: '192.168.1.8',
      paperWidth: 58,
      port: 9100,
      printerKind: 'thermal',
    })
    listPagePrinter.refreshManagedPrinters()

    expect(listPagePrinter.managedPrinters.value).toEqual([
      expect.objectContaining({
        deviceId: '192.168.1.8:9100',
        ip: '192.168.1.8',
        name: 'Kitchen',
        port: 9100,
        type: 'wifi',
      }),
    ])
  })

  it('removes managed printers and persists the remaining list', () => {
    const printer = usePrinter()

    printer.addWifiPrinter({ name: 'A', ip: '192.168.1.8', port: '9100' })
    printer.addWifiPrinter({ name: 'B', ip: '192.168.1.9', port: '9100' })
    printer.removeManagedPrinter('wifi:192.168.1.8:9100')

    expect(printer.managedPrinters.value.map(item => item.deviceId)).toEqual(['192.168.1.9:9100'])
    expect(uni.setStorageSync).toHaveBeenLastCalledWith(STORAGE_KEY, [
      expect.objectContaining({ deviceId: '192.168.1.9:9100' }),
    ])
  })

  it('updates managed printer status from connection events', () => {
    let connectStateHandler: ((payload: { state: string, deviceId?: string, errMsg?: string }) => void) | undefined
    onConnectStateChange.mockImplementation((handler) => {
      connectStateHandler = handler
    })
    const printer = usePrinter()
    printer.addWifiPrinter({ name: 'Kitchen', ip: '192.168.1.8', port: '9100' })

    printer.bindEvents()
    connectStateHandler?.({ state: 'connectSuccess', deviceId: '192.168.1.8:9100' })

    expect(printer.connectedDeviceId.value).toBe('192.168.1.8:9100')
    expect(printer.managedPrinters.value[0].linkStatus).toBe('connected')
    expect(printer.managedPrinters.value[0].lastConnectedAt).toEqual(expect.any(Number))

    connectStateHandler?.({ state: 'disconnect' })

    expect(printer.connectedDeviceId.value).toBe('')
    expect(printer.managedPrinters.value[0].linkStatus).toBe('disconnected')
  })

  it('marks connect failures on the matching or pending printer', async () => {
    let connectStateHandler: ((payload: { state: string, deviceId?: string, errMsg?: string }) => void) | undefined
    onConnectStateChange.mockImplementation((handler) => {
      connectStateHandler = handler
    })
    const printer = usePrinter()
    printer.addDiscoveredPrinter({
      deviceId: 'BLE-001',
      name: 'BLE Printer',
      rssi: -42,
      serviceUUIDs: ['service'],
      type: 'bluetooth',
    })

    printer.bindEvents()
    connectPrinter.mockRejectedValueOnce({ errMsg: '连接失败' })
    const connectPromise = printer.connectManagedPrinter(printer.managedPrinters.value[0])
    expect(printer.managedPrinters.value[0].linkStatus).toBe('connecting')
    connectStateHandler?.({ state: 'connectFail', errMsg: '连接失败' })
    await connectPromise

    expect(printer.managedPrinters.value[0].linkStatus).toBe('connectFail')
    expect(printer.lastEvent.value).toBe('连接失败')
  })

  it('serializes managed printer jobs and switches connection before each job', async () => {
    const firstJob = createDeferred<void>()
    const firstJobStarted = createDeferred<void>()
    const events: string[] = []
    connectWifi.mockImplementation(async ({ ip, port }) => {
      events.push(`connect:${ip}:${port}`)
      return {
        deviceId: `${ip}:${port}`,
        ip,
        name: 'Wi-Fi Printer',
        port: Number(port),
        serviceUUID: '',
        type: 'wifi',
        writeCharacteristicUUID: '',
      }
    })
    const printer = usePrinter()
    printer.addWifiPrinter({ name: 'Kitchen', ip: '192.168.1.8', port: '9100' })
    printer.addWifiPrinter({ name: 'Cashier', ip: '192.168.1.9', port: '9100' })

    const kitchen = printer.managedPrinters.value[0]
    const cashier = printer.managedPrinters.value[1]
    const kitchenTask = printer.printWithManagedPrinter(kitchen, async () => {
      events.push('job:kitchen:start')
      firstJobStarted.resolve()
      await firstJob.promise
      events.push('job:kitchen:end')
    })
    const cashierTask = printer.printWithManagedPrinter(cashier, async () => {
      events.push('job:cashier')
    })

    try {
      await firstJobStarted.promise
      expect(events).toEqual(['connect:192.168.1.8:9100', 'job:kitchen:start'])
      expect(connectWifi).toHaveBeenCalledTimes(1)
    }
    finally {
      firstJob.resolve()
    }
    await Promise.all([kitchenTask, cashierTask])

    expect(events).toEqual([
      'connect:192.168.1.8:9100',
      'job:kitchen:start',
      'job:kitchen:end',
      'connect:192.168.1.9:9100',
      'job:cashier',
    ])
  })

  it('does not reconnect when the requested managed printer is already connected', async () => {
    getConnectedPrinter.mockReturnValue({
      deviceId: '192.168.1.8:9100',
      ip: '192.168.1.8',
      name: 'Wi-Fi Printer',
      port: 9100,
      serviceUUID: '',
      type: 'wifi',
      writeCharacteristicUUID: '',
    })
    const printer = usePrinter()
    printer.addWifiPrinter({ name: 'Kitchen', ip: '192.168.1.8', port: '9100' })

    await printer.printWithManagedPrinter(printer.managedPrinters.value[0], async (ctx) => {
      expect(ctx.printer.deviceId).toBe('192.168.1.8:9100')
      expect(ctx.connection.deviceId).toBe('192.168.1.8:9100')
    })

    expect(connectWifi).not.toHaveBeenCalled()
    expect(printer.managedPrinters.value[0].linkStatus).toBe('connected')
  })

  it('prints by business role binding', async () => {
    const printer = usePrinter()
    printer.addWifiPrinter({ name: 'Kitchen', ip: '192.168.1.8', port: '9100' })
    printer.addWifiPrinter({ name: 'Cashier', ip: '192.168.1.9', port: '9100' })

    expect(printer.setPrinterBinding('kitchen', printer.managedPrinters.value[0].id)).toBe(true)
    expect(printer.setPrinterBinding('cashier', printer.managedPrinters.value[1].id)).toBe(true)

    await printer.printWithPrinterRole('kitchen', async (ctx) => {
      expect(ctx.printer.name).toBe('Kitchen')
    })

    expect(connectWifi).toHaveBeenCalledWith(expect.objectContaining({
      ip: '192.168.1.8',
      port: '9100',
    }))
    expect(printer.getPrinterByRole('cashier')?.name).toBe('Cashier')
  })
})

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve
    reject = promiseReject
  })
  return { promise, reject, resolve }
}
