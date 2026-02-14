import { parseToAst } from './parseToAst'
import { astToHtml } from './astToHtml'
import * as Ast from './ast'

//
// Facade
//

export * from './ast'
export * from './parseToAst'
export * from './astToHtml'

const skipUnsafeHtml = (n: Ast.Block) => (n.name === 'htm' ? [] : [n])

export function convertToHtml(
  src: string,
  { allowUnsafeHtml }: { allowUnsafeHtml?: boolean } = {},
) {
  const options = allowUnsafeHtml ? {} : { transformBlock: skipUnsafeHtml }

  return astToHtml(parseToAst(options)(src))
}
