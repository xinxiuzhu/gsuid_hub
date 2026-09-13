import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  canSelectAllMatching,
  emptyMemeSelection,
  getPageSelectionState,
  isFullLibraryFilter,
  isMemeSelected,
  memeDeleteConfirmation,
  memeSelectionToApi,
  memeSelectionToExport,
  normalizeMemeFilter,
  selectAllMatching,
  selectedMemeCount,
  setPageSelection,
  toggleMemeSelection,
} from './memeSelection';

describe('meme selection', () => {
  it('merges page selection and keeps selections from other pages', () => {
    let selection = toggleMemeSelection(emptyMemeSelection(), 'previous-page');
    selection = setPageSelection(selection, ['a', 'b'], true);
    expect(selection.mode === 'explicit' && Array.from(selection.ids)).toEqual([
      'previous-page',
      'a',
      'b',
    ]);
    selection = setPageSelection(selection, ['a', 'b'], false);
    expect(isMemeSelected(selection, 'previous-page')).toBe(true);
  });

  it('reports unchecked, indeterminate and checked for the current page', () => {
    let selection = emptyMemeSelection();
    expect(getPageSelectionState(selection, ['a', 'b'])).toBe(false);
    selection = toggleMemeSelection(selection, 'a');
    expect(getPageSelectionState(selection, ['a', 'b'])).toBe('indeterminate');
    selection = toggleMemeSelection(selection, 'b');
    expect(getPageSelectionState(selection, ['a', 'b'])).toBe(true);
  });

  it('supports exclusions in all-matching mode', () => {
    let selection = selectAllMatching({ status: 'tagged' }, 'key', 10);
    selection = toggleMemeSelection(selection, 'a');
    expect(selectedMemeCount(selection)).toBe(9);
    expect(isMemeSelected(selection, 'a')).toBe(false);
    expect(memeSelectionToApi(selection)).toEqual({
      mode: 'filter',
      filter: { status: 'tagged' },
      exclude_ids: ['a'],
    });
  });

  it('normalizes filters and rejects semantic select-all', () => {
    expect(normalizeMemeFilter({ status: '', q: '  hello  ', personaHint: '' })).toEqual({ q: 'hello' });
    expect(isFullLibraryFilter({})).toBe(true);
    expect(isFullLibraryFilter({ status: 'tagged' })).toBe(false);
    expect(canSelectAllMatching({ q: 'hello' })).toBe(false);
  });

  it('exports explicit IDs across pages without applying the current folder', () => {
    let selection = toggleMemeSelection(emptyMemeSelection(), 'previous-page');
    selection = setPageSelection(selection, ['a', 'b'], true);
    const request = memeSelectionToExport(selection, 'common');
    expect(request).toEqual({ ids: ['previous-page', 'a', 'b'], folder: undefined });
    request?.ids?.push('export-only');
    expect(isMemeSelected(selection, 'export-only')).toBe(false);
  });

  it('preserves folder or full-library export when nothing is selected', () => {
    expect(memeSelectionToExport(emptyMemeSelection(), 'common')).toEqual({
      ids: undefined,
      folder: 'common',
    });
    expect(memeSelectionToExport(emptyMemeSelection(), '')).toEqual({
      ids: undefined,
      folder: undefined,
    });
  });

  it('rejects all-matching export rather than losing filters or exclusions', () => {
    const selection = selectAllMatching({ status: 'tagged' }, 'key', 10);
    expect(memeSelectionToExport(selection, 'common')).toBeNull();
    expect(memeSelectionToExport(toggleMemeSelection(selection, 'a'), '')).toBeNull();
    expect(memeSelectionToExport(selectAllMatching({}, 'all', 10), '')).toBeNull();
    expect(memeSelectionToExport(selectAllMatching({}, 'empty', 0), '')).toBeNull();
  });

  it('resets either mode to a fresh empty explicit selection without mutating snapshots', () => {
    for (let selection of [
      toggleMemeSelection(emptyMemeSelection(), 'a'),
      toggleMemeSelection(selectAllMatching({ status: 'tagged' }, 'key', 10), 'a'),
    ]) {
      const snapshot = selection;
      const payload = memeSelectionToApi(snapshot);
      selection = emptyMemeSelection();
      expect(selection).toEqual({ mode: 'explicit', ids: new Set() });
      expect(selectedMemeCount(selection)).toBe(0);
      expect(getPageSelectionState(selection, ['a', 'b'])).toBe(false);
      expect(memeSelectionToApi(snapshot)).toEqual(payload);
      expect(selection).not.toBe(emptyMemeSelection());
    }
  });

  it('wires archive export and purge reset to the current selection model', () => {
    const source = readFileSync(new URL('../pages/AIMemePage.tsx', import.meta.url), 'utf8');
    const exportHandler = source.slice(
      source.indexOf('const handleExportDotMeme ='),
      source.indexOf('const handleImportDotMeme ='),
    );
    expect(exportHandler).toContain('memeSelectionToExport(selection, filterFolder)');
    expect(exportHandler).toMatch(/if \(!request\)\s*\{[\s\S]*exportExplicitOnly[\s\S]*return;/);
    expect(exportHandler).toContain('memeApi.exportMemes(request.ids, request.folder)');
    const purgeHandler = source.slice(
      source.indexOf('const handlePurgeAll ='),
      source.indexOf('const handleBatchRetagPending ='),
    );
    expect(purgeHandler).toContain('setSelection(emptyMemeSelection())');
    expect(source).not.toMatch(/\b(?:selectedIds|setSelectedIds)\b/);
  });

  it('uses the exact count-based confirmation phrase', () => {
    expect(memeDeleteConfirmation(137)).toBe('DELETE 137');
  });
});
