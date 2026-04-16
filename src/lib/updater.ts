import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

export interface UpdateResult {
  available: boolean;
  version?: string;
  body?: string;
}

export async function checkForUpdates(): Promise<UpdateResult> {
  try {
    const update = await check();
    if (update) {
      return { available: true, version: update.version, body: update.body ?? undefined };
    }
    return { available: false };
  } catch (err) {
    console.warn('Update check failed:', err);
    return { available: false };
  }
}

export async function installUpdate(
  onProgress?: (percent: number) => void,
): Promise<void> {
  const update = await check();
  if (!update) return;

  let downloaded = 0;
  let contentLength = 0;

  await update.downloadAndInstall((event) => {
    switch (event.event) {
      case 'Started':
        contentLength = event.data.contentLength ?? 0;
        break;
      case 'Progress':
        downloaded += event.data.chunkLength;
        if (contentLength > 0 && onProgress) {
          onProgress(Math.round((downloaded / contentLength) * 100));
        }
        break;
      case 'Finished':
        break;
    }
  });

  await relaunch();
}
