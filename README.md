# Unbloated Markdown-like markup language

Why yet another Markdown(-like) compiler/language? What makes **LiteMarkup** different:
- **Implements only a minimum useful subset of Markdown.** Instead of trying to cover all the possible edge cases of "traditional" Markdown, LiteMarkup contains only the most widely used parts of Markdown with some small adjustments. Due to this the minified compiler (parser + HTML emitter) is **only 4.2kb (1.7kb gzipped!)** and has no implementation dependencies. Despite the increased simplicity, the language remains **intuitive and powerful**.
- **No emphasis on HTML output.** Parsing and HTML emitter are separated into two different compiler stages. You can take the AST produced by the parser and implement your custom renderer bypassing the HTML step completely if you don't need it. For example, generate React elements or custom JSON directly from the AST.
- **Written in TypeScript.** Use the full power of types when writing AST transformations. Modify the compiler without fear of breaking ton of stuff silently.

## How to use the compiler
```javascript
import { parseToAst, astToHtml } from 'litemarkup'

// parse LiteMarkup string into an AST:
const ast = parseToAst(src)
// render an AST into a HTML string
const html = astToHtml(ast)

// shorthand when you don't need the AST:
import { mdToHtml } from 'litemarkup'

mdToHtml(src)
```

## Language tour

````litemarkup
# This is a level 1 heading
## This is a level 2 heading
###### This is a level 6 heading

*This text will be bold*
_This text will be italic_

1. Here are
1. Some items
1. In a list
   * As well as
   * List _inside_ of a list!

A [link example](http://example.com).

> This is a quote
> - Famous person

```foo-lang
some("code here")
```

There can be `inline` code as well.

Escape special characters with single backlash (\\) to treat it as verbatim. Add single backlash to the end of line to force a line break like this: \
LiteMarkup is pretty easy!

---

That was a thematic break (horisontal line)

````

[**See interactive demo here**](./demopage/demopage.html)

---

Most notable differences/deviations from the [CommonMark](https://spec.commonmark.org/0.29/) specification at the moment:

- [Emphasis and strong emphasis](https://spec.commonmark.org/0.29/#emphasis-and-strong-emphasis) use single `_` and `*` characters, respectively.
- [Settext headings](https://spec.commonmark.org/0.29/#setext-heading) are not supported (use ATX headings (`# foo`) instead)
- [Indented code blocks](https://spec.commonmark.org/0.29/#indented-code-block) are not supported (use fenced code blocks (```) instead)
- Only U+000A (aka `\n` / LF) is considered [*line ending*](https://spec.commonmark.org/0.29/#line-ending).
- Only space and tab are considered [*whitespace characters*](https://spec.commonmark.org/0.29/#whitespace-character).
- [Tabs have no behaviour](https://spec.commonmark.org/0.29/#example-6).
- [thematic breaks](https://spec.commonmark.org/0.29/#thematic-break) do not interrupt paragraph (blank line needed).
- ATX headings cannot have [closing sequence](https://spec.commonmark.org/0.29/#example-41).
- [Entity and numeric character references](https://spec.commonmark.org/0.29/#entity-and-numeric-character-references) are not supported
- Only type 7 [HTML blocks](https://spec.commonmark.org/0.29/#html-block) are supported (and with some limitations)
- [Link reference definitions](https://spec.commonmark.org/0.29/#link-reference-definition) are not supported

---

License: MIT, see LICENSE.md
