import { useEffect } from 'react'

// DocMind frontend logger.
// Logs every page navigation, API call and error to the browser console,
// and batches them to POST /api/logs so they are persisted server-side
// in backend/logs/frontend.log (see logging_config.py).

const LOG_ENDPOINT = '/api/logs'
const BATCH_INTERVAL = 1500
const MAX_QUEUE = 50

const queue = []
let timer = null

function sendToServer() {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  if (!queue.length) return
  const batch = queue.splice(0, MAX_QUEUE)
  const payload = JSON.stringify({ entries: batch })

  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(LOG_ENDPOINT, new Blob([payload], { type: 'application/json' }))
    } else {
      fetch(LOG_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      }).catch(() => {})
    }
  } catch {
    // backend unreachable — logs stay in console only
  }
}

function scheduleSend() {
  if (timer) clearTimeout(timer)
  timer = setTimeout(sendToServer, BATCH_INTERVAL)
}

function emit(level, category, message, meta) {
  const entry = {
    level,
    category,
    message: String(message),
    url: window.location.pathname,
    ts: new Date().toISOString(),
  }
  if (meta !== undefined) {
    try {
      entry.meta = JSON.stringify(meta).slice(0, 1000)
    } catch {
      entry.meta = String(meta).slice(0, 1000)
    }
  }

  const label = `[DocMind] ${entry.ts} [${level.toUpperCase()}] [${category}] ${entry.message}`
  const style = 'color:#00d4ff;font-weight:bold'
  if (level === 'error') console.error(`%c${label}`, style, meta ?? '')
  else if (level === 'warn') console.warn(`%c${label}`, style, meta ?? '')
  else if (level === 'debug') console.debug(`%c${label}`, style, meta ?? '')
  else console.info(`%c${label}`, style, meta ?? '')

  queue.push(entry)
  if (queue.length >= MAX_QUEUE) sendToServer()
  else scheduleSend()
}

export const log = {
  debug: (category, message, meta) => emit('debug', category, message, meta),
  info: (category, message, meta) => emit('info', category, message, meta),
  warn: (category, message, meta) => emit('warn', category, message, meta),
  error: (category, message, meta) => emit('error', category, message, meta),
  flush: sendToServer,
}

// Global error handlers — every uncaught error is logged.
window.addEventListener('error', (e) => {
  emit('error', 'global', `Uncaught error: ${e.message}`, { file: e.filename, line: e.lineno })
})
window.addEventListener('unhandledrejection', (e) => {
  const reason = e.reason?.message || String(e.reason)
  emit('error', 'global', `Unhandled rejection: ${reason}`, { stack: e.reason?.stack })
})

// usePageLog — call at the top of every page component to log mount/unmount.
export function usePageLog(pageName) {
  useEffect(() => {
    log.info('page', `Page mounted: ${pageName}`)
    return () => log.debug('page', `Page unmounted: ${pageName}`)
  }, [pageName])
}

export default log
