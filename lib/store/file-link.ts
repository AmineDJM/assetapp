/**
 * Rattachement à un fichier de l'ordinateur.
 *
 * Par défaut les données vivent dans le `localStorage` du navigateur : rapide,
 * mais invisible et effacé avec les données du site. Rattaché à un fichier,
 * le document est écrit sur le disque à chaque modification — on peut le
 * sauvegarder, le déposer dans un dossier synchronisé, ou l'ouvrir depuis un
 * autre navigateur du même ordinateur.
 *
 * Repose sur la File System Access API : disponible sur les navigateurs
 * Chromium de bureau. Ailleurs, l'export et l'import manuels restent la voie.
 */

const DB_NAME = 'patrimoine-file-link'
const STORE_NAME = 'handles'
const HANDLE_KEY = 'data-file'

export const SUGGESTED_FILENAME = 'patrimoine.json'

export function isFileLinkSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function'
}

// ---------------------------------------------------------------------------
// Mémorisation du descripteur de fichier
//
// Un `FileSystemFileHandle` n'est pas sérialisable en JSON mais l'est en
// « structured clone » : IndexedDB peut le conserver d'une session à l'autre,
// contrairement au localStorage.
// ---------------------------------------------------------------------------

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function withStore<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | null> {
  try {
    const database = await openDatabase()
    return await new Promise<T | null>((resolve) => {
      const transaction = database.transaction(STORE_NAME, mode)
      const request = action(transaction.objectStore(STORE_NAME))
      request.onsuccess = () => resolve(request.result ?? null)
      request.onerror = () => resolve(null)
      transaction.oncomplete = () => database.close()
    })
  } catch {
    return null
  }
}

export async function rememberHandle(handle: FileSystemFileHandle): Promise<void> {
  await withStore('readwrite', (store) => store.put(handle, HANDLE_KEY))
}

export async function recallHandle(): Promise<FileSystemFileHandle | null> {
  return withStore<FileSystemFileHandle>('readonly', (store) => store.get(HANDLE_KEY))
}

export async function forgetHandle(): Promise<void> {
  await withStore('readwrite', (store) => store.delete(HANDLE_KEY))
}

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

/**
 * L'autorisation d'écriture ne survit pas toujours à la fermeture du
 * navigateur. `request: true` la redemande — ce qui exige un geste de
 * l'utilisateur et n'est donc appelé que depuis un clic.
 */
export async function ensureWritePermission(
  handle: FileSystemFileHandle,
  { request = false }: { request?: boolean } = {},
): Promise<PermissionState> {
  const descriptor = { mode: 'readwrite' } as const

  try {
    const current = (await handle.queryPermission?.(descriptor)) ?? 'granted'
    if (current === 'granted' || !request) return current
    return (await handle.requestPermission?.(descriptor)) ?? 'denied'
  } catch {
    return 'denied'
  }
}

// ---------------------------------------------------------------------------
// Sélection, lecture, écriture
// ---------------------------------------------------------------------------

const FILE_TYPES: FilePickerAcceptType[] = [
  { description: 'Sauvegarde Patrimoine', accept: { 'application/json': ['.json'] } },
]

/** `null` si l'utilisateur annule la boîte de dialogue. */
export async function chooseNewFile(): Promise<FileSystemFileHandle | null> {
  try {
    return (
      (await window.showSaveFilePicker?.({
        suggestedName: SUGGESTED_FILENAME,
        types: FILE_TYPES,
        id: 'patrimoine-data',
      })) ?? null
    )
  } catch {
    return null
  }
}

export async function chooseExistingFile(): Promise<FileSystemFileHandle | null> {
  try {
    const handles = await window.showOpenFilePicker?.({
      types: FILE_TYPES,
      multiple: false,
      id: 'patrimoine-data',
    })
    return handles?.[0] ?? null
  } catch {
    return null
  }
}

export async function readFileContent(handle: FileSystemFileHandle): Promise<string | null> {
  try {
    return await (await handle.getFile()).text()
  } catch {
    return null
  }
}

export async function writeFileContent(
  handle: FileSystemFileHandle,
  content: string,
): Promise<boolean> {
  try {
    const writable = await handle.createWritable()
    await writable.write(content)
    await writable.close()
    return true
  } catch {
    return false
  }
}
