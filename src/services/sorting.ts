export interface SortResult {
  column: string;
  direction: "asc" | "desc";
  orderBy: string;
}

export function buildSortClause(
  requestedColumn: string | undefined,
  requestedDirection: string | undefined,
  allowedColumns: string[],
  defaultColumn: string,
  defaultDirection: "asc" | "desc" = "desc"
): SortResult {
  const column = allowedColumns.includes(requestedColumn ?? "") ? (requestedColumn as string) : defaultColumn;
  const direction = requestedDirection === "asc" || requestedDirection === "desc" ? requestedDirection : defaultDirection;
  return { column, direction, orderBy: `${column} ${direction.toUpperCase()}` };
}
