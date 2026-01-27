import { parseToAst, astToHtml, convertToHtml } from './litemarkup'

import * as Ast from './ast'

test('basic', () => {
  const src = `
### foo😀

gadasdasd,asdasd
> quote here

***

asdas<b>d</b>asda sda1&amp;

ffof😀oofoof
fofoofo2
# immediate heading

This is a list:
- one
- two
- three
- fourth item

  I mean this is a big one

- fifth

1. first
2. second
3. third

werwerwerwer

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

> # asd
> lol <nottag>
don't be lazy
> foo

>
> level 1
> > level 2
> > level 2
> level 1 continues
>
>

<div>
 foobar
</div>

<broken>
oops </broken> html
</broken>

joo\` asd \` bar

asd \`\`0doo

asd \` \`1doo

asd \`  \`2doo

asd \`   \`3doo

asd \`foo\`\` 12dii

asd \`\`foo\` 21dii

asd \`\`foo\`\` 22dii

asd\`asd\\
xfoobar

asd\\\`asd\\
yfoobar

br in the end \\

*I'm bold*

_I'm italic_

*bold outside and _italic inside_*

_bold start

bold ending_

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
});

test('markdown compatibility mode', () => {
  const src = `
**I'm bold**
__I'm bold too__

_I'm italic_
*I'm italic too*

these are supported:
**bold outside and _italic inside_**
__bold outside and *italic inside*__
_italic outside and **bold inside**_
*italic outside and __bold inside__*

these are not supported:
**bold outside and *italic inside***
__bold outside and _italic inside___
_italic outside and __bold inside___
*italic outside and **bold inside***

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
  const ast = parseToAst({markdownMode: true})(src)
  expect(ast).toMatchSnapshot()

  const html = astToHtml(ast)
  expect(html).toMatchSnapshot()
});

test('multiple images in series', () => {
  const src = `
![image of a cat](/ordidnthappen.jpg) and
second ![image of a cat](/ordidnthappen.jpg)
`
  const ast = parseToAst()(src)
  expect(ast).toMatchSnapshot()

  const html = astToHtml(ast)
  expect(html).toMatchSnapshot()
});

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
});

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
});

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
});

test('codeblock without end', () => {
  const src = `
\`\`\`foo
`
  const ast = parseToAst()(src)
  expect(ast).toMatchSnapshot()

  const html = astToHtml(ast)
  expect(html).toMatchSnapshot()
});

test('codeblock with broken end', () => {
  const src = `
\`\`\`foo
\`\`
`
  const ast = parseToAst()(src)
  expect(ast).toMatchSnapshot()

  const html = astToHtml(ast)
  expect(html).toMatchSnapshot()
});

test('codeblock with broken end on the same line / codespan with missing backticks in the end', () => {
  const src = `
\`\`\`foo\`\`
`
  const ast = parseToAst()(src)
  expect(ast).toMatchSnapshot()

  const html = astToHtml(ast)
  expect(html).toMatchSnapshot()
});

test('codespan with extra backticks on the start', () => {
  const src = `
foo \`\`\`foo\`\`
`
  const ast = parseToAst()(src)
  expect(ast).toMatchSnapshot()

  const html = astToHtml(ast)
  expect(html).toMatchSnapshot()
});

test('codespan with extra backticks on the end', () => {
  const src = `
\`\`foo\`\`\`
`
  const ast = parseToAst()(src)
  expect(ast).toMatchSnapshot()

  const html = astToHtml(ast)
  expect(html).toMatchSnapshot()
});

test('codespan with three backticks in the beginning of a paragraph (not codeblock)', () => {
  const src = `
\`\`\`foo\`\`\`
`
  const ast = parseToAst()(src)
  expect(ast).toMatchSnapshot()

  const html = astToHtml(ast)
  expect(html).toMatchSnapshot()
});

test('empty paragraph in the end of the file', () => {
  const src = 'foo\n  '
  const ast = parseToAst()(src)
  expect(ast).toMatchSnapshot()

  const html = astToHtml(ast)
  expect(html).toMatchSnapshot()
});

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
      return [{...n, name: 'b'}]
    } else {
      return [n]
    }
  }

  const ast = parseToAst({transformBlock: duplicate, transformInline: convertItalicToBold})(src)
  expect(ast).toMatchSnapshot()

  const html = astToHtml(ast)
  expect(html).toMatchSnapshot()
});


test('convertToHtml allowUnsafeHtml', () => {
  const src = `
start

<div>
inside div
</div>

end
`
  const html1 = convertToHtml(src)
  expect(html1).toMatchSnapshot()

  const html2 = convertToHtml(src, { allowUnsafeHtml: true })
  expect(html2).toMatchSnapshot()
});
