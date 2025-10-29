"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Home, Plus, Trash2, Users, Shuffle, AlertCircle } from "lucide-react"
import type { House, Person, Assignment } from "@/app/page"

type SetupViewProps = {
  houses: House[]
  setHouses: (houses: House[]) => void
  people: Person[]
  setPeople: (people: Person[]) => void
  assignments: Assignment[]
  setAssignments: (assignments: Assignment[]) => void
  isDrawComplete: boolean
  setIsDrawComplete: (complete: boolean) => void
}

export function SetupView({
  houses,
  setHouses,
  people,
  setPeople,
  assignments,
  setAssignments,
  isDrawComplete,
  setIsDrawComplete,
}: SetupViewProps) {
  const [newHouseName, setNewHouseName] = useState("")
  const [newPersonName, setNewPersonName] = useState("")
  const [selectedHouseId, setSelectedHouseId] = useState("")
  const [error, setError] = useState("")
  const [creatingLink, setCreatingLink] = useState(false)
  const [sessionUrl, setSessionUrl] = useState<string | null>(null)

  const addHouse = () => {
    if (!newHouseName.trim()) return
    const newHouse: House = {
      id: Date.now().toString(),
      name: newHouseName.trim(),
    }
    setHouses([...houses, newHouse])
    setNewHouseName("")
    if (!selectedHouseId) {
      setSelectedHouseId(newHouse.id)
    }
  }

  const removeHouse = (houseId: string) => {
    setHouses(houses.filter((h) => h.id !== houseId))
    setPeople(people.filter((p) => p.houseId !== houseId))
    if (selectedHouseId === houseId) {
      setSelectedHouseId(houses[0]?.id || "")
    }
  }

  const addPerson = () => {
    if (!newPersonName.trim() || !selectedHouseId) return
    const newPerson: Person = {
      id: Date.now().toString(),
      name: newPersonName.trim(),
      houseId: selectedHouseId,
    }
    setPeople([...people, newPerson])
    setNewPersonName("")
  }

  const removePerson = (personId: string) => {
    setPeople(people.filter((p) => p.id !== personId))
  }

  const performDraw = () => {
    setError("")

    if (people.length < 2) {
      setError("Se necesitan al menos 2 personas para hacer el sorteo")
      return
    }

    // Check if draw is possible
    const houseCounts = new Map<string, number>()
    people.forEach((person) => {
      houseCounts.set(person.houseId, (houseCounts.get(person.houseId) || 0) + 1)
    })

    // If there's only one house with all people, draw is impossible
    if (houseCounts.size === 1) {
      setError("No se puede hacer el sorteo: todas las personas viven en la misma casa")
      return
    }

    // Try to create valid assignments using a backtracking algorithm
    const newAssignments = createValidAssignments(people)

    if (newAssignments.length === 0) {
      setError("No se pudo encontrar una combinación válida. Intenta reorganizar las casas.")
      return
    }

    setAssignments(newAssignments)
    setIsDrawComplete(true)
  }

  const resetDraw = () => {
    setAssignments([])
    setIsDrawComplete(false)
    setError("")
  }

  const createShareLink = async () => {
    setError("")
    setSessionUrl(null)
    if (people.length < 2) {
      setError("Agrega al menos 2 participantes para crear el enlace")
      return
    }
    try {
      setCreatingLink(true)
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ houses, people }),
      })
      if (!res.ok) throw new Error("No se pudo crear la sesión")
      const data = (await res.json()) as { id: string }
      const origin = typeof window !== "undefined" ? window.location.origin : ""
      setSessionUrl(`${origin}/s/${data.id}`)
    } catch (e: any) {
      setError(e.message || "Error creando el enlace")
    } finally {
      setCreatingLink(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Houses Section */}
      <Card className="border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <Home className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-foreground text-xl">Casas</h2>
        </div>

        <div className="mb-4 flex gap-2">
          <Input
            placeholder="Nombre de la casa (ej: Casa García)"
            value={newHouseName}
            onChange={(e) => setNewHouseName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addHouse()}
            className="flex-1"
          />
          <Button onClick={addHouse} className="bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          {houses.map((house) => (
            <div
              key={house.id}
              className="flex items-center justify-between rounded-lg border border-border bg-background p-3"
            >
              <span className="font-medium text-foreground">{house.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeHouse(house.id)}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </Card>

      {/* People Section */}
      <Card className="border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-secondary" />
          <h2 className="font-semibold text-foreground text-xl">Participantes</h2>
        </div>

        <div className="mb-4 flex flex-col gap-2 md:flex-row">
          <Input
            placeholder="Nombre de la persona"
            value={newPersonName}
            onChange={(e) => setNewPersonName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addPerson()}
            className="flex-1"
          />
          <select
            value={selectedHouseId}
            onChange={(e) => setSelectedHouseId(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-foreground"
            disabled={houses.length === 0}
          >
            <option value="">Seleccionar casa</option>
            {houses.map((house) => (
              <option key={house.id} value={house.id}>
                {house.name}
              </option>
            ))}
          </select>
          <Button onClick={addPerson} disabled={!selectedHouseId} className="bg-secondary hover:bg-secondary/90">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-2">
          {houses.map((house) => {
            const housePeople = people.filter((p) => p.houseId === house.id)
            if (housePeople.length === 0) return null

            return (
              <div key={house.id} className="rounded-lg border border-border bg-background p-3">
                <div className="mb-2 font-medium text-muted-foreground text-sm">{house.name}</div>
                <div className="grid gap-2 md:grid-cols-2">
                  {housePeople.map((person) => (
                    <div key={person.id} className="flex items-center justify-between rounded-md bg-card px-3 py-2">
                      <span className="text-foreground">{person.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removePerson(person.id)}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Draw & Share */}
      <Card className="border-border bg-card p-6">
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {isDrawComplete ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-secondary/10 p-4 text-center">
              <p className="font-semibold text-secondary text-lg">¡Sorteo completado! 🎉</p>
              <p className="text-muted-foreground text-sm">Los participantes ya pueden ver sus resultados</p>
            </div>
            <Button
              onClick={resetDraw}
              variant="outline"
              className="w-full border-border hover:bg-muted bg-transparent"
            >
              Hacer nuevo sorteo
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            <Button
              onClick={performDraw}
              disabled={people.length < 2}
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
            >
              <Shuffle className="mr-2 h-5 w-5" />
              Realizar Sorteo (local)
            </Button>
            <Button
              onClick={createShareLink}
              disabled={people.length < 2 || creatingLink}
              variant="outline"
              className="w-full border-border hover:bg-muted bg-transparent"
            >
              Crear enlace para participantes
            </Button>
          </div>
        )}

        {sessionUrl && (
          <div className="mt-4 rounded-lg border border-border bg-background p-4">
            <div className="mb-2 text-sm text-muted-foreground">Comparte este enlace con los participantes:</div>
            <div className="flex items-center gap-2">
              <Input readOnly value={sessionUrl} className="flex-1" />
              <Button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(sessionUrl)
                  } catch {
                    /* ignore */
                  }
                }}
              >
                Copiar
              </Button>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Cada persona elegirá su nombre y verá su amigo secreto de inmediato. Solo se puede ver una vez.
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

// Algorithm to create valid assignments
function createValidAssignments(people: Person[]): Assignment[] {
  const n = people.length
  const assignments: Assignment[] = []
  const used = new Set<string>()

  function isValid(giver: Person, receiver: Person): boolean {
    return giver.id !== receiver.id && giver.houseId !== receiver.houseId && !used.has(receiver.id)
  }

  function backtrack(index: number): boolean {
    if (index === n) {
      return true
    }

    const giver = people[index]
    const shuffledPeople = [...people].sort(() => Math.random() - 0.5)

    for (const receiver of shuffledPeople) {
      if (isValid(giver, receiver)) {
        used.add(receiver.id)
        assignments.push({ giverId: giver.id, receiverId: receiver.id })

        if (backtrack(index + 1)) {
          return true
        }

        used.delete(receiver.id)
        assignments.pop()
      }
    }

    return false
  }

  // Try multiple times with different random orders
  for (let attempt = 0; attempt < 100; attempt++) {
    assignments.length = 0
    used.clear()
    const shuffledStart = [...people].sort(() => Math.random() - 0.5)

    if (backtrackWithOrder(shuffledStart)) {
      return assignments
    }
  }

  return []

  function backtrackWithOrder(orderedPeople: Person[]): boolean {
    if (assignments.length === n) {
      return true
    }

    const giver = orderedPeople[assignments.length]
    const shuffledReceivers = [...people].sort(() => Math.random() - 0.5)

    for (const receiver of shuffledReceivers) {
      if (isValid(giver, receiver)) {
        used.add(receiver.id)
        assignments.push({ giverId: giver.id, receiverId: receiver.id })

        if (backtrackWithOrder(orderedPeople)) {
          return true
        }

        used.delete(receiver.id)
        assignments.pop()
      }
    }

    return false
  }
}
