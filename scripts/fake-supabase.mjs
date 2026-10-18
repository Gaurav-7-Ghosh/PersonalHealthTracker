// A tiny in-memory stand-in for the parts of Supabase that sync uses (password sign-in, the records
// table through PostgREST, and Storage), so the smoke test can sync two "devices" with no internet.
// It mirrors docs/SYNC.md: rows are per user, an older `modified` never overwrites a newer one, and
// synced_at is set by the server.
import { createServer } from 'node:http'

export function startFakeSupabase(port, users = { 'me@example.com': 'secret-pass' }) {
  const rows = new Map() // user/store/id -> row
  const objects = new Map() // path -> { type, body }
  const tokens = new Map() // token -> user id
  let tick = 0
  const now = () => new Date(Date.UTC(2026, 0, 1) + ++tick).toISOString()

  const send = (res, status, body, type = 'application/json') => {
    res.writeHead(status, { 'Content-Type': type, 'Access-Control-Allow-Origin': '*' })
    res.end(body === undefined ? '' : type === 'application/json' ? JSON.stringify(body) : body)
  }
  const read = (req) =>
    new Promise((r) => {
      const chunks = []
      req.on('data', (c) => chunks.push(c))
      req.on('end', () => r(Buffer.concat(chunks)))
    })
  const issue = (uid, email) => {
    const access = 'a-' + Math.random().toString(36).slice(2)
    tokens.set(access, uid)
    return { access_token: access, refresh_token: 'r-' + uid, expires_in: 3600, user: { id: uid, email } }
  }

  const server = createServer(async (req, res) => {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
      })
      return res.end()
    }
    const url = new URL(req.url, 'http://x')
    if (!req.headers.apikey) return send(res, 401, { message: 'No API key found in request' })

    if (url.pathname === '/auth/v1/token') {
      const body = JSON.parse((await read(req)).toString() || '{}')
      if (url.searchParams.get('grant_type') === 'password') {
        if (users[body.email] !== body.password) return send(res, 400, { error: 'invalid_grant', error_description: 'Invalid login credentials' })
        return send(res, 200, issue('u-' + body.email, body.email))
      }
      const uid = String(body.refresh_token).slice(2)
      return send(res, 200, issue(uid, uid.slice(2)))
    }

    const uid = tokens.get(String(req.headers.authorization).replace('Bearer ', ''))
    if (!uid) return send(res, 401, { message: 'JWT expired' })

    if (url.pathname === '/rest/v1/records') {
      if (req.method === 'GET') {
        const gt = url.searchParams.get('synced_at')?.replace(/^gt\./, '')
        const limit = Number(url.searchParams.get('limit') ?? 1000)
        const list = [...rows.values()]
          .filter((r) => r.user_id === uid && (!gt || r.synced_at > gt))
          .sort((a, b) => (a.synced_at < b.synced_at ? -1 : 1))
          .slice(0, limit)
        return send(res, 200, list)
      }
      for (const r of JSON.parse((await read(req)).toString())) {
        if (r.user_id !== uid) return send(res, 403, { message: 'new row violates row-level security policy' })
        const k = `${uid}/${r.store}/${r.id}`
        const old = rows.get(k)
        if (old && r.modified < old.modified) continue
        rows.set(k, { ...r, synced_at: now() })
      }
      return send(res, 201)
    }

    const m = url.pathname.match(/^\/storage\/v1\/object\/(?:authenticated\/)?photos\/([^/]+)\/(.+)$/)
    if (m) {
      if (m[1] !== uid) return send(res, 403, { message: 'Unauthorized' })
      const path = m[1] + '/' + decodeURIComponent(m[2])
      if (req.method === 'POST') {
        objects.set(path, { type: req.headers['content-type'], body: await read(req) })
        return send(res, 200, { Key: 'photos/' + path })
      }
      if (req.method === 'DELETE') {
        objects.delete(path)
        return send(res, 200, [])
      }
      const o = objects.get(path)
      if (!o) return send(res, 400, { statusCode: '404', error: 'not_found', message: 'Object not found' })
      return send(res, 200, o.body, o.type)
    }
    send(res, 404, { message: 'not found' })
  })
  server.listen(port)
  return { server, rows, objects, expireTokens: () => tokens.clear() }
}
