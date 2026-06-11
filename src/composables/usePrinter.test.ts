import { beforeEach, describe, expect, it, vi } from 'vitest'

const requestAndroidPermission = vi.fn()
const scanPrinters = vi.fn()

vi.mock('@/uni_modules/x-perm-apply-instr-v2/js_sdk/index.js', () => ({
  requestAndroidPermission,
}))

vi.mock('@/uni_modules/yuntu-printer-uts', () => ({
  addPrintAndFeedLines: vi.fn(),
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

describe('usePrinter', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()

    ;(globalThis as { uni: UniApp.Uni }).uni = {
      getSystemInfoSync: vi.fn(() => ({
        osAndroidAPILevel: 33,
        platform: 'android',
        uniPlatform: 'app',
      })),
      showToast: vi.fn(),
    } as unknown as UniApp.Uni
  })

  it('does not scan when bluetooth permission is denied', async () => {
    requestAndroidPermission.mockResolvedValue(0)
    const { usePrinter } = await import('./usePrinter')
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
    const { usePrinter } = await import('./usePrinter')
    const printer = usePrinter()

    await printer.scan()

    expect(requestAndroidPermission).toHaveBeenCalledWith('android.permission.BLUETOOTH_SCAN', expect.any(Object))
    expect(requestAndroidPermission).toHaveBeenCalledWith('android.permission.BLUETOOTH_CONNECT', expect.any(Object))
    expect(scanPrinters).toHaveBeenCalledTimes(1)
  })
})
