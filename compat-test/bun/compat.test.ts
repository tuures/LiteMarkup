import { describe, expect, test } from 'bun:test'

import { convertToHtml, htmlRenderer, parser } from 'litemarkup'
import { htmlRenderer as htmlRendererDirect } from 'litemarkup/html'
import { parser as parserDirect } from 'litemarkup/parser'

const input = '# Hello *world*'
const expectedHtml = '<h1>Hello <b>world</b></h1>'

describe('litemarkup Bun compatibility', () => {
  test('facade import: parser, htmlRenderer, convertToHtml', () => {
    const parse = parser()
    const render = htmlRenderer()

    expect(render(parse(input))).toBe(expectedHtml)
    expect(convertToHtml(input)).toBe(expectedHtml)
  })

  test('direct subpath imports: parser, htmlRenderer', () => {
    const parse = parserDirect()
    const render = htmlRendererDirect()

    expect(render(parse(input))).toBe(expectedHtml)
  })
})
