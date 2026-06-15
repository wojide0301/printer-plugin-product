import { computed, ref } from 'vue'
import { requestAndroidPermission } from '@/uni_modules/x-perm-apply-instr-v2/js_sdk/index.js'
import {
  addPrintAndFeedLines,
  clearCommandBuffer,
  connectNet,
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

export interface PrinterDeviceView {
  deviceId: string
  name: string
  rssi: number
  serviceUUIDs: string[]
}

export type PrinterConnectionType = 'bluetooth' | 'wifi'

const BLUETOOTH_SCAN_PERMISSION = 'android.permission.BLUETOOTH_SCAN'
const BLUETOOTH_CONNECT_PERMISSION = 'android.permission.BLUETOOTH_CONNECT'
const ACCESS_FINE_LOCATION_PERMISSION = 'android.permission.ACCESS_FINE_LOCATION'

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

  function getBluetoothPermissions() {
    const systemInfo = uni.getSystemInfoSync()
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

  function showError(err: { errMsg?: string }) {
    console.log(errMsg)
    lastEvent.value = err.errMsg ?? '打印机操作失败'
    uni.showToast({
      title: err.errMsg ?? '打印机操作失败',
      icon: 'none',
    })
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

  function stopScan() {
    stopScanPrinters({
      complete() {
        loading.value = false
      },
    })
  }

  function connect(deviceId: string) {
    connectionType.value = 'bluetooth'
    loading.value = true
    connectPrinter({
      deviceId,
      success(res) {
        connectedDeviceId.value = res.deviceId
        connectionType.value = 'bluetooth'
        lastEvent.value = 'connectSuccess'
        uni.showToast({
          title: '连接成功',
          icon: 'success',
        })
      },
      fail: showError,
      complete() {
        loading.value = false
      },
    })
  }

  function connectWifi() {
    if (!wifiIp.value || !wifiPort.value) {
      showError({ errMsg: '请输入 Wi-Fi 打印机 IP 和端口' })
      return
    }

    connectionType.value = 'wifi'
    loading.value = true
    connectNet({
      ip: wifiIp.value,
      port: wifiPort.value,
      success(res) {
        connectedDeviceId.value = res.deviceId
        connectionType.value = 'wifi'
        lastEvent.value = 'connectSuccess'
        uni.showToast({
          title: '连接成功',
          icon: 'success',
        })
      },
      fail: showError,
      complete() {
        loading.value = false
      },
    })
  }

  function refreshConnected() {
    getConnectedPrinter({
      success(res) {
        connectedDeviceId.value = res.deviceId
        if (res.type === 'wifi') {
          connectionType.value = 'wifi'
          wifiIp.value = res.ip ?? wifiIp.value
          wifiPort.value = String(res.port ?? wifiPort.value)
        }
        else if (res.deviceId) {
          connectionType.value = 'bluetooth'
        }
      },
      fail: showError,
    })
  }

  function disconnect() {
    loading.value = true
    disconnectPrinter({
      success() {
        connectedDeviceId.value = ''
        lastEvent.value = 'disconnect'
        uni.showToast({
          title: '已断开',
          icon: 'success',
        })
      },
      fail: showError,
      complete() {
        loading.value = false
      },
    })
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

  function printSample() {
    loading.value = true
    printText({
      title: 'YUNTU PRINTER',
      lines: [
        'Printer Plugin',
        `Time ${new Date().toLocaleString()}`,
        'Status OK',
      ],
      feed: 3,
      cut: true,
      success() {
        uni.showToast({
          title: '已发送打印',
          icon: 'success',
        })
      },
      fail: showError,
      complete() {
        loading.value = false
      },
    })
  }

  function printSampleByEscCommands() {
    loading.value = true
    clearCommandBuffer()
    escInitializePrinter()
    escText('YUNTU PRINTER')
    escNewLine()
    escText('GPrinter Compatible API')
    escNewLine()
    addPrintAndFeedLines(3)
    escCutPaper()
    writeData(() => {
      loading.value = false
      uni.showToast({
        title: '已发送打印',
        icon: 'success',
      })
    })
  }

  return {
    bindEvents,
    connectionType,
    connectedDeviceId,
    connect,
    connectWifi,
    devices,
    disconnect,
    isConnected,
    lastEvent,
    loading,
    printSample,
    printSampleByEscCommands,
    refreshConnected,
    scan,
    statusText,
    stopScan,
    wifiIp,
    wifiPort,
  }
}
