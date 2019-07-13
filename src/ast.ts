//
// AST
//

export interface Text {
  name: ''
  txt: string
}

export interface CodeSpan {
  name: 'cs'
  txt: string
}

export interface HardLineBreak {
  name: 'br'
}

export interface Italic {
  name: 'i'
  body: Inline[]
}

export interface Bold {
  name: 'b'
  body: Inline[]
}

export interface Link {
  name: 'a'
  body: Inline[],
  href: string
}

export interface Image {
  name: 'img',
  alt: string,
  src: string
}

export type Inline = Text | CodeSpan | HardLineBreak | Italic | Bold | Link | Image

export interface BlockQuote {
  name: 'bq'
  doc: Block[]
}

export interface List {
  name: 'l'
  startNumber: number | undefined
  items: ListItem[]
}

export type ContainerBlock = BlockQuote | List

export interface ListItem {
  name: 'li'
  doc: Block[]
}

export interface ThematicBreak {
  name: 'hr'
}

export interface Heading {
  name: 'h'
  level: number
  body: Inline[]
}

export interface HtmlBlock {
  name: 'htm'
  raw: string
}

export interface CodeBlock {
  name: 'cb',
  infoText: string,
  txt: string
}

export interface Paragraph {
  name: 'p'
  body: Inline[]
}

export type LeafBlock = ThematicBreak | Heading | HtmlBlock | CodeBlock | Paragraph

export type Block = ContainerBlock | LeafBlock
