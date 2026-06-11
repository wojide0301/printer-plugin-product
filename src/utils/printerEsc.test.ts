import { describe, expect, it } from 'vitest'
import {
  buildReceipt,
  dotFromMm,
  escFourText58,
  escThreeText58,
  escTwoText58,
  PrinterEscBuilder,
} from './printerEsc'

describe('printerEsc', () => {
  it('converts mm to dots using GPrinter document dpi rules', () => {
    expect(dotFromMm(10, 200)).toBe(80)
    expect(dotFromMm(10, 300)).toBe(120)
  })

  it('builds control commands in the documented order', () => {
    const builder = new PrinterEscBuilder()
    builder.escInitializePrinter()
    builder.escJustification('center')
    builder.escSetCharcterSize(2)
    builder.escTurnEmphasizedMode(true)
    builder.escText('WOT')
    builder.escNewLine()
    builder.addPrintAndFeedLines(3)
    builder.escCutPaper()

    expect(builder.toBytes()).toEqual([
      0x1B,
      0x40,
      0x1B,
      0x61,
      0x01,
      0x1D,
      0x21,
      0x11,
      0x1B,
      0x45,
      0x01,
      0x57,
      0x4F,
      0x54,
      0x0A,
      0x1B,
      0x64,
      0x03,
      0x1D,
      0x56,
      0x42,
      0x00,
    ])
  })

  it('supports raw string and raw byte commands', () => {
    const builder = new PrinterEscBuilder()
    builder.escStringCommand('ABC')
    builder.escBytesCommand([0x01, 0x02, 300, -1])

    expect(builder.toBytes()).toEqual([0x41, 0x42, 0x43, 0x01, 0x02, 0xFF, 0x00])
  })

  it('creates 58mm two column helper text', () => {
    expect(escTwoText58({ left: '合计:', right: '1314.00' })).toBe(`合计:${' '.repeat(20)}1314.00`)
  })

  it('creates 58mm three and four column helper text', () => {
    expect(escThreeText58({ left: '北京烤鸭', middle: '1', right: '99.99' })).toBe(`北京烤鸭${' '.repeat(14)}1${' '.repeat(5)}99.99`)
    expect(escFourText58({ one: 'one', two: 'two', three: 'three', four: 'four' })).toBe('one       two       three     four')
  })

  it('builds QR code commands', () => {
    const builder = new PrinterEscBuilder()
    builder.escQRCode({ content: 'www.baidu.com', size: 5 })

    expect(builder.toBytes()).toEqual([
      0x1D,
      0x28,
      0x6B,
      0x03,
      0x00,
      0x31,
      0x43,
      0x05,
      0x1D,
      0x28,
      0x6B,
      0x03,
      0x00,
      0x31,
      0x45,
      0x30,
      0x1D,
      0x28,
      0x6B,
      0x10,
      0x00,
      0x31,
      0x50,
      0x30,
      0x77,
      0x77,
      0x77,
      0x2E,
      0x62,
      0x61,
      0x69,
      0x64,
      0x75,
      0x2E,
      0x63,
      0x6F,
      0x6D,
      0x1D,
      0x28,
      0x6B,
      0x03,
      0x00,
      0x31,
      0x51,
      0x30,
    ])
  })

  it('builds a complete receipt payload', () => {
    expect(buildReceipt({
      title: 'WOT',
      lines: ['Printer Plugin', 'OK'],
      feed: 2,
      cut: true,
    })).toEqual([
      0x1B,
      0x40,
      0x1B,
      0x61,
      0x01,
      0x57,
      0x4F,
      0x54,
      0x0A,
      0x1B,
      0x61,
      0x00,
      0x50,
      0x72,
      0x69,
      0x6E,
      0x74,
      0x65,
      0x72,
      0x20,
      0x50,
      0x6C,
      0x75,
      0x67,
      0x69,
      0x6E,
      0x0A,
      0x4F,
      0x4B,
      0x0A,
      0x1B,
      0x64,
      0x02,
      0x1D,
      0x56,
      0x42,
      0x00,
    ])
  })
})
