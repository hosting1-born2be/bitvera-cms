import { NextResponse } from 'next/server'
import payload from 'payload'

export async function GET(request: Request) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    // Simple query to keep the database active
    await payload.find({
      collection: 'users',
      limit: 1,
    })

    return NextResponse.json({ status: 'success' })
  } catch (error) {
    console.error('Health check failed:', error)
    return NextResponse.json({ status: 'error' }, { status: 500 })
  }
}
