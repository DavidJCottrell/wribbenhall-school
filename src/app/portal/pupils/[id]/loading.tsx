import { CardGridSkeleton } from "@/components/portal/loading-skeletons"

// The pupil's name and tabs stay on screen while a section loads, so only the content below them is replaced.
export default function PupilSectionLoading() {
  return <CardGridSkeleton />
}
