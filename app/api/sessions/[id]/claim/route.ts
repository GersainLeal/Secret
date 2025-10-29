import { NextRequest, NextResponse } from "next/server"
import { claimPerson } from "@/lib/store"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest, ctx?: { params?: { id?: string } }) {
  try {
    const { personId } = (await req.json()) as { personId?: string }
    if (!personId) return NextResponse.json({ error: "personId required" }, { status: 400 })
    const id = ctx?.params?.id ?? new URL(req.url).pathname.split("/").slice(-2, -1)[0] ?? ""
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
    const result = await claimPerson(id, personId)
    if (!result.ok) {
      const status =
        result.reason === "NOT_FOUND"
          ? 404
          : result.reason === "PERSON_NOT_FOUND"
            ? 404
            : result.reason === "ALREADY_CLAIMED"
              ? 409
              : 400
      return NextResponse.json({ error: result.reason }, { status })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: "Bad Request" }, { status: 400 })
  }
}
