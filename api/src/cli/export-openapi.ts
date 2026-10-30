import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createOfflineOpenApiDocument } from '../openapi/document'

function outputPathFromArgs(): string {
  const outputIndex = process.argv.indexOf('--out')
  if (outputIndex >= 0) {
    const output = process.argv[outputIndex + 1]
    if (!output || output.startsWith('--'))
      throw new Error('--out requires a file path')
    return path.resolve(process.cwd(), output)
  }
  return path.resolve(__dirname, '../../../docs/openapi.json')
}

async function main(): Promise<void> {
  const outputPath = outputPathFromArgs()
  const document = await createOfflineOpenApiDocument()
  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(document, null, 2)}\n`, 'utf8')
  process.stdout.write(`${outputPath}\n`)
}

if (require.main === module) void main()
