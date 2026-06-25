<script setup lang="ts">
import type { PrinterConnectionType, PrinterDeviceView, PrinterLinkStatus } from '@/composables/usePrinter'
import { usePrinter } from '@/composables/usePrinter'

definePage({
  name: 'printer',
  type: 'home',
  layout: 'default',
  style: {
    navigationBarTitleText: '打印机管理',
  },
})

const router = useRouter()
const {
  bindEvents,
  connectDevice,
  connectWifi,
  deviceStatuses,
  devices,
  disconnect,
  isConnected,
  lastEvent,
  loading,
  refreshConnected,
  searchAvailablePrinters,
  statusText,
  wifiIp,
  wifiPort,
} = usePrinter()

const statusMap: Record<PrinterLinkStatus, string> = {
  connected: '已连接',
  connecting: '连接中',
  connectFail: '连接失败',
  disconnected: '未连接',
}

const deviceImage = '/static/built-in-printer.png'
const networkDeviceImage = '/static/network-printer.png'
const networkPrinterIcon = '/static/network-printer-icon.svg'
const printerIcon = '/static/printer-icon.svg'

onMounted(() => {
  bindEvents()
  refreshConnected()
})

onShow(() => {
  refreshConnected()
})

function getPrinterTypeText(type?: PrinterConnectionType) {
  const map: Record<PrinterConnectionType, string> = {
    bluetooth: '蓝牙打印机',
    noryox: '内置打印机',
    wifi: '网络打印机',
  }
  return map[type ?? 'bluetooth']
}

function getSourceText(device: PrinterDeviceView) {
  if (device.type === 'noryox') {
    return '内置'
  }
  return '蓝牙'
}

function getDeviceTitle(device: PrinterDeviceView) {
  if (device.type === 'noryox') {
    return '内置打印机'
  }
  return device.name || '蓝牙打印机'
}

function getDeviceStatus(deviceId: string) {
  return deviceStatuses.value[deviceId] ?? 'disconnected'
}

function getDeviceImage(device: PrinterDeviceView) {
  return device.type === 'wifi' ? networkDeviceImage : deviceImage
}

function getDeviceIcon(device: PrinterDeviceView) {
  return device.type === 'wifi' ? networkPrinterIcon : printerIcon
}

function openCommandTests() {
  router.push({ name: 'printerCommands' })
}
</script>

<template>
  <view class="min-h-screen bg-[#f2f2f2] pb-6">
    <scroll-view scroll-y class="h-screen overflow-hidden">
      <view class="px-4 pb-6 pt-3">
        <view class="mb-3 rounded-2 bg-white px-4 py-4">
          <view class="mb-2 flex items-center justify-between gap-3">
            <view class="min-w-0">
              <view class="text-5 text-[#333] font-600">
                打印机连接
              </view>
              <view class="mt-1 truncate text-3.2 text-[#999]">
                {{ statusText }} / {{ lastEvent }}
              </view>
            </view>
            <wd-button size="small" type="info" plain @click="openCommandTests">
              命令测试
            </wd-button>
          </view>

          <view class="grid grid-cols-2 mt-4 gap-3">
            <wd-button block type="primary" :loading="loading && !isConnected" :disabled="loading" @click="searchAvailablePrinters">
              搜索打印机
            </wd-button>
            <wd-button plain block type="warning" :disabled="!isConnected || loading" @click="disconnect">
              断开连接
            </wd-button>
          </view>
        </view>

        <view class="mb-3 rounded-2 bg-white px-4 py-4">
          <view class="mb-3 text-4.2 text-[#333] font-600">
            网络打印机
          </view>
          <view class="grid grid-cols-[1fr_92px] gap-3">
            <wd-input v-model="wifiIp" placeholder="IP 地址" custom-class="!p-0" />
            <wd-input v-model="wifiPort" placeholder="端口" type="number" custom-class="!p-0" />
          </view>
          <wd-button class="mt-3" block type="success" :loading="loading" :disabled="loading" @click="connectWifi">
            连接网络打印机
          </wd-button>
        </view>

        <view
          v-if="devices.length === 0"
          class="mt-8 flex flex-col items-center justify-center rounded-2 bg-white px-5 py-10 text-center"
        >
          <view class="mb-3 text-5 text-[#333] font-600">
            暂无搜索结果
          </view>
          <view class="text-3.5 text-[#999] leading-6">
            点击搜索打印机查找蓝牙和内置设备；网络打印机可直接输入 IP 和端口连接
          </view>
        </view>

        <view
          v-for="device in devices"
          :key="`${device.type ?? 'bluetooth'}:${device.deviceId}`"
          class="mb-3 rounded-2 bg-white px-3 py-4"
        >
          <view class="flex items-start gap-3">
            <view class="relative h-24 w-18 shrink-0 overflow-hidden rounded-1.5 bg-[#f7f7f7]">
              <image :src="getDeviceImage(device)" mode="aspectFit" class="h-full w-full" />
              <image :src="getDeviceIcon(device)" mode="aspectFit" class="absolute bottom-1 right-1 h-8 w-8" />
            </view>

            <view class="min-w-0 flex-1">
              <view class="mb-1 flex items-center gap-2">
                <view class="truncate text-5 text-[#333] font-600">
                  {{ getDeviceTitle(device) }}
                </view>
                <view
                  class="shrink-0 rounded-1 px-2 py-0.5 text-2.5 text-white"
                  :class="getDeviceStatus(device.deviceId) === 'connected' ? 'bg-[#19be6b]' : 'bg-[#bbb]'"
                >
                  {{ statusMap[getDeviceStatus(device.deviceId)] }}
                </view>
              </view>
              <view class="text-3.2 text-[#999] leading-5">
                {{ getPrinterTypeText(device.type) }} / {{ getSourceText(device) }}
              </view>
              <view class="truncate text-3.2 text-[#999] leading-5">
                设备：{{ device.deviceId }}
              </view>
              <view v-if="device.rssi !== 0" class="text-3.2 text-[#999] leading-5">
                信号：{{ device.rssi }}
              </view>

              <view class="mt-4 flex flex-wrap items-center gap-4 text-3.5 text-[#ff7a00] font-600">
                <view
                  v-if="getDeviceStatus(device.deviceId) !== 'connected'"
                  :class="{ 'opacity-40': loading }"
                  @click="!loading && connectDevice(device)"
                >
                  连接
                </view>
                <view v-else @click="disconnect">
                  断开
                </view>
                <view @click="openCommandTests">
                  命令测试
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>
