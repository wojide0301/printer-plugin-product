export type Dpi = 200 | 300
export type Position = 'left' | 'center' | 'right'

export interface ReceiptPayload {
  title: string
  lines: string[]
  feed?: number
  cut?: boolean
}

export interface TwoColumnText {
  left: string
  right: string
}

export interface ThreeColumnText {
  left: string
  middle: string
  right: string
}

export interface FourColumnText {
  one: string
  two: string
  three: string
  four: string
}

export interface EscQRCodeParam {
  content: string
  size: number
}

export interface EscImageParam {
  base64Str: string
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.trunc(value)))
}

function encodeAscii(value: string): number[] {
  return Array.from(value).map((char) => {
    const code = char.charCodeAt(0)
    return code <= 0x7F ? code : 0x3F
  })
}

function charWidth(char: string): number {
  return char.charCodeAt(0) > 0x7F ? 2 : 1
}

function displayWidth(value: string): number {
  return Array.from(value).reduce((total, char) => total + charWidth(char), 0)
}

function padEndDisplay(value: string, width: number): string {
  return `${value}${' '.repeat(Math.max(0, width - displayWidth(value)))}`
}

function padColumns(values: string[], widths: number[]): string {
  return values.map((value, index) => padEndDisplay(value, widths[index])).join('').trimEnd()
}

export function dotFromMm(mm: number, dpi: Dpi): number {
  return Math.trunc(mm * (dpi === 200 ? 8 : 12))
}

export function escTwoText58(payload: TwoColumnText): string {
  const spaces = Math.max(1, 32 - displayWidth(payload.left) - displayWidth(payload.right))
  return `${payload.left}${' '.repeat(spaces)}${payload.right}`
}

export function escThreeText58(payload: ThreeColumnText): string {
  return padColumns([payload.left, payload.middle, payload.right], [22, 6, 0])
}

export function escFourText58(payload: FourColumnText): string {
  return padColumns([payload.one, payload.two, payload.three, payload.four], [10, 10, 10, 0])
}

export class PrinterEscBuilder {
  private bytes: number[] = []

  clearCommandBuffer() {
    this.bytes = []
  }

  escInitializePrinter() {
    this.bytes.push(0x1B, 0x40)
  }

  escJustification(position: Position) {
    const value = position === 'center' ? 1 : position === 'right' ? 2 : 0
    this.bytes.push(0x1B, 0x61, value)
  }

  escSetCharcterSize(size: 1 | 2) {
    this.bytes.push(0x1D, 0x21, size === 2 ? 0x11 : 0x00)
  }

  escTurnEmphasizedMode(on: boolean) {
    this.bytes.push(0x1B, 0x45, on ? 1 : 0)
  }

  escCutPaper() {
    this.bytes.push(0x1D, 0x56, 0x42, 0x00)
  }

  escNewLine() {
    this.bytes.push(0x0A)
  }

  addPrintAndFeedLines(lines: number) {
    this.bytes.push(0x1B, 0x64, clampByte(lines))
  }

  escText(text: string) {
    this.bytes.push(...encodeAscii(text))
  }

  escQRCode(payload: EscQRCodeParam) {
    const content = encodeAscii(payload.content)
    const length = content.length + 3
    this.bytes.push(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, clampByte(payload.size))
    this.bytes.push(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x30)
    this.bytes.push(0x1D, 0x28, 0x6B, length & 0xFF, (length >> 8) & 0xFF, 0x31, 0x50, 0x30, ...content)
    this.bytes.push(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30)
  }

  escImage(_payload: EscImageParam) {
    throw new Error('escImage requires platform image decoding and is implemented in UTS.')
  }

  escStringCommand(command: string) {
    this.bytes.push(...encodeAscii(command))
  }

  escBytesCommand(command: number[]) {
    this.bytes.push(...command.map(clampByte))
  }

  toBytes(): number[] {
    return [...this.bytes]
  }
}

export function buildReceipt(payload: ReceiptPayload): number[] {
  const builder = new PrinterEscBuilder()
  builder.escInitializePrinter()
  builder.escJustification('center')
  builder.escText(payload.title)
  builder.escNewLine()
  builder.escJustification('left')

  payload.lines.forEach((line) => {
    builder.escText(line)
    builder.escNewLine()
  })

  builder.addPrintAndFeedLines(payload.feed ?? 3)

  if (payload.cut !== false) {
    builder.escCutPaper()
  }

  return builder.toBytes()
}
