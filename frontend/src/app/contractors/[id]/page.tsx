"use client";

import { use } from "react";
import useSWR from "swr";
import { notFound } from "next/navigation";
import { PartyProfile } from "@/components/parties/PartyProfile";
import { partiesApi } from "@/lib/api";
import type { ContractorProfile } from "@/types";

interface Props { params: Promise<{ id: string }> }

export default function ContractorProfilePage({ params }: Props) {
  const { id } = use(params);
  const { data, error, isLoading } = useSWR<ContractorProfile>(
    `contractor-${id}`,
    () => partiesApi.contractor(id).then((r) => r.data)
  );

  if (error) return notFound();
  if (isLoading || !data) {
    return <div className="min-h-screen bg-surface-950 flex items-center justify-center text-slate-500">Loading contractor...</div>;
  }

  const contractor = data.contractor;

  return (
    <PartyProfile
      kind="contractor"
      name={contractor.canonical_name}
      subtitle={contractor.registered_state ? `Registered in ${contractor.registered_state}` : "Contractor record"}
      website={contractor.website}
      warning={contractor.blacklisted ? contractor.blacklist_reason || "This contractor is marked as blacklisted." : undefined}
      details={[
        { label: "Registration Number", value: contractor.registration_number },
        { label: "GST Number", value: contractor.gst_number },
        { label: "Registered State", value: contractor.registered_state },
        { label: "Contact Email", value: contractor.contact_email },
        { label: "Contact Phone", value: contractor.contact_phone },
        { label: "Aliases", value: contractor.aliases?.length ? contractor.aliases.join(", ") : null },
      ]}
      stats={data.stats}
      projects={data.projects}
    />
  );
}
