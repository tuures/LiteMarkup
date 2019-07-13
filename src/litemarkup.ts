import { parseToAst } from './parseToAst'
import { astToHtml } from './astToHtml'

//
// Facade
//

export * from './ast'
export * from './parseToAst'
export * from './astToHtml'

export const mdToHtml = (src: string) => astToHtml(parseToAst(src))

