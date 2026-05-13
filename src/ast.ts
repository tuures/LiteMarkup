//
// AST
//

/** Base interface for extension nodes. Use `x` property to specify the extension subtype. */
export interface Extension {
  type: 'x'
}

/** Plain text node. */
export interface Text {
  type: ''
  /** The text content. */
  txt: string
}

/** Inline code span (e.g. `` `code` ``). */
export interface CodeSpan {
  type: 'cs'
  /** The code text content. */
  txt: string
}

/** Hard line break (trailing `\`). */
export interface HardLineBreak {
  type: 'br'
}

/** Italic (emphasis) inline node. */
export interface Italic {
  type: 'i'
  /** Inline children. */
  body: Inline[]
}

/** Bold (strong emphasis) inline node. */
export interface Bold {
  type: 'b'
  /** Inline children. */
  body: Inline[]
}

/** Strikethrough (deleted text) inline node. */
export interface Strikethrough {
  type: 's'
  /** Inline children. */
  body: Inline[]
}

/** Link inline node. */
export interface Link {
  type: 'a'
  /** Inline children (link text). */
  body: Inline[]
  /** Link destination URL. */
  href: string
}

/** Image inline node. */
export interface Image {
  type: 'img'
  /** Alternative text. */
  alt: string
  /** Image source URL. */
  src: string
}

/** Union of all inline AST node types. */
export type Inline =
  | Text
  | CodeSpan
  | HardLineBreak
  | Italic
  | Bold
  | Strikethrough
  | Link
  | Image
  | Extension

/** Blockquote container block. */
export interface BlockQuote {
  type: 'bq'
  /** Nested block children. */
  doc: Block[]
}

/** Ordered or unordered list container block. */
export interface List {
  type: 'l'
  /** Starting number for ordered lists, or `undefined` for unordered lists. */
  startNumber: number | undefined
  /** List item children. */
  items: ListItem[]
}

/** Union of container block types (blockquote, list). */
export type ContainerBlock = BlockQuote | List

/** Single item within a list. */
export interface ListItem {
  type: 'li'
  /** Nested block children. */
  doc: Block[]
}

/** Thematic break (horizontal rule). */
export interface ThematicBreak {
  type: 'hr'
}

/** Heading block (levels 1–6). */
export interface Heading {
  type: 'h'
  /** Heading level (1–6). */
  level: number
  /** Inline children. */
  body: Inline[]
}

/** Raw HTML block. */
export interface HtmlBlock {
  type: 'htm'
  /** The raw HTML content. */
  raw: string
}

/** Fenced code block. */
export interface CodeBlock {
  type: 'cb'
  /** Info string (e.g. language identifier) from the opening fence. */
  infoText: string
  /** The code text content. */
  txt: string
}

/** Table block (GFM-style pipe tables). */
export interface Table {
  type: 'tbl'
  /** Rows of cells, where each cell contains inline nodes. First row is the header. */
  rows: Inline[][][]
}

/** Paragraph block. */
export interface Paragraph {
  type: 'p'
  /** Inline children. */
  body: Inline[]
}

/** Union of leaf block types (cannot contain other blocks). */
export type LeafBlock =
  | ThematicBreak
  | Heading
  | HtmlBlock
  | CodeBlock
  | Table
  | Paragraph
  | Extension

/** Union of all block AST node types. */
export type Block = ContainerBlock | LeafBlock

/** Union of all AST node types (inline and block). */
export type Node = Inline | Block
