import { mdToAst, astToHtml } from './litemarkup'

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
lazy
> foo

> level 1
> > level 2
> > level 2

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

\\\\*emphasis*

*notbold\`*\`

this paragraph has a [link to](/thisurl) and some parenthesis []() that is not a link

[[foo\\]a](ds\\)fd\\)\\\`)

![image of a cat](/ordidnthappen.jpg)

`
  const ast = mdToAst(src)
  expect(ast).toMatchSnapshot()

  const html = astToHtml(ast)
  expect(html).toMatchSnapshot()
});
