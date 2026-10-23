import { getCasePack } from "@/lib/data/adapter";
import { TransactionDetail } from "./TransactionDetail";

export function generateStaticParams() {
  return getCasePack().map((c) => ({ id: c.flagged_txn_id }));
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TransactionDetail id={id} />;
}
