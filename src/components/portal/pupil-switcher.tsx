"use client"

import { usePathname, useRouter } from "next/navigation"

import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Props = { pupils: { id: string; name: string }[]; currentId: string }

// Jumps to another pupil and stays on the same section, so comparing two pupils' attendance is one tap.
export function PupilSwitcher({ pupils, currentId }: Props) {
  const router = useRouter()
  const pathname = usePathname()

  if (pupils.length < 2) return null

  function go(id: string) {
    if (id === currentId) return
    router.push(pathname.replace(`/portal/pupils/${currentId}`, `/portal/pupils/${id}`))
  }

  return (
    <div className="flex items-center gap-2 print:hidden">
      <Label htmlFor="pupil-switcher" className="sr-only text-sm text-muted-foreground sm:not-sr-only">
        Switch pupil
      </Label>
      <Select value={currentId} onValueChange={go}>
        <SelectTrigger id="pupil-switcher" className="h-9 w-44 sm:w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {pupils.map((pupil) => (
            <SelectItem key={pupil.id} value={pupil.id}>
              {pupil.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
