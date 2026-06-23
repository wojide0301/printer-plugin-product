import type { PrinterDevice, PrinterError } from '@/uni_modules/yuntu-printer-uts'
import { requestAndroidPermission } from '@/uni_modules/x-perm-apply-instr-v2/js_sdk/index.js'
import {
  checkBuiltInPrinter,
  connectPrinter,
  connectWifi,
  createEscBuilder,
  disconnectPrinter,
  sendEsc,
  getConnectedPrinter,
  onConnectStateChange,
  printText,
  scanPrinters,
  stopScanPrinters,
} from '@/uni_modules/yuntu-printer-uts'

export type PrinterConnectionType = 'bluetooth' | 'wifi' | 'noryox'
export type PrinterDeviceView = PrinterDevice

const BLUETOOTH_SCAN_PERMISSION = 'android.permission.BLUETOOTH_SCAN'
const BLUETOOTH_CONNECT_PERMISSION = 'android.permission.BLUETOOTH_CONNECT'
const ACCESS_FINE_LOCATION_PERMISSION = 'android.permission.ACCESS_FINE_LOCATION'
type BluetoothPermission = typeof BLUETOOTH_SCAN_PERMISSION | typeof BLUETOOTH_CONNECT_PERMISSION | typeof ACCESS_FINE_LOCATION_PERMISSION

const bluetoothPermissionExplainMap = {
  [BLUETOOTH_SCAN_PERMISSION]: {
    title: '蓝牙扫描权限申请说明',
    content: '应用需要扫描附近的蓝牙打印机，以便发现并连接设备。',
  },
  [BLUETOOTH_CONNECT_PERMISSION]: {
    title: '蓝牙连接权限申请说明',
    content: '应用需要连接蓝牙打印机，以便发送打印数据。',
  },
  [ACCESS_FINE_LOCATION_PERMISSION]: {
    title: '位置信息权限申请说明',
    content: 'Android 旧版本扫描蓝牙设备需要位置信息权限，用于发现附近打印机。',
  },
} as const

export function usePrinter() {
  const devices = ref<PrinterDeviceView[]>([])
  const connectedDeviceId = ref('')
  const connectionType = ref<PrinterConnectionType>('bluetooth')
  const loading = ref(false)
  const lastEvent = ref('等待操作')
  const wifiIp = ref('192.168.100.110')
  const wifiPort = ref('8000')
  const statusText = computed(() => {
    if (connectedDeviceId.value) {
      return `已连接 ${connectedDeviceId.value}`
    }
    if (devices.value.length > 0) {
      return `发现 ${devices.value.length} 台设备`
    }
    return '未连接打印机'
  })
  const isConnected = computed(() => connectedDeviceId.value.length > 0)

  function getBluetoothPermissions(): BluetoothPermission[] {
    const systemInfo = uni.getSystemInfoSync() as UniApp.GetSystemInfoResult & {
      osAndroidAPILevel?: number
    }
    if (systemInfo.uniPlatform !== 'app' || systemInfo.platform !== 'android') {
      return []
    }

    const androidApiLevel = Number(systemInfo.osAndroidAPILevel ?? 0)
    if (androidApiLevel >= 31) {
      return [BLUETOOTH_SCAN_PERMISSION, BLUETOOTH_CONNECT_PERMISSION]
    }

    return [ACCESS_FINE_LOCATION_PERMISSION]
  }

  async function ensureBluetoothPermission() {
    const permissions = getBluetoothPermissions()

    for (const permission of permissions) {
      const status = await requestAndroidPermission(permission, bluetoothPermissionExplainMap[permission])
      if (status !== 1) {
        lastEvent.value = '蓝牙权限未授予，无法扫描打印机'
        uni.showToast({
          title: status === -1 ? '请在系统设置中开启蓝牙权限' : '蓝牙权限未授予',
          icon: 'none',
        })
        return false
      }
    }

    return true
  }

  function showError(err: Pick<PrinterError, 'errMsg'>) {
    console.log(err.errMsg)
    lastEvent.value = err.errMsg ?? '打印机操作失败'
    uni.showToast({
      title: err.errMsg ?? '打印机操作失败',
      icon: 'none',
    })
  }

  async function scanBuiltIn() {
    connectionType.value = 'noryox'
    loading.value = true
    devices.value = []

    const systemInfo = uni.getSystemInfoSync()
    if (systemInfo.uniPlatform !== 'app' || systemInfo.platform !== 'android') {
      showError({ errMsg: '内置打印机仅支持 Android' })
      loading.value = false
      return
    }

    try {
      const res = await checkBuiltInPrinter()
      if (res.available && res.device) {
        devices.value = [res.device]
        lastEvent.value = '发现内置打印机'
      }
      else {
        lastEvent.value = '未检测到内置打印机'
      }
    }
    catch (err) {
      showError(err as PrinterError)
    }
    finally {
      loading.value = false
    }
  }

  async function scan() {
    connectionType.value = 'bluetooth'
    loading.value = true
    devices.value = []

    const hasPermission = await ensureBluetoothPermission()
    if (!hasPermission) {
      loading.value = false
      return
    }

    try {
      const res = await scanPrinters({ timeout: 10000 })
      devices.value = res.devices
    }
    catch (err) {
      showError(err as PrinterError)
    }
    finally {
      loading.value = false
    }
  }

  function stopScan() {
    stopScanPrinters()
    loading.value = false
  }

  async function connect(deviceId: string) {
    loading.value = true
    try {
      const res = await connectPrinter({ deviceId })
      connectedDeviceId.value = res.deviceId
      connectionType.value = res.type ?? 'bluetooth'
      lastEvent.value = 'connectSuccess'
      uni.showToast({ title: '连接成功', icon: 'success' })
    }
    catch (err) {
      showError(err as PrinterError)
    }
    finally {
      loading.value = false
    }
  }

  async function connectWifiHandler() {
    if (!wifiIp.value || !wifiPort.value) {
      showError({ errMsg: '请输入 Wi-Fi 打印机 IP 和端口' })
      return
    }

    connectionType.value = 'wifi'
    loading.value = true
    try {
      const res = await connectWifi({ ip: wifiIp.value, port: wifiPort.value })
      connectedDeviceId.value = res.deviceId
      connectionType.value = 'wifi'
      lastEvent.value = 'connectSuccess'
      uni.showToast({ title: '连接成功', icon: 'success' })
    }
    catch (err) {
      showError(err as PrinterError)
    }
    finally {
      loading.value = false
    }
  }

  function refreshConnected() {
    const conn = getConnectedPrinter()
    if (conn) {
      connectedDeviceId.value = conn.deviceId
      if (conn.type === 'wifi') {
        connectionType.value = 'wifi'
        wifiIp.value = conn.ip ?? wifiIp.value
        wifiPort.value = String(conn.port ?? wifiPort.value)
      }
      else if (conn.type === 'noryox') {
        connectionType.value = 'noryox'
      }
      else if (conn.deviceId) {
        connectionType.value = 'bluetooth'
      }
    }
  }

  async function disconnect() {
    loading.value = true
    try {
      await disconnectPrinter()
      connectedDeviceId.value = ''
      lastEvent.value = 'disconnect'
      uni.showToast({ title: '已断开', icon: 'success' })
    }
    catch (err) {
      showError(err as PrinterError)
    }
    finally {
      loading.value = false
    }
  }

  function bindEvents() {
    onConnectStateChange((payload) => {
      lastEvent.value = payload.state
      if (payload.state === 'connectSuccess' && payload.deviceId) {
        connectedDeviceId.value = payload.deviceId
      }
      if (payload.state === 'disconnect') {
        connectedDeviceId.value = ''
      }
      if (payload.state === 'connectFail') {
        showError({ errMsg: payload.errMsg ?? '连接失败' })
      }
    })
  }

  async function printSample() {
    loading.value = true
    try {
      await printText({
        title: 'YUNTU PRINTER',
        lines: [
          'Printer Plugin',
          `Time ${new Date().toLocaleString()}`,
          'Status OK',
        ],
        feed: 3,
        cut: true,
      })
      uni.showToast({ title: '已发送打印', icon: 'success' })
    }
    catch (err) {
      showError(err as PrinterError)
    }
    finally {
      loading.value = false
    }
  }

  async function printSampleByEscCommands() {
    loading.value = true
    try {
      const esc = createEscBuilder()
      esc.clearCommandBuffer()
      esc.escInitializePrinter()
      esc.escText('YUNTU PRINTER')
      esc.escNewLine()
      esc.escText('Fluent ESC/POS API')
      esc.escNewLine()
      esc.addPrintAndFeedLines(3)
      esc.escCutPaper()
      await sendEsc(esc)
      uni.showToast({ title: '已发送打印', icon: 'success' })
    }
    catch (err) {
      showError(err as PrinterError)
    }
    finally {
      loading.value = false
    }
  }

  return {
    bindEvents,
    connectionType,
    connectedDeviceId,
    connect,
    connectWifi: connectWifiHandler,
    devices,
    disconnect,
    isConnected,
    lastEvent,
    loading,
    printSample,
    printSampleByEscCommands,
    refreshConnected,
    scan,
    scanBuiltIn,
    statusText,
    stopScan,
    wifiIp,
    wifiPort,
  }
}
