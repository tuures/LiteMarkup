import { Document, Paragraph, TextRun, HeadingLevel, ExternalHyperlink, Packer } from 'docx'
import { parser } from 'litemarkup'
import type { Block, Inline } from 'litemarkup'
import { writeFileSync } from 'fs'

const parse = parser()
const ast = parse('# Hello *world*!\n\nThis is a _paragraph_ with a [link](https://example.com).')

console.log('AST:', JSON.stringify(ast, null, 2))

function renderInline(node: Inline): (TextRun | ExternalHyperlink)[] {
  switch (node.type) {
    case '': return [new TextRun(node.txt)]
    case 'b': return [new TextRun({ text: node.body.map(n => n.type === '' ? n.txt : '').join(''), bold: true })]
    case 'i': return [new TextRun({ text: node.body.map(n => n.type === '' ? n.txt : '').join(''), italics: true })]
    case 'a': return [new ExternalHyperlink({ link: node.href, children: node.body.flatMap(renderInline) })]
    default: return []
  }
}

function renderBlock(node: Block): Paragraph | null {
  switch (node.type) {
    case 'p': return new Paragraph({ children: node.body.flatMap(renderInline) })
    case 'h': return new Paragraph({
      heading: HeadingLevel[`HEADING_${node.level}` as keyof typeof HeadingLevel],
      children: node.body.flatMap(renderInline)
    })
    default: return null
  }
}

const paragraphs = ast.map(renderBlock).filter((p): p is Paragraph => p !== null)
const doc = new Document({ sections: [{ children: paragraphs }] })

Packer.toBuffer(doc).then(buffer => {
  writeFileSync('output.docx', buffer)
})
