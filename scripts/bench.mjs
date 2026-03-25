import fs from 'node:fs'
import path from 'node:path'

import { parser } from '../dist/parser.mjs'

function createBenchmarkCorpus() {
  const plainText = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.\n'.repeat(1000)

  const inlineHeavy = '_italic_ **bold** `code` [link](url) '.repeat(1000) + '\n'.repeat(100)

  const tableHeader = '| Column A | Column B | Column C | Column D | Column E |\n'
  const tableDelim = '|---|---|---|---|---|\n'
  const tableRow = '| Cell 1 | Cell 2 | Cell 3 | Cell 4 | Cell 5 |\n'
  const tableHeavy = tableHeader + tableDelim + tableRow.repeat(100)

  let deepNested = ''
  for (let depth = 0; depth < 10; depth++) {
    const indent = '  '.repeat(depth)
    for (let i = 0; i < 5; i++) {
      deepNested += `${indent}- Item ${depth}-${i}\n`
    }
  }

  const mixed =
    plainText.slice(0, 10000) +
    '\n# Heading\n' +
    inlineHeavy.slice(0, 8000) +
    '\n' +
    tableHeavy.slice(0, 10000) +
    '\n> Blockquote with _emphasis_\n' +
    deepNested.slice(0, 7000) +
    '\n```typescript\nfunction test() { return 42 }\n```\n'

  return {
    plainText,
    inlineHeavy,
    tableHeavy,
    deepNested,
    mixed,
  }
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)
  return sorted[idx]
}

function stats(timesMs) {
  const n = timesMs.length
  const sorted = [...timesMs].sort((a, b) => a - b)
  const mean = timesMs.reduce((a, b) => a + b, 0) / n
  const variance = timesMs.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / n
  const stdDev = Math.sqrt(variance)
  const cv = mean === 0 ? 0 : stdDev / mean

  return {
    n,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    median: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    mean,
    stdDev,
    cv,
  }
}

function fmt(num, digits = 2) {
  return Number(num).toFixed(digits)
}

function benchCase(name, input, parse, warmupRuns, runs) {
  for (let i = 0; i < warmupRuns; i++) parse(input)

  const times = []
  for (let i = 0; i < runs; i++) {
    if ((i + 1) % 1000 === 0) {
      console.log(`Running case "${name}" - iteration ${i + 1}/${runs}`)
    }
    const t0 = performance.now()
    parse(input)
    times.push(performance.now() - t0)
  }

  const s = stats(times)
  const sizeKb = input.length / 1024
  const throughputMean = sizeKb / (s.mean / 1000)
  const throughputMedian = sizeKb / (s.median / 1000)

  return {
    name,
    sizeKb,
    ...s,
    throughputMean,
    throughputMedian,
  }
}

function printResults(results) {
  console.log('\nLiteMarkup benchmark\n')
  for (const r of results) {
    console.log(`${r.name} (${fmt(r.sizeKb, 1)}KB)`)
    console.log(`  mean: ${fmt(r.mean)} ms   median: ${fmt(r.median)} ms   p95: ${fmt(r.p95)} ms`)
    console.log(`  min: ${fmt(r.min)} ms    max: ${fmt(r.max)} ms      sd: ${fmt(r.stdDev)} ms`)
    console.log(`  cv: ${fmt(r.cv * 100, 1)} %`)
    console.log(`  throughput(mean): ${fmt(r.throughputMean, 1)} KB/s`)
    console.log(`  throughput(median): ${fmt(r.throughputMedian, 1)} KB/s\n`)
  }
}

function printDelta(prev, curr) {
  if (!prev || !Array.isArray(prev.results)) return

  const prevMap = new Map(prev.results.map(r => [r.name, r]))
  console.log('Delta vs last run (median parse time):')
  for (const r of curr) {
    const p = prevMap.get(r.name)
    if (!p) continue
    const deltaPct = p.median === 0 ? 0 : ((r.median - p.median) / p.median) * 100
    const sign = deltaPct > 0 ? '+' : ''
    console.log(
      `  ${r.name}: ${sign}${fmt(deltaPct, 1)}% (${fmt(p.median)} -> ${fmt(r.median)} ms)`,
    )
  }
  console.log('')
}

function readLastRun(lastRunPath) {
  try {
    const raw = fs.readFileSync(lastRunPath, 'utf8').trim()
    if (!raw) return null

    const lines = raw.split('\n').filter(Boolean)
    if (lines.length === 0) return null

    return JSON.parse(lines[lines.length - 1])
  } catch {
    return null
  }
}

function writeRun(lastRunPath, payload) {
  fs.appendFileSync(lastRunPath, JSON.stringify(payload) + '\n', 'utf8')
}

function main() {
  const warmupRuns = 10
  const runs = 10000

  const parse = parser()
  const corpus = createBenchmarkCorpus()
  const cases = [
    ['plainText', corpus.plainText],
    ['inlineHeavy', corpus.inlineHeavy],
    ['tableHeavy', corpus.tableHeavy],
    ['deepNested', corpus.deepNested],
    ['mixed', corpus.mixed],
  ]

  const results = cases.map(([name, input]) => benchCase(name, input, parse, warmupRuns, runs))

  const lastRunPath = path.resolve(process.cwd(), '.bench-log.ndjson')
  const previous = readLastRun(lastRunPath)

  printResults(results)
  printDelta(previous, results)

  writeRun(lastRunPath, {
    timestamp: new Date().toISOString(),
    node: process.version,
    platform: process.platform,
    runs,
    warmupRuns,
    results,
  })

  console.log(`Saved current results to ${lastRunPath}`)
}

main()
