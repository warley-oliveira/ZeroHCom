// Verifies that every static t("...") key referenced in the source exists in
// BOTH locale files, and lists dynamic-key prefixes for manual review.
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { transformSync } from "esbuild"

const ROOT = new URL("../", import.meta.url).pathname
const SRC = join(ROOT, "src")

function loadLocale(rel) {
  const code = transformSync(readFileSync(join(ROOT, rel), "utf8"), {
    loader: "ts",
    format: "cjs",
  }).code
  const mod = { exports: {} }
  new Function("module", "exports", code)(mod, mod.exports)
  return mod.exports.default
}

function flatten(obj, prefix = "", acc = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, key, acc)
    else acc[key] = true
  }
  return acc
}

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    if (name === "i18n") continue
    const p = join(dir, name)
    const s = statSync(p)
    if (s.isDirectory()) walk(p, files)
    else if (/\.(ts|tsx)$/.test(name)) files.push(p)
  }
  return files
}

const pt = flatten(loadLocale("src/i18n/locales/pt-BR.ts"))
const en = flatten(loadLocale("src/i18n/locales/en.ts"))

const staticKeys = new Set()
const dynamicPrefixes = new Set()
// t("key") / t('key') / t(`key`) and t(`prefix.${x}`)
const staticRe = /\bt\(\s*["'`]([^"'`$]+)["'`]/g
const dynRe = /\bt\(\s*`([^`$]*)\$\{/g

for (const file of walk(SRC)) {
  // Strip comments so doc examples like `t("ns.key.<x>")` don't count as usages.
  const text = readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "")
  let m
  while ((m = staticRe.exec(text))) staticKeys.add(m[1])
  while ((m = dynRe.exec(text))) dynamicPrefixes.add(m[1])
}

const missingPt = [...staticKeys].filter((k) => !pt[k]).sort()
const missingEn = [...staticKeys].filter((k) => !en[k]).sort()
const onlyPt = Object.keys(pt).filter((k) => !en[k]).sort()
const onlyEn = Object.keys(en).filter((k) => !pt[k]).sort()

console.log(`pt-BR leaf keys: ${Object.keys(pt).length}, en leaf keys: ${Object.keys(en).length}`)
console.log(`static t() keys referenced in code: ${staticKeys.size}`)
console.log(`dynamic t(\`prefix.\${...}\`) prefixes:`, [...dynamicPrefixes].sort())
console.log(`\nMissing in pt-BR (${missingPt.length}):`, missingPt)
console.log(`Missing in en (${missingEn.length}):`, missingEn)
console.log(`\nKeys only in pt-BR (${onlyPt.length}):`, onlyPt)
console.log(`Keys only in en (${onlyEn.length}):`, onlyEn)

const ok = !missingPt.length && !missingEn.length && !onlyPt.length && !onlyEn.length
console.log(`\n${ok ? "OK ✓" : "ISSUES FOUND ✗"}`)
process.exit(ok ? 0 : 1)
