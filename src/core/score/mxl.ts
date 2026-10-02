import JSZip from 'jszip';
import { ImportError } from './musicxml';

/** Extracts the root MusicXML document from a compressed .mxl archive. */
export async function unzipMxl(data: ArrayBuffer | Uint8Array): Promise<string> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(data);
  } catch {
    throw new ImportError('Not a valid .mxl (zip) file.');
  }
  const container = zip.file('META-INF/container.xml');
  let rootPath: string | null = null;
  if (container) {
    const xml = await container.async('string');
    const m = /full-path="([^"]+)"/.exec(xml);
    if (m) rootPath = m[1];
  }
  if (!rootPath) {
    rootPath = Object.keys(zip.files).find((f) => !f.startsWith('META-INF') && /\.(musicxml|xml)$/i.test(f)) ?? null;
  }
  if (!rootPath || !zip.file(rootPath)) throw new ImportError('No MusicXML document found inside the .mxl file.');
  return zip.file(rootPath)!.async('string');
}
