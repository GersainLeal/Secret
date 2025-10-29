import { randomBytes } from "crypto"

export type Person = {
  id: string
  name: string
  houseId: string
  claimed: boolean
}

export type House = {
  id: string
  name: string
}

export type Assignment = {
  giverId: string
  receiverId: string
}

export type Session = {
  id: string
  houses: House[]
  people: Person[]
  assignments: Assignment[]
  isDrawComplete: boolean
  createdAt: number
}

// In-memory store (ephemeral). For production, replace with a DB (e.g., Prisma + SQLite/Postgres).
// In dev, preserve across HMR by attaching to globalThis.
const globalAny = globalThis as unknown as { __amigoSessions?: Map<string, Session> }
const sessions: Map<string, Session> = globalAny.__amigoSessions ?? new Map<string, Session>()
globalAny.__amigoSessions = sessions

export function generateSessionId(): string {
  // 12 bytes -> 24 hex chars
  return randomBytes(12).toString("hex")
}

export function createSession(input: { houses: House[]; people: Omit<Person, "claimed">[] }): Session {
  const id = generateSessionId()
  const people: Person[] = input.people.map((p) => ({ ...p, claimed: false }))
  // Precompute assignments so each participante pueda ver su resultado al instante
  const precomputed = createValidAssignments(people)
  const session: Session = {
    id,
    houses: input.houses,
    people,
    assignments: precomputed,
    // isDrawComplete indica que ya existen asignaciones listas para revelar
    isDrawComplete: precomputed.length > 0,
    createdAt: Date.now(),
  }
  sessions.set(id, session)
  return session
}

export function getSession(id: string): Session | undefined {
  return sessions.get(id)
}

export function setSession(session: Session): void {
  sessions.set(session.id, session)
}

export function claimPerson(sessionId: string, personId: string): { ok: true } | { ok: false; reason: string } {
  const session = sessions.get(sessionId)
  if (!session) return { ok: false, reason: "NOT_FOUND" }
  const person = session.people.find((p) => p.id === personId)
  if (!person) return { ok: false, reason: "PERSON_NOT_FOUND" }
  if (person.claimed) return { ok: false, reason: "ALREADY_CLAIMED" }
  person.claimed = true

  // If all claimed and draw not yet complete, perform draw automatically
  if (!session.isDrawComplete && session.people.every((p) => p.claimed)) {
    const assignments = createValidAssignments(session.people)
    session.assignments = assignments
    session.isDrawComplete = assignments.length > 0
  }

  sessions.set(sessionId, session)
  return { ok: true }
}

export function getReceiverFor(sessionId: string, giverId: string): { receiverId: string } | null {
  const session = sessions.get(sessionId)
  if (!session || !session.isDrawComplete) return null
  const a = session.assignments.find((x) => x.giverId === giverId)
  return a ? { receiverId: a.receiverId } : null
}

// Assignment algorithm (no same person and no same house, full matching required)
export function createValidAssignments(people: Person[]): Assignment[] {
  const n = people.length
  const assignments: Assignment[] = []
  const used = new Set<string>()

  function isValid(giver: Person, receiver: Person): boolean {
    return giver.id !== receiver.id && giver.houseId !== receiver.houseId && !used.has(receiver.id)
  }

  function backtrack(index: number): boolean {
    if (index === n) return true
    const giver = people[index]
    const shuffledPeople = [...people].sort(() => Math.random() - 0.5)
    for (const receiver of shuffledPeople) {
      if (isValid(giver, receiver)) {
        used.add(receiver.id)
        assignments.push({ giverId: giver.id, receiverId: receiver.id })
        if (backtrack(index + 1)) return true
        used.delete(receiver.id)
        assignments.pop()
      }
    }
    return false
  }

  for (let attempt = 0; attempt < 100; attempt++) {
    assignments.length = 0
    used.clear()
    const shuffled = [...people].sort(() => Math.random() - 0.5)
    if (backtrackWithOrder(shuffled)) return assignments
  }
  return []

  function backtrackWithOrder(order: Person[]): boolean {
    if (assignments.length === n) return true
    const giver = order[assignments.length]
    const shuffledReceivers = [...people].sort(() => Math.random() - 0.5)
    for (const receiver of shuffledReceivers) {
      if (isValid(giver, receiver)) {
        used.add(receiver.id)
        assignments.push({ giverId: giver.id, receiverId: receiver.id })
        if (backtrackWithOrder(order)) return true
        used.delete(receiver.id)
        assignments.pop()
      }
    }
    return false
  }
}
