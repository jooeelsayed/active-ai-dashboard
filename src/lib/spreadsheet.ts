export function sheetRowsToRecords(
  sheetRows: ReadonlyArray<ReadonlyArray<unknown>>
): Record<string, unknown>[] {
  if (sheetRows.length < 2) return []

  const headers = sheetRows[0]
    .slice(0, 50)
    .map((cell) => String(cell ?? '').trim())

  return sheetRows.slice(1).map((row) => {
    const record: Record<string, unknown> = {}
    headers.forEach((header, index) => {
      if (header) record[header] = row[index] ?? ''
    })
    return record
  }).filter((record) => Object.values(record).some((value) => String(value ?? '').trim()))
}
