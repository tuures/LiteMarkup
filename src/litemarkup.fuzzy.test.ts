import { parser, renderHtml } from './litemarkup'

let lastChar = ''
const randomString = (length: number): string =>
  Array.from({ length }, () => {
    if (Math.random() < 0.1) {
      return '\n'
    }
    const code = Math.floor(Math.random() * 150)
    if (code >= 32 && code <= 126) {
      const char = String.fromCharCode(code)
      lastChar = char

      return char
    } else {
      return lastChar
    }
  }).join('')

describe('fuzzy testing', () => {
  test('parser never throws on random input', () => {
    for (let i = 0; i < 5000; i++) {
      const input = randomString(Math.floor(Math.random() * 5000))
      expect(() => {
        const ast = parser()(input)
        renderHtml(ast)
      }).not.toThrow()
    }
  })
})
