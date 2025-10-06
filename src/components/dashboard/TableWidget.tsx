import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type TableWidgetColumn = {
  key: string;
  label: string;
  align?: "left" | "center" | "right";
};

export type TableWidgetProps = {
  columns: TableWidgetColumn[];
  rows: Record<string, string | number>[];
  emptyMessage?: string;
};

export function TableWidget({ columns, rows, emptyMessage }: TableWidgetProps) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage ?? "No records"}</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead
              key={column.key}
              className={column.align === "right" ? "text-right" : column.align === "center" ? "text-center" : undefined}
            >
              {column.label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, index) => (
          <TableRow key={index}>
            {columns.map((column) => (
              <TableCell
                key={column.key}
                className={column.align === "right" ? "text-right" : column.align === "center" ? "text-center" : undefined}
              >
                {row[column.key] ?? "—"}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
