/**
 * Génération CSV.
 *
 * Les cellules commençant par `=`, `+`, `@` ou une tabulation sont préfixées
 * d'une apostrophe : sans cela, un tableur interpréterait le contenu comme une
 * formule (injection CSV). Les nombres négatifs restent intacts.
 */

const FORMULA_PREFIX = /^[=+@\t\r]/

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return ''

  let text = String(value)
  if (FORMULA_PREFIX.test(text)) text = `'${text}`

  if (/[",;\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

export function toCsv(
  headers: readonly string[],
  rows: ReadonlyArray<ReadonlyArray<unknown>>,
): string {
  const lines = [headers.map(escapeCell).join(',')]
  for (const row of rows) lines.push(row.map(escapeCell).join(','))
  // BOM : Excel ouvre alors correctement les accents.
  return `﻿${lines.join('\r\n')}\r\n`
}

export function csvResponse(filename: string, body: string): Response {
  return new Response(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}

export function jsonDownloadResponse(filename: string, payload: unknown): Response {
  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
