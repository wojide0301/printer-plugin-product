import { describe, expect, it } from 'vitest'
import { getPrinterErrorMessage } from './printerErrors'

describe('getPrinterErrorMessage', () => {
  it('uses errMsg from printer errors', () => {
    expect(getPrinterErrorMessage({ errMsg: 'Noryox printer SDK returned -1002: 参数错误' })).toBe('Noryox printer SDK returned -1002: 参数错误')
  })

  it('falls back when UTS error objects do not expose message fields', () => {
    expect(getPrinterErrorMessage({}, '内置标签打印发送失败')).toBe('内置标签打印发送失败')
  })
})
