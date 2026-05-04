import { convertToHtml, htmlRenderer, parser } from 'litemarkup'
import { htmlRenderer as htmlRendererDirect } from 'litemarkup/html'
import { parser as parserDirect } from 'litemarkup/parser'

const input = '# Hello *world*'
const expectedHtml = '<h1>Hello <b>world</b></h1>'

Deno.test('facade import: parser, htmlRenderer, convertToHtml', () => {
  const parse = parser()
  const render = htmlRenderer()

  if (render(parse(input)) !== expectedHtml) {
    throw new Error(`Facade imports failed`)
  }
  if (convertToHtml(input) !== expectedHtml) {
    throw new Error(`convertToHtml failed`)
  }
})

Deno.test('direct subpath imports: parser, htmlRenderer', () => {
  const parse = parserDirect()
  const render = htmlRendererDirect()

  if (render(parse(input)) !== expectedHtml) {
    throw new Error(`Subpath imports failed`)
  }
})
