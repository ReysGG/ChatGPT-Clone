"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState, ErrorState, Skeleton } from "./primitives";

export interface Column<T> {
  /** Stable key for the column. */
  key: string;
  header: React.ReactNode;
  align?: "left" | "right" | "center";
  /** Extra classes for the cell (and header). */
  className?: string;
  /** Render the cell for a row. */
  render: (row: T) => React.ReactNode;
  /** Hide on small screens. */
  hideOnMobile?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  caption: string;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  empty?: { icon?: React.ElementType; title: string; description?: string; action?: React.ReactNode };
  pageSize?: number;
}

const alignClass = (align: Column<unknown>["align"]) =>
  align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  caption,
  isLoading = false,
  error = null,
  onRetry,
  empty,
  pageSize = 10,
}: DataTableProps<T>) {
  const [page, setPage] = useState(0);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));

  // Clamp the current page whenever the dataset shrinks (e.g. via filtering).
  useEffect(() => {
    if (page > pageCount - 1) setPage(pageCount - 1);
  }, [page, pageCount]);

  const pageRows = useMemo(
    () => rows.slice(page * pageSize, page * pageSize + pageSize),
    [rows, page, pageSize]
  );

  const showPagination = !isLoading && !error && rows.length > pageSize;
  const colCount = columns.length;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-border bg-accent/60">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={cn(
                    "sticky top-0 z-10 bg-accent/95 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur",
                    alignClass(col.align),
                    col.hideOnMobile && "hidden md:table-cell",
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: Math.min(pageSize, 5) }).map((_, rowIndex) => (
                <tr key={`skeleton-${rowIndex}`} className="border-b border-border/70">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn("px-4 py-3.5", col.hideOnMobile && "hidden md:table-cell")}
                    >
                      <Skeleton className="h-4 w-full max-w-[140px]" />
                    </td>
                  ))}
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={colCount} className="p-0">
                  <ErrorState message={error} onRetry={onRetry} />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="p-0">
                  <EmptyState
                    icon={empty?.icon}
                    title={empty?.title ?? "Tidak ada data"}
                    description={empty?.description}
                    action={empty?.action}
                  />
                </td>
              </tr>
            ) : (
              pageRows.map((row) => (
                <tr
                  key={getRowKey(row)}
                  className="border-b border-border/70 transition-colors last:border-0 hover:bg-accent/50"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        "px-4 py-3.5 align-middle text-foreground",
                        alignClass(col.align),
                        col.align === "right" && "tabular-nums",
                        col.hideOnMobile && "hidden md:table-cell",
                        col.className
                      )}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showPagination ? (
        <div className="flex items-center justify-between gap-4 border-t border-border px-4 py-3">
          <p className="text-xs text-muted-foreground tabular-nums">
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, rows.length)} dari {rows.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              aria-label="Halaman sebelumnya"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            <span className="px-2 text-xs font-medium text-foreground tabular-nums">
              {page + 1} / {pageCount}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={page >= pageCount - 1}
              aria-label="Halaman berikutnya"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
