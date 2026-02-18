'use client';

import { useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';

import type { TableBlockContent } from '../types';

type TableBlockProps = Readonly<{
  content: TableBlockContent;
  onChange: (content: TableBlockContent) => void;
}>;

export function TableBlock({ content, onChange }: TableBlockProps) {
  const { headers, rows } = content;

  const updateHeader = useCallback(
    (colIndex: number, value: string) => {
      const next = [...headers];
      next[colIndex] = value;
      onChange({ ...content, headers: next });
    },
    [content, headers, onChange],
  );

  const updateCell = useCallback(
    (rowIndex: number, colIndex: number, value: string) => {
      const next = rows.map((r) => [...r]);
      if (!next[rowIndex]) next[rowIndex] = [];
      next[rowIndex][colIndex] = value;
      onChange({ ...content, rows: next });
    },
    [content, rows, onChange],
  );

  const addColumn = useCallback(() => {
    onChange({
      headers: [...headers, `Column ${headers.length + 1}`],
      rows: rows.map((r) => [...r, '']),
    });
  }, [content, headers, rows, onChange]);

  const removeColumn = useCallback(
    (colIndex: number) => {
      if (headers.length <= 1) return;
      onChange({
        headers: headers.filter((_, i) => i !== colIndex),
        rows: rows.map((r) => r.filter((_, i) => i !== colIndex)),
      });
    },
    [content, headers, rows, onChange],
  );

  const addRow = useCallback(() => {
    onChange({
      ...content,
      rows: [...rows, Array(headers.length).fill('')],
    });
  }, [content, headers, rows, onChange]);

  const removeRow = useCallback(
    (rowIndex: number) => {
      onChange({ ...content, rows: rows.filter((_, i) => i !== rowIndex) });
    },
    [content, rows, onChange],
  );

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          {/* Header row */}
          <thead>
            <tr className="border-b border-border bg-muted">
              {headers.map((header, ci) => (
                <th
                  key={`h-${ci}`}
                  className="group/col relative p-0 font-semibold text-foreground"
                >
                  <div className="flex items-center">
                    <input
                      className="w-full bg-transparent px-4 py-3 font-semibold text-foreground placeholder-muted-foreground outline-none"
                      value={header}
                      placeholder={`Column ${ci + 1}`}
                      onChange={(e) => updateHeader(ci, e.target.value)}
                      aria-label={`Header ${ci + 1}`}
                    />
                    {headers.length > 1 && (
                      <button
                        type="button"
                        className="mr-1 flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-red-100 hover:text-red-600 group-hover/col:opacity-100 dark:hover:bg-red-950 dark:hover:text-red-400"
                        onClick={() => removeColumn(ci)}
                        aria-label={`Remove column ${ci + 1}`}
                        title="Remove column"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                </th>
              ))}
              {/* Add column */}
              <th className="w-10 p-0">
                <button
                  type="button"
                  className="flex h-full w-10 items-center justify-center py-3 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  onClick={addColumn}
                  aria-label="Add column"
                  title="Add column"
                >
                  <Plus size={14} />
                </button>
              </th>
            </tr>
          </thead>

          {/* Body rows */}
          <tbody>
            {rows.map((row, ri) => (
              <tr
                key={`r-${ri}`}
                className="group/row border-b border-border last:border-0 transition-colors hover:bg-muted/40"
              >
                {headers.map((_, ci) => (
                  <td key={`c-${ri}-${ci}`} className="p-0">
                    <input
                      className="w-full bg-transparent px-4 py-2.5 text-foreground placeholder-muted-foreground outline-none"
                      value={row[ci] ?? ''}
                      placeholder="—"
                      onChange={(e) => updateCell(ri, ci, e.target.value)}
                      aria-label={`Row ${ri + 1}, Column ${ci + 1}`}
                    />
                  </td>
                ))}
                {/* Row delete */}
                <td className="w-10 p-0">
                  <button
                    type="button"
                    className="flex h-full w-10 items-center justify-center py-2 text-muted-foreground opacity-0 transition-opacity hover:text-red-500 group-hover/row:opacity-100"
                    onClick={() => removeRow(ri)}
                    aria-label={`Remove row ${ri + 1}`}
                    title="Remove row"
                  >
                    <Trash2 size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add row */}
      <button
        type="button"
        className="flex w-full items-center justify-center gap-1.5 border-t border-border py-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        onClick={addRow}
      >
        <Plus size={12} />
        Add row
      </button>
    </div>
  );
}
