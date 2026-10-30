export type PageResult<T> = {
  items: T[]
  total: number
  pageSize: number
}

export async function readAllPages<T>(
  readPage: (page: number) => Promise<PageResult<T>>,
): Promise<T[]> {
  const first = await readPage(1)
  const pageCount = Math.ceil(first.total / first.pageSize)
  const items = [...first.items]
  for (let page = 2; page <= pageCount; page += 1) {
    const next = await readPage(page)
    items.push(...next.items)
  }
  return items
}
