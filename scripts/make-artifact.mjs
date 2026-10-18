// Turns the artifact build into a page body for the claude.ai Artifact tool:
// strips the document skeleton and loads React 18 from cdnjs before the app script.
import { readFileSync, writeFileSync } from 'node:fs'

let html = readFileSync('dist-artifact/index.html', 'utf8')
html = html
  .replace(/<!doctype html>/i, '')
  .replace(/<\/?html[^>]*>/gi, '')
  .replace(/<\/?head>/gi, '')
  .replace(/<\/?body>/gi, '')
  .replace(/<meta charset[^>]*>/i, '')
  .replace(/<meta name="viewport"[^>]*>/i, '')
  .replace(/<link rel="manifest"[^>]*>/i, '')
  .replace(/<link rel="apple-touch-icon"[^>]*>/i, '')
const cdn =
  '<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js"></script>\n' +
  '<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js"></script>\n'
html = html.replace(/<script type="module"/, cdn + '<script type="module"')
writeFileSync('dist-artifact/artifact.html', html.trim() + '\n')
console.log('wrote dist-artifact/artifact.html', Math.round(html.length / 1024) + ' KB')
