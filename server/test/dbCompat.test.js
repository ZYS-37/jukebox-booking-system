const { compileSql, toLegacyCompatibleResult } = require('../dbCompat')

describe('PostgreSQL query compatibility', () => {
  test('converts scalar placeholders to PostgreSQL parameters', () => {
    expect(
      compileSql('SELECT * FROM users WHERE id = ? AND email = ?', [7, 'a@b.test'])
    ).toEqual({
      text: 'SELECT * FROM users WHERE id = $1 AND email = $2',
      values: [7, 'a@b.test']
    })
  })

  test('expands list and bulk-insert parameters', () => {
    expect(compileSql('SELECT * FROM users WHERE id IN (?)', [[1, 2, 3]])).toEqual({
      text: 'SELECT * FROM users WHERE id IN ($1, $2, $3)',
      values: [1, 2, 3]
    })

    const bulk = compileSql(
      'INSERT INTO bids (band_id, slot_date) VALUES ?',
      [[
        [1, '2026-10-05'],
        [2, '2026-10-06']
      ]]
    )

    expect(bulk.text).toBe(
      'INSERT INTO bids (band_id, slot_date) VALUES ($1, $2), ($3, $4) RETURNING id'
    )
    expect(bulk.values).toEqual([1, '2026-10-05', 2, '2026-10-06'])
  })

  test('normalizes PostgreSQL writes to the result shape routes expect', () => {
    expect(
      toLegacyCompatibleResult({
        command: 'INSERT',
        rowCount: 2,
        rows: [{ id: 11 }, { id: 12 }]
      })
    ).toEqual({
      affectedRows: 2,
      changedRows: 2,
      insertId: 11,
      rows: [{ id: 11 }, { id: 12 }]
    })
  })
})
