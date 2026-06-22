import {
  escFourText58,
  escThreeText58,
  escTwoText58,
} from './printerEsc'

export type EscJustification = 'left' | 'center' | 'right'

export interface PrinterCommandTestContext {
  printText: (options: {
    title: string
    lines: string[]
    feed?: number
    cut?: boolean
    success?: () => void
    fail?: (err: { errMsg?: string }) => void
    complete?: () => void
  }) => void
  printEsc: (options: {
    bytes: number[]
    success?: () => void
    fail?: (err: { errMsg?: string }) => void
    complete?: () => void
  }) => void
  clearCommandBuffer: () => void
  escInitializePrinter: () => void
  escJustification: (position: EscJustification) => void
  escSetCharcterSize: (size: 1 | 2) => void
  escTurnEmphasizedMode: (on: boolean) => void
  escCutPaper: () => void
  escNewLine: () => void
  addPrintAndFeedLines: (lines: number) => void
  escText: (text: string) => void
  escQRCode: (payload: { content: string, size: number }) => void
  escStringCommand: (command: string) => void
  escBytesCommand: (command: number[]) => void
  writeData: (callback: ((info: { complete?: boolean, msg?: string }) => void) | null) => void
}

export interface PrinterCommandTest {
  id: string
  title: string
  description: string
  run: (context: PrinterCommandTestContext) => void
}

function writeBuiltCommands(context: PrinterCommandTestContext, build: () => void) {
  context.clearCommandBuffer()
  context.escInitializePrinter()
  build()
  context.writeData(null)
}

export const printerCommandTests: PrinterCommandTest[] = [
  {
    id: 'print-text',
    title: '语义文本小票',
    description: '测试 printText：标题、多行正文、走纸、切纸。',
    run(context) {
      context.printText({
        title: 'YUNTU PRINTER',
        lines: [
          'Semantic receipt',
          'Line 1 OK',
          'Line 2 OK',
        ],
        feed: 3,
        cut: true,
      })
    },
  },
  {
    id: 'initialize',
    title: '初始化打印机',
    description: '测试 ESC @ 初始化指令，并打印一行确认文本。',
    run(context) {
      writeBuiltCommands(context, () => {
        context.escText('Initialize printer')
        context.escNewLine()
        context.addPrintAndFeedLines(2)
      })
    },
  },
  {
    id: 'alignment',
    title: '左中右对齐',
    description: '测试 escJustification：left、center、right。',
    run(context) {
      writeBuiltCommands(context, () => {
        context.escJustification('left')
        context.escText('Left')
        context.escNewLine()
        context.escJustification('center')
        context.escText('Center')
        context.escNewLine()
        context.escJustification('right')
        context.escText('Right')
        context.escNewLine()
        context.addPrintAndFeedLines(2)
      })
    },
  },
  {
    id: 'character-size',
    title: '字号大小',
    description: '测试 escSetCharcterSize：普通字号和 2 倍字号。',
    run(context) {
      writeBuiltCommands(context, () => {
        context.escSetCharcterSize(1)
        context.escText('Size 1')
        context.escNewLine()
        context.escSetCharcterSize(2)
        context.escText('Size 2')
        context.escNewLine()
        context.escSetCharcterSize(1)
        context.addPrintAndFeedLines(2)
      })
    },
  },
  {
    id: 'emphasized',
    title: '加粗模式',
    description: '测试 escTurnEmphasizedMode：开启和关闭加粗。',
    run(context) {
      writeBuiltCommands(context, () => {
        context.escTurnEmphasizedMode(true)
        context.escText('Bold on')
        context.escNewLine()
        context.escTurnEmphasizedMode(false)
        context.escText('Bold off')
        context.escNewLine()
        context.addPrintAndFeedLines(2)
      })
    },
  },
  {
    id: 'feed-lines',
    title: '换行与走纸',
    description: '测试 escNewLine 和 addPrintAndFeedLines。',
    run(context) {
      writeBuiltCommands(context, () => {
        context.escText('Line A')
        context.escNewLine()
        context.escText('Line B')
        context.escNewLine()
        context.addPrintAndFeedLines(4)
      })
    },
  },
  {
    id: 'columns-58',
    title: '58mm 多列文本',
    description: '测试二列、三列、四列文本排版辅助方法。',
    run(context) {
      writeBuiltCommands(context, () => {
        context.escText(escTwoText58({ left: 'Item A', right: '10.00' }))
        context.escNewLine()
        context.escText(escThreeText58({ left: 'Item B', middle: '2', right: '20.00' }))
        context.escNewLine()
        context.escText(escFourText58({ one: 'Name', two: 'Qty', three: 'Price', four: 'Total' }))
        context.escNewLine()
        context.addPrintAndFeedLines(2)
      })
    },
  },
  {
    id: 'qr-code',
    title: '二维码',
    description: '测试 escQRCode 二维码指令。',
    run(context) {
      writeBuiltCommands(context, () => {
        context.escJustification('center')
        context.escText('QR Code')
        context.escNewLine()
        context.escQRCode({ content: 'https://example.com/yuntu-printer', size: 6 })
        context.addPrintAndFeedLines(3)
      })
    },
  },
  {
    id: 'raw-string',
    title: '字符串指令',
    description: '测试 escStringCommand 追加字符串数据。',
    run(context) {
      writeBuiltCommands(context, () => {
        context.escStringCommand('Raw string command')
        context.escNewLine()
        context.addPrintAndFeedLines(2)
      })
    },
  },
  {
    id: 'raw-bytes',
    title: '字节指令',
    description: '测试 escBytesCommand 追加原始字节。',
    run(context) {
      writeBuiltCommands(context, () => {
        context.escBytesCommand([0x52, 0x61, 0x77, 0x20, 0x62, 0x79, 0x74, 0x65, 0x73])
        context.escNewLine()
        context.addPrintAndFeedLines(2)
      })
    },
  },
  {
    id: 'cut-paper',
    title: '切纸',
    description: '测试 escCutPaper 切纸指令。',
    run(context) {
      writeBuiltCommands(context, () => {
        context.escText('Cut paper')
        context.escNewLine()
        context.addPrintAndFeedLines(3)
        context.escCutPaper()
      })
    },
  },
  {
    id: 'print-esc',
    title: '直接发送 ESC/POS',
    description: '测试 printEsc 直接发送完整字节数组。',
    run(context) {
      context.printEsc({
        bytes: [
          0x1B,
          0x40,
          0x44,
          0x69,
          0x72,
          0x65,
          0x63,
          0x74,
          0x20,
          0x45,
          0x53,
          0x43,
          0x2F,
          0x50,
          0x4F,
          0x53,
          0x0A,
          0x1B,
          0x64,
          0x02,
        ],
      })
    },
  },
]
