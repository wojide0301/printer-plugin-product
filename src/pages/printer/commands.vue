<script setup lang="ts">
import {
  addPrintAndFeedLines,
  clearCommandBuffer,
  escBytesCommand,
  escCutPaper,
  escInitializePrinter,
  escJustification,
  escNewLine,
  escQRCode,
  escSetCharcterSize,
  escStringCommand,
  escText,
  escTurnEmphasizedMode,
  getConnectedPrinter,
  printEsc,
  printText,
  writeData,
} from '@/uni_modules/yuntu-printer-uts'
import { printerCommandTests } from '@/utils/printerCommandTests'

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
  getConnectedPrinter({
    success(res) {
      connectedDeviceId.value = res.deviceId
      connectionType.value = res.type ?? ''
    },
    fail(err) {
      showError(err.errMsg ?? '获取连接状态失败')
    },
  })
}

function backToConnect() {
  router.back()
}

function runCommand(commandId: string, options: { batch?: boolean } = {}) {
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

  return new Promise<boolean>((resolve) => {
    const done = (message: string, ok = true) => {
      loading.value = false
      runningId.value = ''
      lastResult.value = message
      resolve(ok)
    }

    command.run({
      addPrintAndFeedLines,
      clearCommandBuffer,
      escBytesCommand,
      escCutPaper,
      escInitializePrinter,
      escJustification,
      escNewLine,
      escQRCode,
      escSetCharcterSize,
      escStringCommand,
      escText,
      escTurnEmphasizedMode,
      printText(options) {
        printText({
          ...options,
          success() {
            done(`${command.title} 已发送`)
          },
          fail(err) {
            done(err.errMsg ?? `${command.title} 发送失败`, false)
            uni.showToast({
              title: err.errMsg ?? '发送失败',
              icon: 'none',
            })
          },
        })
      },
      printEsc(options) {
        printEsc({
          ...options,
          success() {
            done(`${command.title} 已发送`)
          },
          fail(err) {
            done(err.errMsg ?? `${command.title} 发送失败`, false)
            uni.showToast({
              title: err.errMsg ?? '发送失败',
              icon: 'none',
            })
          },
        })
      },
      writeData(callback) {
        writeData((info) => {
          callback?.(info)
          if (info.complete === false) {
            done(info.msg ?? `${command.title} 发送失败`, false)
            uni.showToast({
              title: info.msg ?? '发送失败',
              icon: 'none',
            })
            return
          }
          done(`${command.title} 已发送`)
        })
      },
    })
  })
}

async function runAllCommands() {
  if (!isConnected.value) {
    showError('请先连接打印机')
    return
  }

  for (const command of printerCommandTests) {
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
