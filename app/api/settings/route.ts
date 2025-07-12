import { NextResponse } from 'next/server'
import { connectToDatabase as dbConnect } from '../../../lib/db'
import Setting from '@/lib/db/models/setting.model'

export async function GET() {
  await dbConnect()
  // 🟡 Temporarily skipping auth
  const setting = await Setting.findOne()
  return setting
    ? NextResponse.json(setting)
    : NextResponse.json({ message: 'Settings not found' }, { status: 404 })
}

export async function PUT(req: Request) {
  await dbConnect()
  // 🟡 Temporarily skipping auth
  const body = await req.json()
  const setting = await Setting.findOne()
  if (!setting) {
    return NextResponse.json({ message: 'Settings not found' }, { status: 404 })
  }

  if (body.defaultCurrency) {
    setting.defaultCurrency = body.defaultCurrency
    await setting.save()
  }

  return NextResponse.json(setting)
}
