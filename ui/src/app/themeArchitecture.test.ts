import ts from 'typescript'
import { expect, it } from 'vitest'

const components = import.meta.glob<string>('../**/*.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
})

it('keeps visual definitions in the theme rather than React components', () => {
  const violations: string[] = []
  for (const [path, text] of Object.entries(components)) {
    if (path.includes('.test.')) continue
    const source = ts.createSourceFile(
      path,
      text,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    )
    const report = (node: ts.Node, reason: string) => {
      const { line } = source.getLineAndCharacterOfPosition(
        node.getStart(source),
      )
      violations.push(`${path}:${line + 1}: ${reason}`)
    }
    const inspect = (node: ts.Node) => {
      if (ts.isJsxAttribute(node)) {
        const name = node.name.getText(source)
        if (
          ['sx', 'style'].includes(name) &&
          node.initializer &&
          ts.isJsxExpression(node.initializer)
        ) {
          const value = node.initializer.expression
          if (
            value &&
            (ts.isObjectLiteralExpression(value) ||
              ts.isArrowFunction(value) ||
              ts.isArrayLiteralExpression(value))
          )
            report(node, 'local styles')
        }
        if (['fontFamily', 'fontWeight'].includes(name))
          report(node, 'local typography')
        if (
          name === 'fontSize' &&
          node.initializer &&
          ts.isJsxExpression(node.initializer)
        )
          report(node, 'local font size')
        if (
          ['spacing', 'direction'].includes(name) &&
          node.initializer &&
          ts.isJsxExpression(node.initializer) &&
          node.initializer.expression &&
          (ts.isNumericLiteral(node.initializer.expression) ||
            ts.isObjectLiteralExpression(node.initializer.expression))
        )
          report(node, 'local layout preset')
      }
      if (
        ts.isPropertyAssignment(node) &&
        ['sx', 'style'].includes(node.name.getText(source)) &&
        ts.isObjectLiteralExpression(node.initializer)
      )
        report(node, 'local slot styles')
      if (
        ts.isPropertyAssignment(node) &&
        ['fontSize', 'fontFamily', 'fontWeight'].includes(
          node.name.getText(source),
        )
      )
        report(node, 'local typography definition')
      if (ts.isStringLiteral(node) && /^#[\da-f]{3,8}$/i.test(node.text))
        report(node, 'local color')
      ts.forEachChild(node, inspect)
    }
    inspect(source)
  }
  expect(violations).toEqual([])
})
