import { useSyncExternalStore } from 'react';

export type PerformanceMode = 'full' | 'balanced' | 'reduced';

type NavigatorWithSignals = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
};

const MODE_EVENT = 'nutriwork-performance-mode-change';
const MODE_ORDER: Record<PerformanceMode, number> = { full: 0, balanced: 1, reduced: 2 };

function forcedMode(): PerformanceMode | null {
  const value = new URLSearchParams(window.location.search).get('performanceMode');
  return value === 'full' || value === 'balanced' || value === 'reduced' ? value : null;
}

function hardwareMode(): PerformanceMode {
  const device = navigator as NavigatorWithSignals;
  const cores = device.hardwareConcurrency;
  const memory = device.deviceMemory;
  const saveData = device.connection?.saveData === true;

  if (cores !== undefined && memory !== undefined && cores <= 2 && memory <= 1) return 'reduced';
  if (cores !== undefined && cores <= 2 && ((memory !== undefined && memory <= 2) || saveData)) return 'balanced';
  return 'full';
}

export function getPerformanceMode(): PerformanceMode {
  if (typeof window === 'undefined') return 'full';
  return forcedMode() ?? (document.documentElement.dataset.performanceMode as PerformanceMode | undefined) ?? hardwareMode();
}

function setPerformanceMode(mode: PerformanceMode) {
  const current = getPerformanceMode();
  if (MODE_ORDER[mode] <= MODE_ORDER[current]) return;
  document.documentElement.dataset.performanceMode = mode;
  window.dispatchEvent(new CustomEvent<PerformanceMode>(MODE_EVENT, { detail: mode }));
}

function subscribe(callback: () => void) {
  window.addEventListener(MODE_EVENT, callback);
  return () => window.removeEventListener(MODE_EVENT, callback);
}

export function usePerformanceMode() {
  return useSyncExternalStore(subscribe, getPerformanceMode, () => 'full' as PerformanceMode);
}

function startRuntimeMeasurement() {
  if (forcedMode() || getPerformanceMode() === 'reduced' || document.visibilityState !== 'visible') return;

  const longTasks: number[] = [];
  let observer: PerformanceObserver | undefined;
  if ('PerformanceObserver' in window) {
    try {
      observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.duration >= 80) longTasks.push(entry.duration);
        });
      });
      observer.observe({ type: 'longtask', buffered: false });
    } catch {
      observer = undefined;
    }
  }

  const windows: number[] = [];
  let frameCount = 0;
  let windowStarted = performance.now();
  let raf = 0;

  const finish = () => {
    cancelAnimationFrame(raf);
    observer?.disconnect();
    if (document.visibilityState !== 'visible' || windows.length < 4) return;

    const poorWindows = windows.filter((fps) => fps < 32).length;
    const severeWindows = windows.filter((fps) => fps < 20).length;
    const totalLongTaskTime = longTasks.reduce((sum, duration) => sum + duration, 0);

    if ((severeWindows >= 4 && longTasks.length >= 6) || (longTasks.length >= 12 && totalLongTaskTime >= 2500)) {
      setPerformanceMode('reduced');
    } else if ((poorWindows >= 3 && longTasks.length >= 4) || (longTasks.length >= 8 && totalLongTaskTime >= 1200)) {
      setPerformanceMode('balanced');
    }
  };

  const sample = (time: number) => {
    if (document.visibilityState !== 'visible') {
      finish();
      return;
    }
    frameCount += 1;
    const elapsed = time - windowStarted;
    if (elapsed >= 2000) {
      windows.push((frameCount * 1000) / elapsed);
      frameCount = 0;
      windowStarted = time;
      if (windows.length >= 5) {
        finish();
        return;
      }
    }
    raf = requestAnimationFrame(sample);
  };

  raf = requestAnimationFrame(sample);
}

export function initializePerformanceMode() {
  document.documentElement.dataset.performanceMode = forcedMode() ?? hardwareMode();
  const begin = () => window.setTimeout(startRuntimeMeasurement, 5000);
  if (document.readyState === 'complete') begin();
  else window.addEventListener('load', begin, { once: true });
}
