import { runCli } from './cli'

test('basic heading', () => {
  expect(runCli([], '# Hello')).toBe('<h1>Hello</h1>')
})

test('multi-line input', () => {
  expect(runCli([], '# Hi\n\nA paragraph.')).toBe('<h1>Hi</h1>\n<p>A paragraph.</p>')
})

test('links are textified by default', () => {
  expect(runCli([], '[click](http://example.com)')).toBe(
    '<p>[click]&lt;http://example.com&gt;</p>',
  )
})

test('HTML blocks are textified by default', () => {
  const input = '<div>\nhello\n</div>\n'
  expect(runCli([], input)).toBe('<p>&lt;div&gt;\nhello\n&lt;/div&gt;</p>')
})

test('--allow-unsafe-html enables links', () => {
  expect(runCli(['--allow-unsafe-html'], '[click](http://example.com)')).toBe(
    '<p><a href="http://example.com">click</a></p>',
  )
})

test('--allow-unsafe-html enables images', () => {
  expect(runCli(['--allow-unsafe-html'], '![alt](http://example.com/img.png)')).toBe(
    '<p><img alt="alt" src="http://example.com/img.png"/></p>',
  )
})

test('--allow-unsafe-html enables HTML blocks', () => {
  const input = '<div>\nhello\n</div>\n'
  expect(runCli(['--allow-unsafe-html'], input)).toBe('<div>\nhello\n</div>')
})

test('--markdown-mode uses **bold** and *italic*', () => {
  expect(runCli(['--markdown-mode'], '**bold** and *italic*')).toBe(
    '<p><b>bold</b> and <i>italic</i></p>',
  )
})

test('without --markdown-mode uses *bold* and _italic_', () => {
  expect(runCli([], '*bold* and _italic_')).toBe('<p><b>bold</b> and <i>italic</i></p>')
})

test('unknown flags are ignored', () => {
  expect(runCli(['--unknown-flag-xyz'], '# Hi')).toBe('<h1>Hi</h1>')
})

test('the order of flags doesn’t matter', () => {
  const input = '**bold** [link](http://example.com)'
  const expected = runCli(['--markdown-mode', '--allow-unsafe-html'], input)
  expect(runCli(['--allow-unsafe-html', '--markdown-mode'], input)).toBe(expected)
})
