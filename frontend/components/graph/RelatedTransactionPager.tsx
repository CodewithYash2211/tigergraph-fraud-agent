"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export function RelatedTransactionPager({
  total,
  page,
  pageCount,
  pageSize,
  onPage,
}: {
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
  onPage: (page: number) => void;
}) {
  if (total <= pageSize) return null;
  const first = page * pageSize + 1;
  const last = Math.min(total, first + pageSize - 1);

  return (
    <nav className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-t hairline px-4 py-3 sm:px-6" aria-label="Related transaction pages">
      <p className="min-w-0 text-[12px] leading-relaxed text-ivory-faint">
        Related transaction IDs {first.toLocaleString()}–{last.toLocaleString()} of {total.toLocaleString()}
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <button type="button" onClick={() => onPage(page - 1)} disabled={page === 0}
          aria-label="Previous related transactions"
          className="rounded-lg p-1.5 text-ivory ring-1 ring-ivory/15 disabled:cursor-not-allowed disabled:opacity-40">
          <ChevronLeft size={15} />
        </button>
        <span className="min-w-[5.5rem] text-center text-[11px] text-ivory-dim">Page {page + 1} of {pageCount}</span>
        <button type="button" onClick={() => onPage(page + 1)} disabled={page + 1 >= pageCount}
          aria-label="Next related transactions"
          className="rounded-lg p-1.5 text-ivory ring-1 ring-ivory/15 disabled:cursor-not-allowed disabled:opacity-40">
          <ChevronRight size={15} />
        </button>
      </div>
    </nav>
  );
}
