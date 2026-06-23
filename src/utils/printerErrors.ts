export function getPrinterErrorMessage(error: unknown, fallback = '打印机操作失败'): string {
  if (typeof error === 'string') {
    return error
  }

  if (error instanceof Error && error.message.length > 0) {
    return error.message
  }

  if (error != null && typeof error === 'object') {
    const record = error as Record<string, unknown>
    const errMsg = record.errMsg
    if (typeof errMsg === 'string' && errMsg.length > 0) {
      return errMsg
    }

    const message = record.message
    if (typeof message === 'string' && message.length > 0) {
      return message
    }
  }

  return fallback
}
