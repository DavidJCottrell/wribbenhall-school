"use client"

import { DownloadIcon, FileTextIcon, SearchIcon } from "lucide-react"
import { useDeferredValue, useState } from "react"

import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { policyCategorySchema, type PolicyCategory, type PolicyDocument } from "@/lib/content/schema"
import { formatMedium } from "@/lib/dates"
import { formatFileSize, mediaUrl } from "@/lib/media"

const ALL = "all"
const categories = policyCategorySchema.options

function matches(policy: PolicyDocument, query: string) {
  if (!query) return true
  const haystack = `${policy.title} ${policy.summary} ${policy.category}`.toLowerCase()
  return query
    .toLowerCase()
    .split(/\s+/)
    .every((word) => haystack.includes(word))
}

export function PolicyBrowser({ policies }: { policies: PolicyDocument[] }) {
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<PolicyCategory | typeof ALL>(ALL)
  const deferredQuery = useDeferredValue(query.trim())

  const results = policies.filter(
    (policy) => (category === ALL || policy.category === category) && matches(policy, deferredQuery),
  )
  const grouped = categories
    .map((name) => ({ name, items: results.filter((policy) => policy.category === name) }))
    .filter((group) => group.items.length > 0)

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-[1fr_16rem]">
        <div>
          <Label htmlFor="policy-search" className="mb-2 text-base">
            Search documents
          </Label>
          <InputGroup className="h-11 bg-card">
            <InputGroupInput
              id="policy-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="For example, attendance or medical"
              className="text-base"
            />
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
          </InputGroup>
        </div>
        <div>
          <Label htmlFor="policy-category" className="mb-2 text-base">
            Category
          </Label>
          <Select value={category} onValueChange={(value) => setCategory(value as PolicyCategory | typeof ALL)}>
            <SelectTrigger id="policy-category" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All categories</SelectItem>
              {categories.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="mt-6 text-muted-foreground" aria-live="polite">
        {results.length === policies.length
          ? `${policies.length} documents`
          : `${results.length} of ${policies.length} documents`}
      </p>

      {grouped.length === 0 ? (
        <Empty className="mt-6 border border-dashed border-input bg-card">
          <EmptyHeader>
            <EmptyTitle className="font-sans text-lg">No documents match &ldquo;{deferredQuery}&rdquo;</EmptyTitle>
            <EmptyDescription className="text-base">
              Try a shorter word, or clear the search to see everything.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              variant="outline"
              onClick={() => {
                setQuery("")
                setCategory(ALL)
              }}
            >
              Clear search
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="mt-4 space-y-14">
          {grouped.map((group) => (
            <section key={group.name} aria-labelledby={`group-${group.name}`}>
              <h2 id={`group-${group.name}`} className="text-heading">
                {group.name}
              </h2>
              <ul className="mt-4 divide-y divide-border border-y border-border">
                {group.items.map((policy) => (
                  <PolicyRow key={policy.id} policy={policy} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

function PolicyRow({ policy }: { policy: PolicyDocument }) {
  const href = mediaUrl(policy.file.key)
  const format = policy.file.format.toUpperCase()

  return (
    <li className="grid gap-4 py-5 sm:grid-cols-[auto_1fr_auto] sm:items-start">
      <FileTextIcon aria-hidden="true" className="mt-1 hidden size-6 text-severn sm:block" />
      <div>
        <h3 className="font-sans text-lg font-semibold">
          <a href={href} target="_blank" rel="noopener" className="text-ink underline-offset-4 hover:text-severn hover:underline">
            {policy.title}
            <span className="sr-only"> ({format}, opens in a new tab)</span>
          </a>
        </h3>
        <p className="mt-1 max-w-prose text-ink/85">{policy.summary}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {format}, {formatFileSize(policy.file.sizeBytes)}. Updated {formatMedium(policy.updated)}
          {policy.reviewDue ? `. Next review ${formatMedium(policy.reviewDue)}` : null}
        </p>
      </div>
      <Button asChild variant="outline" size="sm" className="justify-self-start">
        <a href={href} download>
          <DownloadIcon />
          Download
          <span className="sr-only"> {policy.title}</span>
        </a>
      </Button>
    </li>
  )
}
