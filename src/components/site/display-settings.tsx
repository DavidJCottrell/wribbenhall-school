"use client"

import { SettingsIcon } from "lucide-react"
import { useId } from "react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useDisplayPreferences } from "@/hooks/use-display-preferences"
import type { ColourScheme, TextSize } from "@/lib/display-preferences"

const textSizeOptions: { value: TextSize; label: string; sample: string }[] = [
  { value: "default", label: "Standard", sample: "text-base" },
  { value: "large", label: "Large", sample: "text-xl" },
  { value: "extra-large", label: "Extra large", sample: "text-2xl" },
]

const colourSchemeOptions: { value: ColourScheme; label: string; description: string }[] = [
  { value: "default", label: "Standard colours", description: "Soft greens on a light background" },
  { value: "high-contrast", label: "Yellow on black", description: "High contrast, easier on the eyes for some readers" },
]

export function DisplaySettings() {
  const { textSize, colourScheme, setTextSize, setColourScheme, reset } = useDisplayPreferences()
  const idPrefix = useId()
  const isDefault = textSize === "default" && colourScheme === "default"

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Display settings: text size and colours">
          <SettingsIcon />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[min(24rem,100vw)] overflow-y-auto bg-background">
        <SheetHeader>
          <SheetTitle className="font-display text-xl font-normal">Display settings</SheetTitle>
          <SheetDescription>Changes apply to every page and are remembered on this device.</SheetDescription>
        </SheetHeader>

        <div className="space-y-8 px-4">
          <fieldset>
            <legend className="mb-3 text-lg font-semibold">Text size</legend>
            <RadioGroup value={textSize} onValueChange={(value) => setTextSize(value as TextSize)}>
              {textSizeOptions.map((option) => (
                <div key={option.value} className="flex items-center gap-3 rounded-lg border p-3 has-[[data-state=checked]]:border-ring has-[[data-state=checked]]:border-2">
                  <RadioGroupItem value={option.value} id={`${idPrefix}-size-${option.value}`} />
                  <Label htmlFor={`${idPrefix}-size-${option.value}`} className={`flex-1 cursor-pointer text-base ${option.sample}`}>
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </fieldset>

          <fieldset>
            <legend className="mb-3 text-lg font-semibold">Colours</legend>
            <RadioGroup value={colourScheme} onValueChange={(value) => setColourScheme(value as ColourScheme)}>
              {colourSchemeOptions.map((option) => (
                <div key={option.value} className="flex items-start gap-3 rounded-lg border p-3 has-[[data-state=checked]]:border-ring has-[[data-state=checked]]:border-2">
                  <RadioGroupItem value={option.value} id={`${idPrefix}-colour-${option.value}`} className="mt-1" />
                  <Label htmlFor={`${idPrefix}-colour-${option.value}`} className="flex-1 cursor-pointer flex-col items-start gap-1 text-base leading-snug">
                    <span className="font-semibold">{option.label}</span>
                    <span className="font-normal text-muted-foreground">{option.description}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </fieldset>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={reset} disabled={isDefault}>
            Reset to standard
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
