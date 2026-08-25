"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Search, X } from "lucide-react";

export type PickerNode = {
  id: string;
  slug: string;
  nameRu: string;
  subtreeCount?: number;
  children: PickerNode[];
};

type FlatRow = {
  id: string;
  nameRu: string;
  path: string;
  depth: number;
  count: number;
};

function flatten(
  nodes: PickerNode[],
  prefix: string[] = [],
  depth = 0
): FlatRow[] {
  const out: FlatRow[] = [];
  for (const n of nodes) {
    const path = [...prefix, n.nameRu];
    out.push({
      id: n.id,
      nameRu: n.nameRu,
      path: path.join(" / "),
      depth,
      count: n.subtreeCount || 0,
    });
    out.push(...flatten(n.children || [], path, depth + 1));
  }
  return out;
}

export function CategoryPicker({
  tree,
  value,
  onChange,
  allowEmpty = false,
  emptyLabel = "Все категории",
  label,
}: {
  tree: PickerNode[];
  value: string;
  onChange: (id: string) => void;
  allowEmpty?: boolean;
  emptyLabel?: string;
  label?: string;
}) {
  const [q, setQ] = useState("");
  const [openRoots, setOpenRoots] = useState<Set<string>>(
    () => new Set(tree.slice(0, 3).map((n) => n.id))
  );
  const flat = useMemo(() => flatten(tree), [tree]);
  const selected = flat.find((r) => r.id === value);
  const query = q.trim().toLowerCase();
  const hits = query
    ? flat
        .filter(
          (r) =>
            r.path.toLowerCase().includes(query) ||
            r.nameRu.toLowerCase().includes(query)
        )
        .slice(0, 40)
    : [];

  function toggleRoot(id: string) {
    setOpenRoots((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div>
      {label ? (
        <label className="mb-1 block text-xs font-bold uppercase text-slate-400">
          {label}
        </label>
      ) : null}
      {selected ? (
        <div className="mb-2 flex items-start justify-between gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2">
          <p className="min-w-0 text-sm font-semibold text-green-900">
            {selected.path}
            <span className="ml-2 text-xs font-normal text-green-700/70">
              {selected.count} поз.
            </span>
          </p>
          {allowEmpty ? (
            <button
              type="button"
              onClick={() => onChange("")}
              className="shrink-0 rounded p-0.5 text-green-800 hover:bg-white"
              aria-label="Сбросить"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      ) : allowEmpty ? (
        <p className="mb-2 text-xs font-semibold text-slate-500">{emptyLabel}</p>
      ) : (
        <p className="mb-2 text-xs text-amber-700">Выберите раздел каталога</p>
      )}

      <div className="relative mb-2">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Найти: реагенты, ПЦР, ИФА, лаборатория…"
          className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/15"
        />
      </div>

      <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white">
        {query ? (
          hits.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-slate-400">
              Ничего не найдено
            </p>
          ) : (
            <ul className="divide-y divide-slate-50">
              {hits.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(r.id);
                      setQ("");
                    }}
                    className={`block w-full px-3 py-2 text-left text-sm hover:bg-green-50 ${
                      r.id === value
                        ? "bg-green-50 font-bold text-green-800"
                        : "text-slate-700"
                    }`}
                  >
                    <span className="block truncate">{r.path}</span>
                    <span className="text-[11px] text-slate-400">
                      {r.count} поз.
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )
        ) : (
          <div className="p-1.5">
            {allowEmpty ? (
              <button
                type="button"
                onClick={() => onChange("")}
                className={`mb-1 block w-full rounded-lg px-2 py-1.5 text-left text-xs font-semibold ${
                  !value
                    ? "bg-green-50 text-green-800"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {emptyLabel}
              </button>
            ) : null}
            {tree.map((root) => (
              <TreeBranch
                key={root.id}
                node={root}
                depth={0}
                selected={value}
                openRoots={openRoots}
                toggleRoot={toggleRoot}
                onSelect={(id) => {
                  onChange(id);
                  setQ("");
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TreeBranch({
  node,
  depth,
  selected,
  openRoots,
  toggleRoot,
  onSelect,
}: {
  node: PickerNode;
  depth: number;
  selected: string;
  openRoots: Set<string>;
  toggleRoot: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  const hasKids = (node.children || []).length > 0;
  const expanded = depth === 0 ? openRoots.has(node.id) : true;
  const active = selected === node.id;
  const kidsVisible = hasKids && (depth > 0 || expanded);

  return (
    <div>
      <div
        className="flex items-center"
        style={{ paddingLeft: Math.min(depth, 8) * 10 }}
      >
        {depth === 0 && hasKids ? (
          <button
            type="button"
            onClick={() => toggleRoot(node.id)}
            className="rounded p-1 text-slate-400 hover:bg-slate-100"
            aria-label={expanded ? "Свернуть" : "Развернуть"}
          >
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <span className="w-6" />
        )}
        <button
          type="button"
          onClick={() => onSelect(node.id)}
          className={`min-w-0 flex-1 truncate rounded-lg px-2 py-1 text-left text-xs ${
            active
              ? "bg-green-50 font-bold text-green-800"
              : "text-slate-700 hover:bg-slate-50"
          }`}
        >
          {node.nameRu}
          <span className="ml-1 text-[10px] font-normal text-slate-400">
            {node.subtreeCount || 0}
          </span>
        </button>
      </div>
      {kidsVisible
        ? node.children.map((ch) => (
            <TreeBranch
              key={ch.id}
              node={ch}
              depth={depth + 1}
              selected={selected}
              openRoots={openRoots}
              toggleRoot={toggleRoot}
              onSelect={onSelect}
            />
          ))
        : null}
    </div>
  );
}
