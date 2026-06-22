<script setup lang="ts">
import { usePrinter } from '@/composables/usePrinter'

definePage({
  name: 'printer',
  layout: 'tabbar',
  style: {
    navigationBarTitleText: '打印机插件',
  },
})

const {
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
} = usePrinter()

onMounted(() => {
  bindEvents()
  refreshConnected()
})

function getDeviceValue(device: { type?: string, rssi: number }) {
  if (device.type === 'noryox') {
    return '内置'
  }
  return `RSSI ${device.rssi}`
}
</script>

<template>
  <view class="min-h-screen bg-[var(--wot-color-bg,#f7f8fa)]">
    <scroll-view scroll-y class="h-screen overflow-hidden">
      <demo-block title="连接状态" transparent>
        <wd-cell-group border custom-class="rounded-2! overflow-hidden">
          <wd-cell title="状态" :value="statusText" />
          <wd-cell title="最后事件" :value="lastEvent" />
          <wd-cell v-if="connectedDeviceId" title="当前设备" :value="connectedDeviceId" />
        </wd-cell-group>
      </demo-block>

      <demo-block title="基础功能" transparent>
        <view class="px-4 pb-3">
          <wd-segmented
            v-model:value="connectionType"
            :options="[
              { label: '蓝牙', value: 'bluetooth' },
              { label: 'Wi-Fi', value: 'wifi' },
            ]"
          />
        </view>
        <view v-if="connectionType === 'wifi'" class="px-4 pb-3">
          <wd-cell-group border custom-class="rounded-2! overflow-hidden">
            <wd-input v-model="wifiIp" label="IP" placeholder="192.168.100.110" clearable />
            <wd-input v-model="wifiPort" label="端口" placeholder="8000" type="number" clearable />
          </wd-cell-group>
        </view>
        <view class="grid grid-cols-2 gap-3 px-4">
          <wd-button v-if="connectionType === 'bluetooth'" block type="primary" :loading="loading" @click="scan">
            扫描打印机
          </wd-button>
          <wd-button v-if="connectionType === 'bluetooth'" type="warning" plain block :disabled="!loading" @click="stopScan">
            停止扫描
          </wd-button>
          <wd-button v-if="connectionType === 'wifi'" block type="primary" :loading="loading" @click="connectWifi">
            连接 Wi-Fi
          </wd-button>
          <wd-button block type="success" :disabled="!isConnected" :loading="loading" @click="printSample">
            语义打印
          </wd-button>
          <wd-button plain block type="success" :disabled="!isConnected" :loading="loading" @click="printSampleByEscCommands">
            ESC打印
          </wd-button>
          <wd-button type="danger" plain block :disabled="!isConnected" :loading="loading" @click="disconnect">
            断开连接
          </wd-button>
        </view>
      </demo-block>

      <demo-block v-if="connectionType === 'bluetooth'" title="发现的设备" transparent>
        <wd-cell-group border custom-class="rounded-2! overflow-hidden">
          <wd-cell
            v-for="device in devices"
            :key="device.deviceId"
            :title="device.name || 'Unknown Printer'"
            :label="device.deviceId"
            :value="getDeviceValue(device)"
            is-link
            @click="connect(device.deviceId)"
          />
          <wd-cell v-if="devices.length === 0" title="暂无设备" value="点击扫描" />
        </wd-cell-group>
      </demo-block>
    </scroll-view>
  </view>
</template>
