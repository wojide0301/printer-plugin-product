import { beforeEach, describe, expect, it, vi } from 'vitest'

const { requestAndroidPermission, checkBuiltInPrinter, connectWifi, scanPrinters } = vi.hoisted(() => ({
  requestAndroidPermission: vi.fn(),
  checkBuiltInPrinter: vi.fn(),
  connectWifi: vi.fn(),
  scanPrinters: vi.fn(),
}))

vi.mock('@/uni_modules/x-perm-apply-instr-v2/js_sdk/index.js', () => ({
  requestAndroidPermission,
}))

vi.mock('@/uni_modules/yuntu-printer-uts', () => ({
  checkBuiltInPrinter,
  connectPrinter: vi.fn(),
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
  disconnectPrinter: vi.fn().mockResolvedValue(undefined),
  getConnectedPrinter: vi.fn().mockReturnValue(null),
  onConnectStateChange: vi.fn(),
  printText: vi.fn().mockResolvedValue({ byteLength: 0, chunkCount: 0, complete: true, msg: 'ok' }),
  scanPrinters,
  sendEsc: vi.fn().mockResolvedValue({ byteLength: 0, chunkCount: 0, complete: true, msg: 'ok' }),
  stopScanPrinters: vi.fn(),
}))

// Set up uni global before importing usePrinter (it uses uni APIs at module level)
;(globalThis as unknown as { uni: UniApp.Uni }).uni = {
  getSystemInfoSync: vi.fn(() => ({
    osAndroidAPILevel: 33,
    platform: 'android',
    uniPlatform: 'app',
  })),
  showToast: vi.fn(),
} as unknown as UniApp.Uni

import { usePrinter } from './usePrinter'

describe('usePrinter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    checkBuiltInPrinter.mockResolvedValue({ available: false })
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
    connectWifi.mockResolvedValue({
      deviceId: '192.168.100.110:8000',
      ip: '192.168.100.110',
      name: 'Wi-Fi Printer',
      port: 8000,
      serviceUUID: '',
      type: 'wifi',
      writeCharacteristicUUID: '',
    })
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
})
