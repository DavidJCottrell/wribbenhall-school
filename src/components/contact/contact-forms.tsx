"use client"

import { useEffect, useState } from "react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { EnquiryForm } from "./enquiry-form"
import { PlaceApplicationForm } from "./place-application-form"

type FormTab = "enquiry" | "apply"

const isFormTab = (value: string): value is FormTab => value === "enquiry" || value === "apply"

export function ContactForms({ officeEmail }: { officeEmail: string }) {
  const [tab, setTab] = useState<FormTab>("enquiry")

  // Links like /contact#apply open the matching form
  useEffect(() => {
    function syncFromHash() {
      const hash = window.location.hash.slice(1)
      if (isFormTab(hash)) {
        setTab(hash)
        document.getElementById("forms")?.scrollIntoView({ block: "start" })
      }
    }
    syncFromHash()
    window.addEventListener("hashchange", syncFromHash)
    return () => window.removeEventListener("hashchange", syncFromHash)
  }, [])

  function changeTab(value: string) {
    if (!isFormTab(value)) return
    setTab(value)
    history.replaceState(null, "", `#${value}`)
  }

  return (
    <Tabs id="forms" value={tab} onValueChange={changeTab} className="scroll-mt-28 gap-0">
      <TabsList className="h-auto w-full justify-start gap-1 rounded-none rounded-t-xl border border-b-0 border-border bg-secondary p-1.5 sm:w-auto sm:rounded-t-xl">
        <TabsTrigger value="enquiry" className="h-11 flex-1 px-5 text-base data-[state=active]:shadow-none sm:flex-none">
          Send an enquiry
        </TabsTrigger>
        <TabsTrigger value="apply" className="h-11 flex-1 px-5 text-base data-[state=active]:shadow-none sm:flex-none">
          Apply for a place
        </TabsTrigger>
      </TabsList>
      <div className="rounded-xl rounded-tl-none border border-border bg-card p-6 md:p-9">
        <TabsContent value="enquiry">
          <h2 className="text-heading">Send an enquiry</h2>
          <p className="mt-2 mb-8 max-w-prose text-muted-foreground">
            Questions about admissions, visiting or anything else. We&apos;ll reply by email or phone.
          </p>
          <EnquiryForm officeEmail={officeEmail} />
        </TabsContent>
        <TabsContent value="apply">
          <h2 className="text-heading">Apply for a place</h2>
          <div className="mt-2 mb-8 max-w-prose space-y-2 text-muted-foreground">
            <p>
              Each application is considered individually by the proprietor. We look at information from your
              child&apos;s current placement, their EHCP and the professionals who have assessed them, and we meet
              your child and family for an interview. This form is the first step.
            </p>
            <p>It takes about 10 minutes. You can go back to change answers before you send it.</p>
          </div>
          <PlaceApplicationForm admissionsEmail={officeEmail} />
        </TabsContent>
      </div>
    </Tabs>
  )
}
