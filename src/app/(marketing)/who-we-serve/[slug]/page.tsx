import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AgeGroupPage } from "@/components/marketing/age-group-page";
import { AGE_GROUPS, getAgeGroup } from "@/content/marketing/age-groups";
import { getSession } from "@/lib/auth/session";
import { roleHomePath } from "@/lib/auth/role-path";
import { canonicalFor } from "@/lib/seo/metadata";

interface AgeGroupRouteProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return AGE_GROUPS.map((group) => ({ slug: group.slug }));
}

export async function generateMetadata({ params }: AgeGroupRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const group = getAgeGroup(slug);
  if (!group) return {};
  return {
    title: `${group.title}, ${group.agesLabel}`,
    description: `${group.headline} ${group.intro}`,
    alternates: canonicalFor(`/who-we-serve/${group.slug}`),
  };
}

export default async function AgeGroupRoute({ params }: AgeGroupRouteProps) {
  const { slug } = await params;
  const group = getAgeGroup(slug);
  if (!group) notFound();

  // Every "Get support now" starts at parent sign-up; someone already signed
  // in goes to their own dashboard instead of a sign-up form.
  const session = await getSession();
  const supportHref = session ? roleHomePath(session.role) : "/signup?role=parent";

  return <AgeGroupPage group={group} supportHref={supportHref} />;
}
