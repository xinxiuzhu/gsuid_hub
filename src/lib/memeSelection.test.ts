import { describe, expect, it } from 'vitest';
import {
  canSelectAllMatching,
  emptyMemeSelection,
  getPageSelectionState,
  isFullLibraryFilter,
  isMemeSelected,
  memeDeleteConfirmation,
  memeSelectionToApi,
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

  it('uses the exact count-based confirmation phrase', () => {
    expect(memeDeleteConfirmation(137)).toBe('DELETE 137');
  });
});
