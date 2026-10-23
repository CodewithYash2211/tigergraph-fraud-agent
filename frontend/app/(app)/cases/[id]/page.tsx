import { getCasePack } from "@/lib/data/adapter";
import { CaseDetail } from "./CaseDetail";

export function generateStaticParams() {
  return getCasePack().map((c) => ({ id: c.case_id }));
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CaseDetail id={id} />;
}
