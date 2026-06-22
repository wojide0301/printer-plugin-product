import { describe, expect, it, vi } from 'vitest'
import { printerCommandTests } from './printerCommandTests'

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
    ])
  })

  it('keeps every command test ready for rendering and execution', () => {
    printerCommandTests.forEach((item) => {
      expect(item.title.length).toBeGreaterThan(0)
      expect(item.description.length).toBeGreaterThan(0)
      expect(typeof item.run).toBe('function')
    })
  })

  it('does not call UTS string-returning column helpers while building the 58mm column test', () => {
    const columnsTest = printerCommandTests.find(item => item.id === 'columns-58')
    const context = {
      addPrintAndFeedLines: vi.fn(),
      clearCommandBuffer: vi.fn(),
      escBytesCommand: vi.fn(),
      escCutPaper: vi.fn(),
      escFourText58: vi.fn(() => {
        throw new Error('should not call UTS escFourText58')
      }),
      escInitializePrinter: vi.fn(),
      escJustification: vi.fn(),
      escNewLine: vi.fn(),
      escQRCode: vi.fn(),
      escSetCharcterSize: vi.fn(),
      escStringCommand: vi.fn(),
      escText: vi.fn(),
      escThreeText58: vi.fn(() => {
        throw new Error('should not call UTS escThreeText58')
      }),
      escTurnEmphasizedMode: vi.fn(),
      escTwoText58: vi.fn(() => {
        throw new Error('should not call UTS escTwoText58')
      }),
      printEsc: vi.fn(),
      printText: vi.fn(),
      writeData: vi.fn(),
    }

    expect(columnsTest).toBeDefined()
    columnsTest?.run(context)

    expect(context.escTwoText58).not.toHaveBeenCalled()
    expect(context.escThreeText58).not.toHaveBeenCalled()
    expect(context.escFourText58).not.toHaveBeenCalled()
    expect(context.escText).toHaveBeenCalledWith(expect.stringContaining('Item A'))
  })
})
