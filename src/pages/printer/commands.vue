<script setup lang="ts">
import {
  getBuiltInPrinter,
  getConnectedPrinter,
  printBuiltInBarcode,
  printBuiltInFourColumn,
  printBuiltInImage,
  printBuiltInLabel,
  printBuiltInQrCode,
  printBuiltInTable,
  printBuiltInText,
  printBuiltInThreeColumn,
  printBuiltInTwoColumn,
  printEsc,
  printText,
} from '@/uni_modules/yuntu-printer-uts'
import { getPrinterErrorMessage } from '@/utils/printerErrors'
import { isBuiltInPrinterCommand, printerCommandTests } from '@/utils/printerCommandTests'

definePage({
  name: 'printerCommands',
  style: {
    navigationBarTitleText: '打印命令测试',
  },
})

const router = useRouter()
const loading = ref(false)
const runningId = ref('')
const connectedDeviceId = ref('')
const connectionType = ref('')
const lastResult = ref('等待测试')
const isConnected = computed(() => connectedDeviceId.value.length > 0)
const statusText = computed(() => {
  if (!isConnected.value) {
    return '未连接打印机'
  }
  return `${connectionType.value || 'printer'} · ${connectedDeviceId.value}`
})

function showError(message: string) {
  lastResult.value = message
  uni.showToast({
    title: message,
    icon: 'none',
  })
}

function refreshConnected() {
  const conn = getConnectedPrinter()
  if (conn) {
    connectedDeviceId.value = conn.deviceId
    connectionType.value = conn.type ?? ''
  }
}

function backToConnect() {
  router.back()
}

async function runCommand(commandId: string, options: { batch?: boolean } = {}) {
  if (!isConnected.value) {
    showError('请先连接打印机')
    return Promise.resolve(false)
  }

  const command = printerCommandTests.find(item => item.id === commandId)
  if (!command) {
    showError('未找到测试命令')
    return Promise.resolve(false)
  }

  loading.value = true
  runningId.value = options.batch ? 'all' : command.id
  lastResult.value = `正在发送：${command.title}`

  try {
    const builtIn = getBuiltInPrinter()
    await command.run({
      esc: null,
      builtIn,
      sendEsc: async () => {},
      printText: async (opts: any) => { await printText(opts) },
      printEsc: async (bytes: number[], chunkSize?: number) => { await printEsc(bytes, chunkSize) },
      printBuiltInText,
      printBuiltInBarcode,
      printBuiltInQrCode,
      printBuiltInImage,
      printBuiltInLabel,
      printBuiltInTable,
      printBuiltInTwoColumn,
      printBuiltInThreeColumn,
      printBuiltInFourColumn,
    })
    loading.value = false
    runningId.value = ''
    lastResult.value = `${command.title} 已发送`
    return true
  }
  catch (err: any) {
    loading.value = false
    runningId.value = ''
    const message = getPrinterErrorMessage(err, `${command.title} 发送失败`)
    lastResult.value = message
    uni.showToast({ title: message, icon: 'none' })
    return false
  }
}

async function runAllCommands() {
  if (!isConnected.value) {
    showError('请先连接打印机')
    return
  }

  const commands = connectionType.value === 'noryox'
    ? printerCommandTests.filter(isBuiltInPrinterCommand)
    : printerCommandTests.filter(command => !isBuiltInPrinterCommand(command))

  for (const command of commands) {
    const ok = await runCommand(command.id, { batch: true })
    if (!ok) {
      return
    }
    await new Promise(resolve => setTimeout(resolve, 300))
  }
}

onMounted(() => {
  refreshConnected()
})
</script>

<template>
  <view class="min-h-screen bg-[var(--wot-color-bg,#f7f8fa)]">
    <scroll-view scroll-y class="h-screen overflow-hidden">
      <demo-block title="连接状态" transparent>
        <wd-cell-group border custom-class="rounded-2! overflow-hidden">
          <wd-cell title="状态" :value="statusText" />
          <wd-cell title="最后结果" :value="lastResult" />
        </wd-cell-group>
      </demo-block>

      <demo-block title="测试控制" transparent>
        <view class="grid grid-cols-2 gap-3 px-4">
          <wd-button block type="primary" :disabled="!isConnected || loading" :loading="loading && runningId === 'all'" @click="runAllCommands">
            全部测试
          </wd-button>
          <wd-button type="info" plain block @click="refreshConnected">
            刷新状态
          </wd-button>
          <wd-button type="warning" plain block @click="backToConnect">
            返回连接
          </wd-button>
        </view>
      </demo-block>

      <demo-block title="打印命令" transparent>
        <wd-cell-group border custom-class="rounded-2! overflow-hidden">
          <wd-cell
            v-for="command in printerCommandTests"
            :key="command.id"
            :title="command.title"
            :label="command.description"
          >
            <wd-button
              size="small"
              type="success"
              :disabled="!isConnected || loading"
              :loading="runningId === command.id"
              @click="runCommand(command.id)"
            >
              测试
            </wd-button>
          </wd-cell>
        </wd-cell-group>
      </demo-block>

      <wd-gap :height="24" />
    </scroll-view>
  </view>
</template>
