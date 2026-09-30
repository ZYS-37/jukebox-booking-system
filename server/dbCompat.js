const INSERT_ID_TABLES = new Set([
  'users',
  'bands',
  'bids',
  'bookings',
  'bidding_windows',
  'band_members'
])

function compileSql(sql, params = []) {
  let parameterIndex = 0
  const values = []

  const addValue = (value) => {
    values.push(value)
    return `$${values.length}`
  }

  let text = String(sql).replace(/\?/g, () => {
    if (parameterIndex >= params.length) {
      throw new Error('SQL placeholder count exceeds the supplied parameter count.')
    }

    const value = params[parameterIndex]
    parameterIndex += 1

    if (!Array.isArray(value)) return addValue(value)
    if (value.length === 0) return 'NULL'

    if (Array.isArray(value[0])) {
      return value
        .map((row) => `(${row.map((cell) => addValue(cell)).join(', ')})`)
        .join(', ')
    }

    return value.map((cell) => addValue(cell)).join(', ')
  })

  if (parameterIndex !== params.length) {
    throw new Error('More SQL parameters were supplied than there are placeholders.')
  }

  const insertMatch = text.match(/^\s*INSERT\s+INTO\s+([a-z_][a-z0-9_]*)/i)
  if (
    insertMatch &&
    INSERT_ID_TABLES.has(insertMatch[1].toLowerCase()) &&
    !/\bRETURNING\b/i.test(text)
  ) {
    text = `${text.trim().replace(/;$/, '')} RETURNING id`
  }

  return { text, values }
}

function toLegacyCompatibleResult(result) {
  if (result.command === 'SELECT' || result.command === 'SHOW') {
    return result.rows
  }

  return {
    affectedRows: result.rowCount || 0,
    changedRows: result.rowCount || 0,
    insertId: result.rows?.[0]?.id ?? null,
    rows: result.rows || []
  }
}

module.exports = { compileSql, toLegacyCompatibleResult }
