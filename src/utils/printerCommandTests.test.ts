import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { isBuiltInPrinterCommand, printerCommandTests } from './printerCommandTests'

function createMockEsc() {
  return {
    available: true,
  }
}

function createMockBuiltIn() {
  return {
    available: true,
  }
}

function createCommandContext() {
  return {
    esc: createMockEsc(),
    builtIn: createMockBuiltIn(),
    sendEsc: vi.fn().mockResolvedValue({}),
    printText: vi.fn().mockResolvedValue(undefined),
    printEsc: vi.fn().mockResolvedValue(undefined),
    printBuiltInText: vi.fn().mockResolvedValue({ code: 0, ok: true, message: '成功' }),
    printBuiltInBarcode: vi.fn().mockResolvedValue({ code: 0, ok: true, message: '成功' }),
    printBuiltInQrCode: vi.fn().mockResolvedValue({ code: 0, ok: true, message: '成功' }),
    printBuiltInImage: vi.fn().mockResolvedValue({ code: 0, ok: true, message: '成功' }),
    printBuiltInLabel: vi.fn().mockResolvedValue({ code: 0, ok: true, message: '成功' }),
    printBuiltInTable: vi.fn().mockResolvedValue(undefined),
    printBuiltInTwoColumn: vi.fn().mockResolvedValue({ code: 0, ok: true, message: '成功' }),
    printBuiltInThreeColumn: vi.fn().mockResolvedValue({ code: 0, ok: true, message: '成功' }),
    printBuiltInFourColumn: vi.fn().mockResolvedValue({ code: 0, ok: true, message: '成功' }),
  }
}

describe('printerCommandTests', () => {
  it('covers all main printable command APIs', () => {
    expect(printerCommandTests.map(item => item.id)).toEqual([
      'print-text',
      'initialize',
      'alignment',
      'character-size',
      'emphasized',
      'feed-lines',
      'columns-58',
      'qr-code',
      'raw-string',
      'raw-bytes',
      'cut-paper',
      'print-esc',
      'built-in-text',
      'built-in-barcode',
      'built-in-qr-code',
      'built-in-image',
      'built-in-label',
      'built-in-table',
      'built-in-two-column',
      'built-in-three-column',
      'built-in-four-column',
    ])
  })

  it('keeps every command test ready for rendering and execution', () => {
    printerCommandTests.forEach((item) => {
      expect(item.title.length).toBeGreaterThan(0)
      expect(item.description.length).toBeGreaterThan(0)
      expect(typeof item.run).toBe('function')
    })
  })

  it('builds 58mm column ESC/POS bytes without relying on UTS builder object methods', async () => {
    const columnsTest = printerCommandTests.find(item => item.id === 'columns-58')
    const ctx = createCommandContext()

    expect(columnsTest).toBeDefined()
    await columnsTest?.run(ctx)

    expect(ctx.printEsc).toHaveBeenCalledWith(expect.arrayContaining([
      0x1B,
      0x40,
      ...Array.from('Item A').map(char => char.charCodeAt(0)),
      0x0A,
    ]))
    expect(ctx.sendEsc).not.toHaveBeenCalled()
  })

  it('uses top-level built-in table command instead of relying on object methods', async () => {
    const tableTest = printerCommandTests.find(item => item.id === 'built-in-table')
    const ctx = createCommandContext()

    expect(tableTest).toBeDefined()
    await tableTest?.run(ctx)

    expect(ctx.printBuiltInTable).toHaveBeenCalledWith({
      rows: [
        {
          texts: ['商品', '数量', '单价', '金额'],
          weights: [2, 1, 1, 1],
          formats: [
            { align: 'center', textSize: 24 },
            { align: 'center', textSize: 24 },
            { align: 'center', textSize: 24 },
            { align: 'center', textSize: 24 },
          ],
        },
        {
          texts: ['Coffee', '2', '12.00', '24.00'],
          weights: [2, 1, 1, 1],
          formats: [
            { align: 'left', textSize: 24 },
            { align: 'center', textSize: 24 },
            { align: 'center', textSize: 24 },
            { align: 'center', textSize: 24 },
          ],
        },
      ],
      autoOut: true,
    })
    expect(ctx.sendEsc).not.toHaveBeenCalled()
  })

  it('keeps built-in table weights out of typed UTS bridge rows', () => {
    const interfaceSource = readFileSync(resolve(process.cwd(), 'src/uni_modules/yuntu-printer-uts/utssdk/interface.uts'), 'utf8')

    expect(interfaceSource).toContain('type PrintBuiltInTableTextOptions = UTSJSONObject')
    expect(interfaceSource).not.toContain('weights: number[]')
    expect(interfaceSource).not.toContain('weights: Int[]')
  })

  it('keeps built-in label actions out of typed UTS bridge arrays', () => {
    const interfaceSource = readFileSync(resolve(process.cwd(), 'src/uni_modules/yuntu-printer-uts/utssdk/interface.uts'), 'utf8')

    expect(interfaceSource).toContain('type PrintBuiltInLabelOptions = UTSJSONObject')
    expect(interfaceSource).not.toContain('actions: BuiltInLabelAction[]')
  })

  it('documents the current ESC builder and top-level built-in printer APIs', () => {
    const rootReadme = readFileSync(resolve(process.cwd(), 'README.md'), 'utf8')
    const pluginReadme = readFileSync(resolve(process.cwd(), 'src/uni_modules/yuntu-printer-uts/README.md'), 'utf8')
    const combined = `${rootReadme}\n${pluginReadme}`

    expect(combined).toContain('createEscBuilder()')
    expect(combined).toContain('sendEsc(esc)')
    expect(combined).toContain('printBuiltInLabel({')
    expect(combined).not.toContain('.clear()')
    expect(combined).not.toContain('.init()')
    expect(combined).not.toContain('.send()')
  })

  it('keeps TypeScript declarations aligned with Promise API return values', () => {
    const declarationSource = readFileSync(resolve(process.cwd(), 'src/uni_modules/yuntu-printer-uts/index.d.ts'), 'utf8')

    expect(declarationSource).toContain('export function disconnectPrinter(): Promise<boolean>')
    expect(declarationSource).toContain('printTable(rows: BuiltInTableRow[], autoOut?: boolean): Promise<boolean>')
    expect(declarationSource).toContain('export function printBuiltInTable(options: PrintBuiltInTableOptions): Promise<boolean>')
  })

  it('identifies Noryox built-in printer commands', () => {
    expect(printerCommandTests.filter(isBuiltInPrinterCommand).map(item => item.id)).toEqual([
      'built-in-text',
      'built-in-barcode',
      'built-in-qr-code',
      'built-in-image',
      'built-in-label',
      'built-in-table',
      'built-in-two-column',
      'built-in-three-column',
      'built-in-four-column',
    ])
  })

  it('uses top-level built-in commands for text, barcode, image, and label tests', async () => {
    const ctx = createCommandContext()

    await printerCommandTests.find(item => item.id === 'built-in-text')?.run(ctx)
    await printerCommandTests.find(item => item.id === 'built-in-barcode')?.run(ctx)
    await printerCommandTests.find(item => item.id === 'built-in-image')?.run(ctx)
    await printerCommandTests.find(item => item.id === 'built-in-label')?.run(ctx)

    expect(ctx.printBuiltInText).toHaveBeenCalledWith({
      text: 'Noryox native text',
      format: { align: 'center', style: 'bold', textSize: 32 },
      autoOut: true,
    })
    expect(ctx.printBuiltInBarcode).toHaveBeenCalledWith({
      content: '123456789',
      width: 300,
      height: 160,
      textPosition: 1,
      align: 'center',
      symbology: 'code128',
      autoOut: true,
    })
    expect(ctx.printBuiltInImage).toHaveBeenCalledWith({
      base64Str: expect.any(String),
      type: 'blackWhite',
      align: 'center',
      autoOut: true,
    })
    expect(ctx.printBuiltInLabel).toHaveBeenCalledWith({
      height: 240,
      gap: 16,
      actions: [
        { type: 'text', text: '\nModel:\t\tNB55', format: { textSize: 24 } },
        { type: 'barcode', content: '1234567890987654321', width: 320, height: 90, textPosition: 2, align: 'left', symbology: 'code128' },
      ],
      autoLocate: false,
      detectBeforeLocate: false,
    })
  })

  it('uses top-level built-in commands for qr code and column tests', async () => {
    const ctx = createCommandContext()

    await printerCommandTests.find(item => item.id === 'built-in-qr-code')?.run(ctx)
    await printerCommandTests.find(item => item.id === 'built-in-two-column')?.run(ctx)
    await printerCommandTests.find(item => item.id === 'built-in-three-column')?.run(ctx)
    await printerCommandTests.find(item => item.id === 'built-in-four-column')?.run(ctx)

    expect(ctx.printBuiltInQrCode).toHaveBeenCalledWith({
      content: 'https://example.com/yuntu-printer',
      width: 300,
      height: 300,
      align: 'center',
      autoOut: true,
    })
    expect(ctx.printBuiltInTwoColumn).toHaveBeenCalledWith({
      leftText: 'Total:',
      rightText: '9998.00',
      autoOut: true,
    })
    expect(ctx.printBuiltInThreeColumn).toHaveBeenCalledWith({
      leftText: 'Coffee',
      middleText: 'x2',
      rightText: '24.00',
      autoOut: true,
    })
    expect(ctx.printBuiltInFourColumn).toHaveBeenCalledWith({
      oneText: 'Coffee',
      twoText: '2',
      threeText: '12.00',
      fourText: '24.00',
      autoOut: true,
    })
    expect(ctx.sendEsc).not.toHaveBeenCalled()
  })
})
