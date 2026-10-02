import { importScoreFile, ImportError } from '../core/score/import';
import { useApp } from './store';

/** Imports dropped/picked files; the first valid score opens the import summary dialog. */
export async function importFiles(files: FileList | File[]): Promise<void> {
  const list = Array.from(files);
  const { toast, set, settings } = useApp.getState();
  for (const f of list) {
    try {
      const buf = await f.arrayBuffer();
      const score = await importScoreFile(f.name, buf, { splitPoint: settings.splitPoint });
      set({ pendingImport: score });
      return;
    } catch (e) {
      const msg = e instanceof ImportError ? e.message : `Could not read "${f.name}": ${(e as Error).message}`;
      toast(msg, 'bad');
    }
  }
}

export function pickFiles(): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.musicxml,.xml,.mxl,.mid,.midi,.abc,.json,.openkeys.json';
  input.multiple = false;
  input.onchange = () => {
    if (input.files?.length) void importFiles(input.files);
  };
  input.click();
}

export function downloadText(name: string, text: string, type = 'application/json'): void {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
