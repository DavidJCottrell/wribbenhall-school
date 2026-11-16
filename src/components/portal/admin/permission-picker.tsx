"use client"

import { useController, type Control, type FieldValues, type Path } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldContent, FieldDescription, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import {
  PERMISSIONS,
  PERMISSION_PRESETS,
  allPermissions,
  normalizePermissions,
  permissionGroups,
  permissionsInGroup,
  permissionsThatDependOn,
  type Permission,
} from "@/lib/auth/permissions"

type Props<T extends FieldValues> = {
  control: Control<T>
  name: Path<T>
  // Keeps checkbox ids unique when two of these are on the page.
  idPrefix?: string
}

// What every member of staff can do without ticking anything.
const BASELINE = ["See every current pupil, their profile and contacts", "Read daily reports"]

export function PermissionPicker<T extends FieldValues>({ control, name, idPrefix = "" }: Props<T>) {
  const { field } = useController({ control, name })
  const selected: Permission[] = normalizePermissions(field.value)

  function toggle(permission: Permission, checked: boolean) {
    if (checked) {
      field.onChange(normalizePermissions([...selected, permission]))
      return
    }
    // Taking one away also takes away anything that includes it.
    const removed = new Set<Permission>([permission, ...permissionsThatDependOn(permission)])
    field.onChange(selected.filter((candidate) => !removed.has(candidate)))
  }

  const everything = selected.length === allPermissions.length

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-base font-medium">Start from a preset</p>
        <div className="flex flex-wrap gap-2">
          {PERMISSION_PRESETS.map((preset) => (
            <Button key={preset.id} type="button" variant="outline" size="sm" onClick={() => field.onChange([...preset.permissions])} title={preset.description}>
              {preset.label}
            </Button>
          ))}
          <Button type="button" variant="ghost" size="sm" onClick={() => field.onChange([])}>
            Clear all
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">A preset just ticks boxes. You can change them afterwards.</p>
      </div>

      {permissionGroups.map((group) => (
        <FieldSet key={group.id} className="gap-3">
          <FieldLegend className="mb-0 text-base font-medium">{group.label}</FieldLegend>
          <div className="space-y-3">
            {permissionsInGroup(group.id).map((permission) => {
              const id = `${idPrefix}perm-${permission.replace(".", "-")}`
              const definition = PERMISSIONS[permission]
              return (
                <Field key={permission} orientation="horizontal" className="items-start">
                  <Checkbox
                    id={id}
                    checked={selected.includes(permission)}
                    onCheckedChange={(checked) => toggle(permission, checked === true)}
                    className="mt-0.5 size-5"
                  />
                  <FieldContent>
                    <FieldLabel htmlFor={id} className="text-base leading-snug font-normal">
                      {definition.label}
                    </FieldLabel>
                    <FieldDescription>{definition.description}</FieldDescription>
                  </FieldContent>
                </Field>
              )
            })}
          </div>
        </FieldSet>
      ))}

      <section aria-label="What this person will be able to do" className="rounded-lg border border-border bg-secondary p-4">
        <p className="font-medium">What this person will be able to do</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {BASELINE.map((item) => (
            <li key={item}>{item}</li>
          ))}
          {selected.map((permission) => (
            <li key={permission}>{PERMISSIONS[permission].label}</li>
          ))}
        </ul>
        {everything ? <p className="mt-3 text-sm font-medium">This is every permission, so they can manage everything.</p> : null}
      </section>
    </div>
  )
}
