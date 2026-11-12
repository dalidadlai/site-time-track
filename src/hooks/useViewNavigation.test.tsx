import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useViewNavigation } from './useViewNavigation';

afterEach(() => vi.restoreAllMocks());

describe('screen scroll navigation', () => {
  it('captures the list position before a shorter detail can reset it, and restores on return', () => {
    let scrollY = 0;
    vi.spyOn(window, 'scrollY', 'get').mockImplementation(() => scrollY);
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => { scrollY = 0; });
    const { result } = renderHook(() => useViewNavigation('project', view => view));
    scrollY = 1450;
    act(() => result.current[1]('daywork'));
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 0, left: 0, behavior: 'instant' });
    act(() => result.current[1]('project'));
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 1450, left: 0, behavior: 'instant' });
  });

  it('keeps independent positions for projects and each daywork, without resetting on edits', () => {
    let scrollY = 0;
    vi.spyOn(window, 'scrollY', 'get').mockImplementation(() => scrollY);
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => { scrollY = 0; });
    const { result, rerender } = renderHook(() => useViewNavigation('projects', view => view));
    scrollY = 640;
    act(() => result.current[1]('project:A'));
    scrollY = 1200;
    act(() => result.current[1]('daywork:A:1'));
    scrollY = 480;
    const calls = scrollTo.mock.calls.length;
    rerender();
    expect(scrollTo).toHaveBeenCalledTimes(calls);
    act(() => result.current[1]('project:A'));
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 1200, left: 0, behavior: 'instant' });
    act(() => result.current[1]('projects'));
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 640, left: 0, behavior: 'instant' });
    act(() => result.current[1]('daywork:A:1'));
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 480, left: 0, behavior: 'instant' });
    act(() => result.current[1]('daywork:A:2'));
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 0, left: 0, behavior: 'instant' });
  });
});