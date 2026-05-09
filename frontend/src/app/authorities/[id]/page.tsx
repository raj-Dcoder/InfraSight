"use client";

import useSWR from "swr";
import { notFound } from "next/navigation";
import { PartyProfile } from "@/components/parties/PartyProfile";
import { partiesApi } from "@/lib/api";
import type { AuthorityProfile } from "@/types";

interface Props { params: { id: string } }

export default function AuthorityProfilePage({ params }: Props) {
  const { data, error, isLoading } = useSWR<AuthorityProfile>(
    `authority-${params.id}`,
    () => partiesApi.authority(params.id).then((r) => r.data)
  );

  if (error) return notFound();
  if (isLoading || !data) {
    return <div className="min-h-screen bg-surface-950 flex items-center justify-center text-slate-500">Loading authority...</div>;
  }

  const authority = data.authority;

  return (
    <PartyProfile
      kind="authority"
      name={authority.canonical_name}
      subtitle={[authority.authority_type, authority.district, authority.state].filter(Boolean).join(" - ") || "Public authority record"}
      website={authority.website}
      details={[
        { label: "Authority Type", value: authority.authority_type },
        { label: "Nodal Officer", value: authority.nodal_officer },
        { label: "State", value: authority.state },
        { label: "District", value: authority.district },
        { label: "City", value: authority.city },
      ]}
      stats={data.stats}
      projects={data.projects}
    />
  );
}
