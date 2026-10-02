import { useApp } from './store';

/** Registers the service worker (offline support) and offers updates via a toast. */
export async function registerPwa(): Promise<void> {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return;
  try {
    const { registerSW } = await import('virtual:pwa-register');
    const update = registerSW({
      onNeedRefresh() {
        useApp.getState().toast('A new version of OpenKeys is available.', 'info', { label: 'Reload', run: () => void update(true) });
      },
      onOfflineReady() {
        useApp.getState().toast('OpenKeys is ready to work offline.', 'good');
      },
    });
  } catch (e) {
    console.warn('PWA registration failed', e);
  }
}
