import { escFourText58, escThreeText58, escTwoText58, PrinterEscBuilder } from './printerEsc'

export interface PrinterCommandTestContext {
  esc: any
  builtIn: any
  sendEsc: () => Promise<any>
  printText: (options: {
    title: string
    lines: string[]
    feed?: number
    cut?: boolean
  }) => Promise<void>
  printEsc: (bytes: number[], chunkSize?: number) => Promise<void>
  printBuiltInText: (options: any) => Promise<any>
  printBuiltInBarcode: (options: any) => Promise<any>
  printBuiltInQrCode: (options: any) => Promise<any>
  printBuiltInImage: (options: any) => Promise<any>
  printBuiltInLabel: (options: any) => Promise<any>
  printBuiltInTable: (options: any) => Promise<any>
  printBuiltInTwoColumn: (options: any) => Promise<any>
  printBuiltInThreeColumn: (options: any) => Promise<any>
  printBuiltInFourColumn: (options: any) => Promise<any>
}

export interface PrinterCommandTest {
  category: string
  id: string
  title: string
  description: string
  run: (context: PrinterCommandTestContext) => Promise<void>
}

const SAMPLE_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADElEQVR42mP8z8BQDwAFgwJ/lDfaWAAAAABJRU5ErkJggg=='
const CHINESE_PRINT_BYTES = [
  0x1B,
  0x40,
  0x1C,
  0x26,
  0x1B,
  0x61,
  0x01,
  0xD6,
  0xD0,
  0xCE,
  0xC4,
  0xB4,
  0xF2,
  0xD3,
  0xA1,
  0xB2,
  0xE2,
  0xCA,
  0xD4,
  0x0A,
  0x0A,
  0x1B,
  0x61,
  0x00,
  0xC9,
  0xCC,
  0xC6,
  0xB7,
  0x20,
  0xCA,
  0xFD,
  0xC1,
  0xBF,
  0x20,
  0xBD,
  0xF0,
  0xB6,
  0xEE,
  0x0A,
  0xBF,
  0xC9,
  0xC0,
  0xD6,
  0x20,
  0x32,
  0x20,
  0x31,
  0x32,
  0x2E,
  0x30,
  0x30,
  0x0A,
  0xBA,
  0xCF,
  0xBC,
  0xC6,
  0x20,
  0x32,
  0x34,
  0x2E,
  0x30,
  0x30,
  0x0A,
  0xD0,
  0xBB,
  0xD0,
  0xBB,
  0xBB,
  0xDD,
  0xB9,
  0xCB,
  0x0A,
  0x1B,
  0x64,
  0x03,
]
const BUILT_IN_COMMAND_IDS = new Set([
  'built-in-text',
  'built-in-chinese-text',
  'built-in-barcode',
  'built-in-qr-code',
  'built-in-image',
  'built-in-label',
  'built-in-table',
  'built-in-two-column',
  'built-in-three-column',
  'built-in-four-column',
])

export function isBuiltInPrinterCommand(command: PrinterCommandTest) {
  return BUILT_IN_COMMAND_IDS.has(command.id)
}

async function sendEscCommand(ctx: PrinterCommandTestContext, build: (esc: PrinterEscBuilder) => void) {
  const esc = new PrinterEscBuilder()
  build(esc)
  await ctx.printEsc(esc.toBytes())
}

export const printerCommandTests: PrinterCommandTest[] = [
  {
    category: '基础文本',
    id: 'print-text',
    title: '语义文本小票',
    description: '测试 printText：标题、多行正文、走纸、切纸。',
    async run(ctx) {
      await ctx.printText({
        title: 'YUNTU PRINTER',
        lines: ['Semantic receipt', 'Line 1 OK', 'Line 2 OK'],
        feed: 3,
        cut: true,
      })
    },
  },
  {
    category: 'ESC/POS 指令',
    id: 'initialize',
    title: '初始化打印机',
    description: '测试 ESC @ 初始化指令，并打印一行确认文本。',
    async run(ctx) {
      await sendEscCommand(ctx, (esc) => {
        esc.escInitializePrinter()
        esc.escText('Initialize printer')
        esc.escNewLine()
        esc.addPrintAndFeedLines(2)
      })
    },
  },
  {
    category: 'ESC/POS 指令',
    id: 'alignment',
    title: '左中右对齐',
    description: '测试 escJustification：left、center、right。',
    async run(ctx) {
      await sendEscCommand(ctx, (esc) => {
        esc.escInitializePrinter()
        esc.escJustification('left')
        esc.escText('Left')
        esc.escNewLine()
        esc.escJustification('center')
        esc.escText('Center')
        esc.escNewLine()
        esc.escJustification('right')
        esc.escText('Right')
        esc.escNewLine()
        esc.addPrintAndFeedLines(2)
      })
    },
  },
  {
    category: 'ESC/POS 指令',
    id: 'character-size',
    title: '字号大小',
    description: '测试 escSetCharcterSize：普通字号和 2 倍字号。',
    async run(ctx) {
      await sendEscCommand(ctx, (esc) => {
        esc.escInitializePrinter()
        esc.escSetCharcterSize(1)
        esc.escText('Size 1')
        esc.escNewLine()
        esc.escSetCharcterSize(2)
        esc.escText('Size 2')
        esc.escNewLine()
        esc.escSetCharcterSize(1)
        esc.addPrintAndFeedLines(2)
      })
    },
  },
  {
    category: 'ESC/POS 指令',
    id: 'emphasized',
    title: '加粗模式',
    description: '测试 escTurnEmphasizedMode：开启和关闭加粗。',
    async run(ctx) {
      await sendEscCommand(ctx, (esc) => {
        esc.escInitializePrinter()
        esc.escTurnEmphasizedMode(true)
        esc.escText('Bold on')
        esc.escNewLine()
        esc.escTurnEmphasizedMode(false)
        esc.escText('Bold off')
        esc.escNewLine()
        esc.addPrintAndFeedLines(2)
      })
    },
  },
  {
    category: 'ESC/POS 指令',
    id: 'feed-lines',
    title: '换行与走纸',
    description: '测试 escNewLine 和 addPrintAndFeedLines。',
    async run(ctx) {
      await sendEscCommand(ctx, (esc) => {
        esc.escInitializePrinter()
        esc.escText('Line A')
        esc.escNewLine()
        esc.escText('Line B')
        esc.escNewLine()
        esc.addPrintAndFeedLines(4)
      })
    },
  },
  {
    category: 'ESC/POS 指令',
    id: 'columns-58',
    title: '58mm 多列文本',
    description: '测试二列、三列、四列文本排版辅助方法。',
    async run(ctx) {
      await sendEscCommand(ctx, (esc) => {
        esc.escInitializePrinter()
        esc.escText(escTwoText58({ left: 'Item A', right: '10.00' }))
        esc.escNewLine()
        esc.escText(escThreeText58({ left: 'Item B', middle: '2', right: '20.00' }))
        esc.escNewLine()
        esc.escText(escFourText58({ one: 'Name', two: 'Qty', three: 'Price', four: 'Total' }))
        esc.escNewLine()
        esc.addPrintAndFeedLines(2)
      })
    },
  },
  {
    category: 'ESC/POS 指令',
    id: 'qr-code',
    title: '二维码',
    description: '测试 escQRCode 二维码指令。',
    async run(ctx) {
      await sendEscCommand(ctx, (esc) => {
        esc.escInitializePrinter()
        esc.escJustification('center')
        esc.escText('QR Code')
        esc.escNewLine()
        esc.escQRCode({ content: 'https://example.com/yuntu-printer', size: 6 })
        esc.addPrintAndFeedLines(3)
      })
    },
  },
  {
    category: '原始数据',
    id: 'raw-string',
    title: '字符串指令',
    description: '测试 escStringCommand 追加字符串数据。',
    async run(ctx) {
      await sendEscCommand(ctx, (esc) => {
        esc.escInitializePrinter()
        esc.escStringCommand('Raw string command')
        esc.escNewLine()
        esc.addPrintAndFeedLines(2)
      })
    },
  },
  {
    category: '原始数据',
    id: 'raw-bytes',
    title: '字节指令',
    description: '测试 escBytesCommand 追加原始字节。',
    async run(ctx) {
      await sendEscCommand(ctx, (esc) => {
        esc.escInitializePrinter()
        esc.escBytesCommand([0x52, 0x61, 0x77, 0x20, 0x62, 0x79, 0x74, 0x65, 0x73])
        esc.escNewLine()
        esc.addPrintAndFeedLines(2)
      })
    },
  },
  {
    category: 'ESC/POS 指令',
    id: 'cut-paper',
    title: '切纸',
    description: '测试 escCutPaper 切纸指令。',
    async run(ctx) {
      await sendEscCommand(ctx, (esc) => {
        esc.escInitializePrinter()
        esc.escText('Cut paper')
        esc.escNewLine()
        esc.addPrintAndFeedLines(3)
        esc.escCutPaper()
      })
    },
  },
  {
    category: '原始数据',
    id: 'print-esc',
    title: '直接发送 ESC/POS',
    description: '测试 printEsc 直接发送完整字节数组。',
    async run(ctx) {
      await ctx.printEsc([
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
      ])
    },
  },
  {
    category: '中文打印',
    id: 'chinese-text',
    title: '中文打印测试',
    description: '测试中文 GBK 字节打印：标题、商品行、合计和结束语。',
    async run(ctx) {
      await ctx.printEsc(CHINESE_PRINT_BYTES)
    },
  },
  {
    category: '内置打印机',
    id: 'built-in-text',
    title: '内置文本打印',
    description: '测试 Noryox 内置打印机 printText 原生文本指令。',
    async run(ctx) {
      if (!ctx.builtIn)
        throw new Error('该测试仅支持 Noryox 内置打印机')
      await ctx.printBuiltInText({
        text: 'Noryox native text',
        format: { align: 'center', style: 'bold', textSize: 32 },
        autoOut: true,
      })
    },
  },
  {
    category: '内置打印机',
    id: 'built-in-chinese-text',
    title: '内置中文打印',
    description: '测试 Noryox 内置打印机原生中文文本输出。',
    async run(ctx) {
      if (!ctx.builtIn)
        throw new Error('该测试仅支持 Noryox 内置打印机')
      await ctx.printBuiltInText({
        text: '中文打印测试\n商品 数量 金额\n可乐 2 12.00\n合计 24.00\n谢谢惠顾',
        format: { align: 'center', textSize: 28 },
        autoOut: true,
      })
    },
  },
  {
    category: '内置打印机',
    id: 'built-in-barcode',
    title: '内置条码打印',
    description: '测试 Noryox 内置打印机 printBarcode 原生条码指令。',
    async run(ctx) {
      if (!ctx.builtIn)
        throw new Error('该测试仅支持 Noryox 内置打印机')
      await ctx.printBuiltInBarcode({
        content: '123456789',
        width: 300,
        height: 160,
        textPosition: 1,
        align: 'center',
        symbology: 'code128',
        autoOut: true,
      })
    },
  },
  {
    category: '内置打印机',
    id: 'built-in-qr-code',
    title: '内置二维码打印',
    description: '测试 Noryox 内置打印机 printQrCode 原生二维码指令。',
    async run(ctx) {
      if (!ctx.builtIn)
        throw new Error('该测试仅支持 Noryox 内置打印机')
      await ctx.printBuiltInQrCode({
        content: 'https://example.com/yuntu-printer',
        width: 300,
        height: 300,
        align: 'center',
        autoOut: true,
      })
    },
  },
  {
    category: '内置打印机',
    id: 'built-in-image',
    title: '内置图片打印',
    description: '测试 Noryox 内置打印机 printImage 原生图片指令。',
    async run(ctx) {
      if (!ctx.builtIn)
        throw new Error('该测试仅支持 Noryox 内置打印机')
      await ctx.printBuiltInImage({
        base64Str: SAMPLE_PNG_BASE64,
        type: 'blackWhite',
        align: 'center',
        autoOut: true,
      })
    },
  },
  {
    category: '内置打印机',
    id: 'built-in-label',
    title: '内置标签打印',
    description: '测试 Noryox 内置打印机 printLabel 标签指令。',
    async run(ctx) {
      if (!ctx.builtIn)
        throw new Error('该测试仅支持 Noryox 内置打印机')
      await ctx.printBuiltInLabel({
        height: 240,
        gap: 16,
        actions: [
          { type: 'text', text: '\nModel:\t\tNB55', format: { textSize: 24 } },
          { type: 'barcode', content: '1234567890987654321', width: 320, height: 90, textPosition: 2, align: 'left', symbology: 'code128' },
        ],
        autoLocate: false,
        detectBeforeLocate: false,
      })
    },
  },
  {
    category: '内置打印机',
    id: 'built-in-table',
    title: '内置表格打印',
    description: '测试 Noryox 内置打印机 printTable 原生表格指令。',
    async run(ctx) {
      if (!ctx.builtIn)
        throw new Error('该测试仅支持 Noryox 内置打印机')
      const headerFormat = { align: 'center' as const, textSize: 24 }
      const leftFormat = { align: 'left' as const, textSize: 24 }
      const centerFormat = { align: 'center' as const, textSize: 24 }
      const weights = [2, 1, 1, 1]
      await ctx.printBuiltInTable({
        rows: [
          { texts: ['商品', '数量', '单价', '金额'], weights, formats: [headerFormat, headerFormat, headerFormat, headerFormat] },
          { texts: ['Coffee', '2', '12.00', '24.00'], weights, formats: [leftFormat, centerFormat, centerFormat, centerFormat] },
        ],
        autoOut: true,
      })
    },
  },
  {
    category: '内置打印机',
    id: 'built-in-two-column',
    title: '内置两列文本',
    description: '测试 Noryox 内置打印机 printBuiltInTwoColumn 绝对定位排版。',
    async run(ctx) {
      if (!ctx.builtIn)
        throw new Error('该测试仅支持 Noryox 内置打印机')
      await ctx.printBuiltInTwoColumn({
        leftText: 'Total:',
        rightText: '9998.00',
        autoOut: true,
      })
    },
  },
  {
    category: '内置打印机',
    id: 'built-in-three-column',
    title: '内置三列文本',
    description: '测试 Noryox 内置打印机 printBuiltInThreeColumn 绝对定位排版。',
    async run(ctx) {
      if (!ctx.builtIn)
        throw new Error('该测试仅支持 Noryox 内置打印机')
      await ctx.printBuiltInThreeColumn({
        leftText: 'Coffee',
        middleText: 'x2',
        rightText: '24.00',
        autoOut: true,
      })
    },
  },
  {
    category: '内置打印机',
    id: 'built-in-four-column',
    title: '内置四列文本',
    description: '测试 Noryox 内置打印机 printBuiltInFourColumn 绝对定位排版。',
    async run(ctx) {
      if (!ctx.builtIn)
        throw new Error('该测试仅支持 Noryox 内置打印机')
      await ctx.printBuiltInFourColumn({
        oneText: 'Coffee',
        twoText: '2',
        threeText: '12.00',
        fourText: '24.00',
        autoOut: true,
      })
    },
  },
]
