import type { MemeDeleteSelection, MemeMatchFilter } from '@/lib/api';

export type MemeSelectionState =
  | { mode: 'explicit'; ids: Set<string> }
  | {
      mode: 'allMatching';
      filter: MemeMatchFilter;
      filterKey: string;
      total: number;
      excludedIds: Set<string>;
    };

export type PageSelectionState = boolean | 'indeterminate';

export interface MemeFilterInput {
  folder?: string;
  status?: string;
  q?: string;
  personaHint?: string;
}

export function emptyMemeSelection(): MemeSelectionState {
  return { mode: 'explicit', ids: new Set() };
}

export function normalizeMemeFilter(input: MemeFilterInput): MemeMatchFilter {
  const filter: MemeMatchFilter = {};
  const folder = input.folder?.trim();
  const status = input.status?.trim();
  const q = input.q?.trim();
  const personaHint = input.personaHint?.trim();
  if (folder) filter.folder = folder;
  if (status) filter.status = status;
  if (q) filter.q = q;
  if (personaHint) filter.persona_hint = personaHint;
  return filter;
}

export function memeFilterKey(filter: MemeMatchFilter, sort: string): string {
  return JSON.stringify({
    folder: filter.folder ?? '',
    status: filter.status ?? '',
    q: filter.q ?? '',
    persona_hint: filter.persona_hint ?? '',
    sort,
  });
}

export function isFullLibraryFilter(filter: MemeMatchFilter): boolean {
  return !filter.folder && !filter.status && !filter.q && !filter.persona_hint;
}

export function canSelectAllMatching(filter: MemeMatchFilter): boolean {
  return !filter.q;
}

export function selectedMemeCount(selection: MemeSelectionState): number {
  return selection.mode === 'explicit'
    ? selection.ids.size
    : Math.max(0, selection.total - selection.excludedIds.size);
}

export function isMemeSelected(selection: MemeSelectionState, memeId: string): boolean {
  return selection.mode === 'explicit'
    ? selection.ids.has(memeId)
    : !selection.excludedIds.has(memeId);
}

export function toggleMemeSelection(
  selection: MemeSelectionState,
  memeId: string,
): MemeSelectionState {
  if (selection.mode === 'explicit') {
    const ids = new Set(selection.ids);
    if (ids.has(memeId)) ids.delete(memeId);
    else ids.add(memeId);
    return { ...selection, ids };
  }
  const excludedIds = new Set(selection.excludedIds);
  if (excludedIds.has(memeId)) excludedIds.delete(memeId);
  else excludedIds.add(memeId);
  return { ...selection, excludedIds };
}

export function setPageSelection(
  selection: MemeSelectionState,
  pageIds: readonly string[],
  selected: boolean,
): MemeSelectionState {
  if (selection.mode === 'explicit') {
    const ids = new Set(selection.ids);
    for (const id of pageIds) {
      if (selected) ids.add(id);
      else ids.delete(id);
    }
    return { ...selection, ids };
  }
  const excludedIds = new Set(selection.excludedIds);
  for (const id of pageIds) {
    if (selected) excludedIds.delete(id);
    else excludedIds.add(id);
  }
  return { ...selection, excludedIds };
}

export function getPageSelectionState(
  selection: MemeSelectionState,
  pageIds: readonly string[],
): PageSelectionState {
  if (pageIds.length === 0) return false;
  const selected = pageIds.filter((id) => isMemeSelected(selection, id)).length;
  if (selected === 0) return false;
  if (selected === pageIds.length) return true;
  return 'indeterminate';
}

export function selectAllMatching(
  filter: MemeMatchFilter,
  filterKey: string,
  total: number,
): MemeSelectionState {
  return { mode: 'allMatching', filter: { ...filter }, filterKey, total, excludedIds: new Set() };
}

export function memeSelectionToApi(selection: MemeSelectionState): MemeDeleteSelection {
  if (selection.mode === 'explicit') {
    return { mode: 'ids', meme_ids: Array.from(selection.ids) };
  }
  return {
    mode: 'filter',
    filter: { ...selection.filter },
    exclude_ids: Array.from(selection.excludedIds),
  };
}

export function memeDeleteConfirmation(count: number): string {
  return `DELETE ${count}`;
}
