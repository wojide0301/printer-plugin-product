import type { PrinterDevice, PrinterError } from '@/uni_modules/yuntu-printer-uts'
import { requestAndroidPermission } from '@/uni_modules/x-perm-apply-instr-v2/js_sdk/index.js'
import {
  checkBuiltInPrinter,
  connectPrinter,
  connectWifi,
  createEscBuilder,
  disconnectPrinter,
  getConnectedPrinter,
  onConnectStateChange,
  printText,
  scanPrinters,
  sendEsc,
  stopScanPrinters,
} from '@/uni_modules/yuntu-printer-uts'

export type PrinterConnectionType = 'bluetooth' | 'wifi' | 'noryox'
export type PrinterDeviceView = PrinterDevice
export type PrinterLinkStatus = 'connected' | 'disconnected' | 'connecting' | 'connectFail'
export type PrinterDeviceStatusMap = Record<string, PrinterLinkStatus>

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
  const deviceStatuses = ref<PrinterDeviceStatusMap>({})
  const connectedDeviceId = ref('')
  const connectionType = ref<PrinterConnectionType>('bluetooth')
  const loading = ref(false)
  const lastEvent = ref('等待操作')
  const pendingDeviceId = ref('')
  const wifiIp = ref('192.168.100.110')
  const wifiPort = ref('8000')
  const isConnected = computed(() => connectedDeviceId.value.length > 0)
  const statusText = computed(() => {
    if (connectedDeviceId.value) {
      return `已连接 ${connectedDeviceId.value}`
    }
    if (devices.value.length > 0) {
      return `发现 ${devices.value.length} 台设备`
    }
    return '未连接打印机'
  })

  function setDeviceStatus(deviceId: string, status: PrinterLinkStatus) {
    if (!deviceId) {
      return
    }
    deviceStatuses.value = {
      ...deviceStatuses.value,
      [deviceId]: status,
    }
  }

  function resetConnectionStatuses() {
    const next: PrinterDeviceStatusMap = {}
    for (const deviceId of Object.keys(deviceStatuses.value)) {
      next[deviceId] = 'disconnected'
    }
    deviceStatuses.value = next
  }

  function resolveEventDeviceId(deviceId?: string) {
    return deviceId || connectedDeviceId.value || pendingDeviceId.value
  }

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

  function mergeDevices(nextDevices: PrinterDeviceView[]) {
    const byTypeAndDeviceId = new Map<string, PrinterDeviceView>()
    for (const device of [...devices.value, ...nextDevices]) {
      const type = device.type ?? 'bluetooth'
      byTypeAndDeviceId.set(`${type}:${device.deviceId}`, {
        ...device,
        type,
      })
    }
    devices.value = Array.from(byTypeAndDeviceId.values())
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
      devices.value = res.devices.map(device => ({
        ...device,
        type: device.type ?? 'bluetooth',
      }))
    }
    catch (err) {
      showError(err as PrinterError)
    }
    finally {
      loading.value = false
    }
  }

  async function searchAvailablePrinters() {
    connectionType.value = 'bluetooth'
    loading.value = true
    devices.value = []

    const bluetoothDevices: PrinterDeviceView[] = []
    const builtInDevices: PrinterDeviceView[] = []
    const hasPermission = await ensureBluetoothPermission()

    if (hasPermission) {
      try {
        const res = await scanPrinters({ timeout: 5000 })
        bluetoothDevices.push(...res.devices.map(device => ({
          ...device,
          type: device.type ?? 'bluetooth' as PrinterConnectionType,
        })))
      }
      catch (err) {
        showError(err as PrinterError)
      }
    }

    try {
      const systemInfo = uni.getSystemInfoSync()
      if (systemInfo.uniPlatform === 'app' && systemInfo.platform === 'android') {
        const res = await checkBuiltInPrinter()
        if (res.available && res.device) {
          builtInDevices.push(res.device)
        }
      }
    }
    catch (err) {
      showError(err as PrinterError)
    }
    finally {
      mergeDevices([...bluetoothDevices, ...builtInDevices])
      lastEvent.value = devices.value.length > 0
        ? `已搜索到 ${devices.value.length} 台打印机`
        : '未搜索到打印机'
      loading.value = false
    }
  }

  function stopScan() {
    stopScanPrinters()
    loading.value = false
  }

  async function connect(deviceId: string) {
    loading.value = true
    pendingDeviceId.value = deviceId
    setDeviceStatus(deviceId, 'connecting')
    try {
      const res = await connectPrinter({ deviceId })
      connectedDeviceId.value = res.deviceId
      connectionType.value = res.type ?? 'bluetooth'
      resetConnectionStatuses()
      setDeviceStatus(res.deviceId, 'connected')
      lastEvent.value = 'connectSuccess'
      uni.showToast({ title: '连接成功', icon: 'success' })
      return res
    }
    catch (err) {
      setDeviceStatus(deviceId, 'connectFail')
      showError(err as PrinterError)
      return null
    }
    finally {
      pendingDeviceId.value = ''
      loading.value = false
    }
  }

  async function connectDevice(device: PrinterDeviceView) {
    connectionType.value = device.type ?? 'bluetooth'
    return connect(device.deviceId)
  }

  async function connectWifiHandler() {
    if (!wifiIp.value || !wifiPort.value) {
      showError({ errMsg: '请输入 Wi-Fi 打印机 IP 和端口' })
      return null
    }

    connectionType.value = 'wifi'
    loading.value = true
    const deviceId = `${wifiIp.value}:${wifiPort.value}`
    pendingDeviceId.value = deviceId
    setDeviceStatus(deviceId, 'connecting')
    try {
      const res = await connectWifi({ ip: wifiIp.value, port: wifiPort.value })
      connectedDeviceId.value = res.deviceId
      connectionType.value = 'wifi'
      resetConnectionStatuses()
      setDeviceStatus(res.deviceId, 'connected')
      lastEvent.value = 'connectSuccess'
      uni.showToast({ title: '连接成功', icon: 'success' })
      return res
    }
    catch (err) {
      setDeviceStatus(deviceId, 'connectFail')
      showError(err as PrinterError)
      return null
    }
    finally {
      pendingDeviceId.value = ''
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
      resetConnectionStatuses()
      setDeviceStatus(conn.deviceId, 'connected')
    }
  }

  async function disconnect() {
    loading.value = true
    try {
      await disconnectPrinter()
      connectedDeviceId.value = ''
      resetConnectionStatuses()
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
      const eventDeviceId = resolveEventDeviceId(payload.deviceId)
      if (payload.state === 'connectSuccess' && eventDeviceId) {
        connectedDeviceId.value = eventDeviceId
        resetConnectionStatuses()
        setDeviceStatus(eventDeviceId, 'connected')
      }
      if (payload.state === 'disconnect') {
        connectedDeviceId.value = ''
        resetConnectionStatuses()
      }
      if (payload.state === 'connectFail') {
        if (eventDeviceId) {
          setDeviceStatus(eventDeviceId, 'connectFail')
        }
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
    connectDevice,
    connectWifi: connectWifiHandler,
    deviceStatuses,
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
    searchAvailablePrinters,
    statusText,
    stopScan,
    wifiIp,
    wifiPort,
  }
}
