import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/store"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = getSession(id)
  if (!session) return NextResponse.json({ error: "Not Found" }, { status: 404 })

  // Public state (don’t expose assignments here)
  return NextResponse.json({
    id: session.id,
    houses: session.houses,
    people: session.people.map((p) => ({ id: p.id, name: p.name, houseId: p.houseId, claimed: p.claimed })),
    isDrawComplete: session.isDrawComplete,
  })
}
