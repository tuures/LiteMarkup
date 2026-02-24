//
// AST
//

export interface Extension {
  type: 'x'
}

export interface Text {
  type: ''
  txt: string
}

export interface CodeSpan {
  type: 'cs'
  txt: string
}

export interface HardLineBreak {
  type: 'br'
}

export interface Italic {
  type: 'i'
  body: Inline[]
}

export interface Bold {
  type: 'b'
  body: Inline[]
}

export interface Link {
  type: 'a'
  body: Inline[]
  href: string
}

export interface Image {
  type: 'img'
  alt: string
  src: string
}

export type Inline = Text | CodeSpan | HardLineBreak | Italic | Bold | Link | Image | Extension

export interface BlockQuote {
  type: 'bq'
  doc: Block[]
}

export interface List {
  type: 'l'
  startNumber: number | undefined
  items: ListItem[]
}

export type ContainerBlock = BlockQuote | List

export interface ListItem {
  type: 'li'
  doc: Block[]
}

export interface ThematicBreak {
  type: 'hr'
}

export interface Heading {
  type: 'h'
  level: number
  body: Inline[]
}

export interface HtmlBlock {
  type: 'htm'
  raw: string
}

export interface CodeBlock {
  type: 'cb'
  infoText: string
  txt: string
}

export interface Table {
  type: 'tbl'
  rows: Inline[][][]
}

export interface Paragraph {
  type: 'p'
  body: Inline[]
}

export type LeafBlock = ThematicBreak | Heading | HtmlBlock | CodeBlock | Table | Paragraph | Extension

export type Block = ContainerBlock | LeafBlock

export type Node = Inline | Block
