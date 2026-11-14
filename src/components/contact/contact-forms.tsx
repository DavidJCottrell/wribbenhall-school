"use client"

import { useEffect, useState } from "react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { EnquiryForm } from "./enquiry-form"
import { PlaceApplicationForm } from "./place-application-form"

type FormTab = "enquiry" | "apply"

const isFormTab = (value: string): value is FormTab => value === "enquiry" || value === "apply"

export function ContactForms({ officeEmail, admissionsEmail }: { officeEmail: string; admissionsEmail: string }) {
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
            Questions about visiting, transport, therapies or anything else. We reply within two working days.
          </p>
          <EnquiryForm officeEmail={officeEmail} />
        </TabsContent>
        <TabsContent value="apply">
          <h2 className="text-heading">Apply for a place</h2>
          <div className="mt-2 mb-8 max-w-prose space-y-2 text-muted-foreground">
            <p>
              Places at Wribbenhall are agreed with your local authority as part of your child&apos;s EHCP. This form
              tells us about your child so we can arrange a visit and support you through that process.
            </p>
            <p>It takes about 10 minutes. You can go back to change answers before you send it.</p>
          </div>
          <PlaceApplicationForm admissionsEmail={admissionsEmail} />
        </TabsContent>
      </div>
    </Tabs>
  )
}
