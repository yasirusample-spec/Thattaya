import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ ok: true })
  res.cookies.set('dl_token', '', { maxAge: 0, path: '/' })
  return res
}
