import { parseToAst, astToHtml, convertToHtml } from './litemarkup'

import * as Ast from './ast'

test('basic', () => {
  const src = `
### foo😀

***

this will be <b>just text not html</b> and&amp will be escaped in output;

text followed immediately by a
# heading

This is a list:
- one
- two
- three
- fourth item

  Another paragraph inside the fourth item

- fifth

1. first
2. second
3. third

just a paragraph

  \`\`\`\`clara
  foo = bar
   bar = zot
   1 < 2
  \`\`\`\`

immediate code:
\`\`\`
  foo = bar
\`\`\`

\`\`\`
\`\`\`

\`\`\`justnewline">eviltext

\`\`\`

text not part of quote
> quote here

> # heading in quote
> something <nottag>
Every line in a blockquote must be prefixed with a >, even the empty ones. This lines breaks the quote into two.
> another quote

>
> level 1
> > level 2
> > level 2
> level 1 continues
>
>

<div>
embedded raw html, not escaped
and can contain multiple lines
</div>

<broken>
oops </broken> html
</broken>

abc\` def \` bar

a \`\`0doo

b \` \`1doo

c \`  \`2doo

d \`   \`3doo

e \`foo\`\` 12dii

f \`\`foo\` 21dii

g \`\`foo\`\` 22dii

h\`i\\
xfoobar

xyz\\\`xyz\\
yfoobar

br in the end \\

*I'm bold*

_I'm italic_

*bold outside and _italic inside_*

_not bold start

not bold ending_

aftert this comes a few paragraphs with just one character

a

#

_

aftert this comes a text content that is just one characters

a*bold*

_italic_s

\\!\\"\\#\\$\\%\\&\\'\\(\\)\\*\\+\\,\\-\\.\\/\\:\\;\\<\\=\\>\\?\\@\\[\\\\\\]\\^\\_\\\`\\{\\|\\}\\~

\\→\\A\\a\\ \\3\\φ\\«

\\*not emphasized*

*emphasized star\\**

_\\_italic underlines\\__

_italic underline\\_and star*_

\\\\*emphasis*

*notbold\`*\`

this paragraph has a [link to](/thisurl) and some parenthesis []() that is not a link

[[foo\\]a](ds\\)fd\\)\\\`)

![image of a cat](/ordidnthappen.jpg)

`
  const ast = parseToAst()(src)
  expect(ast).toMatchSnapshot()

  const html = astToHtml(ast)
  expect(html).toMatchSnapshot()
})

test('markdown compatibility mode', () => {
  const src = `
**I'm bold**
__I'm bold too__

_I'm italic_
*I'm italic too*

these are supported:
**A bold outside and _italic inside_**
__B bold outside and *italic inside*__
_C italic outside and **bold inside**_
*D italic outside and __bold inside__*

these nestings are not supported (only outer will be applied):
**E bold outside *but not italic inside***
__F bold outside _but not italic inside___
_G italic outside __but not bold inside___
*H italic outside **but not bold inside***

_not italic

not italic_

a**bold**

_italic_s

\\*not emphasized*

*emphasized star\\**

_\\_italic underlines\\__

_italic underline\\_and star*_

\\\\*emphasis after a literal backslash*

*just plain p before code\`*\`

`
  const ast = parseToAst({ markdownMode: true })(src)
  expect(ast).toMatchSnapshot()

  const html = astToHtml(ast)
  expect(html).toMatchSnapshot()
})

test('multiple images in series', () => {
  const src = `
![image of a cat](/ordidnthappen.jpg) and
second ![image of a cat](/ordidnthappen.jpg)
`
  const ast = parseToAst()(src)
  expect(ast).toMatchSnapshot()

  const html = astToHtml(ast)
  expect(html).toMatchSnapshot()
})

test('list with marker character in content', () => {
  const src = `
- foo - the first item
- bar-second
- baz- the third
- bam -fourth
`
  const ast = parseToAst()(src)
  expect(ast).toMatchSnapshot()

  const html = astToHtml(ast)
  expect(html).toMatchSnapshot()
})

test('nested lists', () => {
  const src = `
- foo
  - foo1
  - foo2
    > foo2
    > foo2
- bar
   * bar1
   * bar2
* another list
`
  const ast = parseToAst()(src)
  expect(ast).toMatchSnapshot()

  const html = astToHtml(ast)
  expect(html).toMatchSnapshot()
})

test('codeblock without content', () => {
  const src = `
\`\`\`foo
\`\`\`

something after
`
  const ast = parseToAst()(src)
  expect(ast).toMatchSnapshot()

  const html = astToHtml(ast)
  expect(html).toMatchSnapshot()
})

test('codeblock with info text having quotes', () => {
  const src = `
\`\`\`foo""
\`\`\`

something after
`
  const ast = parseToAst()(src)
  expect(ast).toMatchSnapshot()

  const html = astToHtml(ast)
  expect(html).toMatchSnapshot()
})

test('codeblock without end', () => {
  const src = `
\`\`\`foo
`
  const ast = parseToAst()(src)
  expect(ast).toMatchSnapshot()

  const html = astToHtml(ast)
  expect(html).toMatchSnapshot()
})

test('codeblock with broken end', () => {
  const src = `
\`\`\`foo
\`\`
`
  const ast = parseToAst()(src)
  expect(ast).toMatchSnapshot()

  const html = astToHtml(ast)
  expect(html).toMatchSnapshot()
})

test('codeblock with broken end on the same line / codespan with missing backticks in the end', () => {
  const src = `
\`\`\`foo\`\`
`
  const ast = parseToAst()(src)
  expect(ast).toMatchSnapshot()

  const html = astToHtml(ast)
  expect(html).toMatchSnapshot()
})

test('codespan with extra backticks on the start', () => {
  const src = `
foo \`\`\`foo\`\`
`
  const ast = parseToAst()(src)
  expect(ast).toMatchSnapshot()

  const html = astToHtml(ast)
  expect(html).toMatchSnapshot()
})

test('codespan with extra backticks on the end', () => {
  const src = `
\`\`foo\`\`\`
`
  const ast = parseToAst()(src)
  expect(ast).toMatchSnapshot()

  const html = astToHtml(ast)
  expect(html).toMatchSnapshot()
})

test('codespan with three backticks in the beginning of a paragraph (not codeblock)', () => {
  const src = `
\`\`\`foo\`\`\`
`
  const ast = parseToAst()(src)
  expect(ast).toMatchSnapshot()

  const html = astToHtml(ast)
  expect(html).toMatchSnapshot()
})

test('escaped characters in code spans', () => {
  const src = '`\\*not special\\*`'
  const html = convertToHtml(src)
  expect(html).toContain('<code>\\*not special\\*</code>')
})

test('empty paragraph in the end of the file', () => {
  const src = 'foo\n  '
  const ast = parseToAst()(src)
  expect(ast).toMatchSnapshot()

  const html = astToHtml(ast)
  expect(html).toMatchSnapshot()
})

test('transform', () => {
  const src = `
a

b _c_ d
`

  const duplicate = (n: Ast.Block): Ast.Block[] => {
    if (n.name === 'p' && n.body.length === 1 && n.body[0].name === '' && n.body[0].txt === 'a') {
      return [n, n]
    } else {
      return [n]
    }
  }

  const convertItalicToBold = (n: Ast.Inline): Ast.Inline[] => {
    if (n.name === 'i') {
      return [{ ...n, name: 'b' }]
    } else {
      return [n]
    }
  }

  const ast = parseToAst({ transformBlock: duplicate, transformInline: convertItalicToBold })(src)
  expect(ast).toMatchSnapshot()

  const html = astToHtml(ast)
  expect(html).toMatchSnapshot()
})

test('convertToHtml allowUnsafeHtml', () => {
  const src = `
start

<div>
inside div
</div>

end
`
  const html1 = convertToHtml(src)
  expect(html1).not.toContain('<div>')
  expect(html1).toMatchSnapshot()

  const html2 = convertToHtml(src, { allowUnsafeHtml: true })
  expect(html2).toContain('<div>')
  expect(html2).toMatchSnapshot()
})

test('zero-width characters', () => {
  const src = 'foo\u200B\u200Cbar'
  const ast = parseToAst()(src)
  expect(JSON.stringify(ast)).toContain('"' + src + '"')
})

test('RTL and mixed directional text', () => {
  const src = `# مرحبا Hello עברית`
  const ast = parseToAst()(src)
  expect(ast).toMatchSnapshot()
})

test('emojis', () => {
  const src = `
# 🎉 Emoji heading 🎊

*bold 💪 text*

- 📌 list item
- second 🔥

\`code 💻 span\`

[link 🔗](https://example.com/🔥)
`
  const ast = parseToAst()(src)
  expect(ast).toMatchSnapshot()
})

test('complex unicode', () => {
  const src = '𝕳𝖊𝖑𝖑𝖔 𝕎𝕠𝕣𝕝𝕕 café e\u0301'
  const ast = parseToAst()(src)
  const html = astToHtml(ast)
  expect(html).toContain(src)
})

test('heading with max level', () => {
  const src = '###### h6\n####### not h7'
  const ast = parseToAst()(src)
  expect(ast[0]).toMatchObject({ name: 'h', level: 6 })
  expect(ast[1]).toMatchObject({ name: 'p' })
})

test('list starting at max number', () => {
  const src = '999999999. max ordered list number'
  const ast = parseToAst()(src)
  expect(ast[0].name).toEqual('l')
})

test('list number overflow', () => {
  const src = '9999999999. exceeds 9 digits'
  const ast = parseToAst()(src)
  expect(ast[0].name).toEqual('p')
})

test('tabs vs spaces in indentation', () => {
  const src = '- item\n\t- tab indented\n  - space indented'
  const ast = parseToAst()(src)
  expect(ast).toMatchSnapshot()
})

test('trailing spaces everywhere', () => {
  const src = '# heading   \n\nparagraph   \n\n- list   '
  const ast = parseToAst()(src)
  expect(ast).toMatchSnapshot()
})

test('only carriage returns', () => {
  const src = 'p1s1\rp1s2\r\r\rp1s3'
  const ast = parseToAst()(src)
  expect(ast.length).toEqual(1)
  expect(ast).toMatchSnapshot()
})

test('mixed line endings', () => {
  const src = 'p1line1\n\np2line1\r\n\r\np2s2\rp2s3'
  const ast = parseToAst()(src)
  expect(ast.length).toEqual(2)
  expect(ast).toMatchSnapshot()
})

test('form feed and vertical tab', () => {
  const src = 'foo\f\vbar'
  const ast = parseToAst()(src)
  expect(ast.length).toEqual(1)
  const html = astToHtml(ast)
  expect(html).toContain(src)
})

// test('parenthesis in url', () => {
//   const src = '[click me](/go?param=\\(value\\))'
//   const html = convertToHtml(src)
//   expect(html).toContain('/go?param=(value)')
// })

// test('javascript URL in link', () => {
//   const src = '[click me](javascript:alert(1))'
//   const html = convertToHtml(src)
//   expect(html).toMatchSnapshot()
// })

// test('data URL in image', () => {
//   const src = '![img](data:text/html,<script>alert(1)</script>)'
//   const html = convertToHtml(src)
//   expect(html).toMatchSnapshot()
// })

test('null bytes', () => {
  const src = 'foo\x00bar'
  const html = convertToHtml(src)
  expect(html).toContain(src)
})

test('html encoding in links', () => {
  const src = `[link](https://example.com/path?a=1&b=2)`
  const html = convertToHtml(src)
  expect(html).toContain('&amp;')
})

test('html entities in various contexts', () => {
  const src = `
&script&

\`&amp;\`

[&quot;link&quot;](/path?a=1&b=2&c="")
`
  const ast = parseToAst()(src)
  expect(ast[0]).toMatchObject({ name: 'p', body: [{ name: '', txt: '&script&' }] })
  expect(ast[1]).toMatchObject({ name: 'p', body: [{ name: 'cs', txt: '&amp;' }] })
  expect(ast[2]).toMatchObject({
    name: 'p',
    body: [
      {
        name: 'a',
        body: [
          {
            name: '',
            txt: '&quot;link&quot;',
          },
        ],
        href: '/path?a=1&b=2&c=""',
      },
    ],
  })

  const html = astToHtml(ast)
  expect(html).toContain('<p>&amp;script&amp;</p>')
  expect(html).toContain('<p><code>&amp;amp;</code></p>')
  expect(html).toContain(
    '<p><a href="/path?a=1&amp;b=2&amp;c=&quot;&quot;">&amp;quot;link&amp;quot;</a></p>',
  )
  expect(html).toMatchSnapshot()
})

test('extra asterisks doesn’t produce nested emphasis', () => {
  const src = '*'.repeat(5) + 'a' + '*'.repeat(5)
  const ast = parseToAst()(src)
  expect(ast).toMatchSnapshot()
})

test('many alternating formatting chars', () => {
  const src = '_*'.repeat(50) + 'a' + '*_'.repeat(50)
  const ast = parseToAst()(src)
  expect(ast).toMatchSnapshot()
})

test('simple blockquotes', () => {
  const src = `
> a

>b
`
  expect(parseToAst()(src)).toMatchSnapshot()
})

test('simple blockquote with just a space', () => {
  const src = '> \n\n'
  expect(parseToAst()(src)[0].name).toEqual('bq')
})

test('blockquotes with leading and trailing carets', () => {
  const src = `
>
> a
> b

>
>c
>d
not quoted

>
>
> d
>e
not quoted

>
> f
>g
>
>

end
`
  expect(parseToAst()(src)).toMatchSnapshot()
})

test('100 levels deep blockquote', () => {
  const src = '> '.repeat(100) + 'deep'
  const ast = parseToAst()(src)
  expect(ast).toMatchSnapshot()
})

test('interleaved quotes and lists deeply', () => {
  const src = `
> - item
>   > - nested
>   >   > - deeper
>   >   >   > text
`

  const bq = (doc: Ast.Block) => ({ name: 'bq' as const, doc: [doc] })
  const li = (doc: Ast.Block[]) => ({ name: 'li' as const, doc })
  const lst = (items: Ast.ListItem[]) => ({ name: 'l' as const, startNumber: undefined, items })
  const p = (txt: string) => ({ name: 'p' as const, body: [{ name: '' as const, txt }] })

  let expected: Ast.Block = bq(
    lst([
      li([p('item'), bq(lst([li([p('nested'), bq(lst([li([p('deeper'), bq(p('text'))])]))])]))]),
    ]),
  )

  const ast = parseToAst()(src)
  expect(ast).toEqual([expected])
})

test('empty elements everywhere', () => {
  const src = `
#

>

-

**

__

\`\`\`
\`\`\`

[]()

![]()
`
  const ast = parseToAst()(src)
  expect(ast).toMatchSnapshot()
})

test('single character inputs', () => {
  const chars = ['#', '>', '-', '*', '_', '`', '[', '!', '\\', '\n', ' ']

  const ast1 = parseToAst()(chars.join('\n\n'))
  expect(ast1.map(n => n.name)).toEqual('p,p,p,p,p,p,p,p,p'.split(','))
  expect(ast1).toMatchSnapshot()

  // with trailing spaces
  const ast2 = parseToAst()(chars.map(c => c + ' ').join('\n\n'))
  expect(ast2.map(n => n.name)).toEqual('h,bq,p,p,p,p,p,p,p'.split(','))
  expect(ast2).toMatchSnapshot()
})

test('backslash at end of input', () => {
  const src = 'text\\'
  const ast = parseToAst()(src)
  expect(ast).toMatchSnapshot()
})

test('large document performance', () => {
  const paragraph = 'Lorem ipsum dolor sit amet. '.repeat(1000)
  const src = (paragraph + '\n\n').repeat(100)

  const start = performance.now()
  const ast = parseToAst()(src)
  astToHtml(ast)
  const duration = performance.now() - start

  expect(duration).toBeLessThan(10 * 1000)
})

test('many small elements', () => {
  const src = Array.from({ length: 100000 }, (_, i) => `- item ${i}`).join('\n')

  const start = performance.now()
  parseToAst()(src)
  const duration = performance.now() - start

  expect(duration).toBeLessThan(10 * 1000)
})
