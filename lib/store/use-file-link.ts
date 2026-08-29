'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import {
  chooseExistingFile,
  chooseNewFile,
  ensureWritePermission,
  forgetHandle,
  isFileLinkSupported,
  readFileContent,
  recallHandle,
  rememberHandle,
  writeFileContent,
} from './file-link'
import { migrate, type PatrimoineData } from './schema'

/**
 * Cycle de vie du rattachement au fichier.
 *
 * Le fichier fait autorité au démarrage et à chaque retour sur l'onglet : c'est
 * ce qui permet de le déposer dans un dossier synchronisé et de retrouver ses
 * données. En cours de session, chaque modification y est réécrite.
 */

export type FileLinkStatus =
  /** Navigateur sans File System Access API (Firefox, Safari, mobile). */
  | 'unsupported'
  | 'checking'
  | 'none'
  /** Fichier connu, mais l'autorisation d'écriture doit être redonnée. */
  | 'needs-permission'
  | 'connected'

export interface FileLink {
  status: FileLinkStatus
  fileName: string | null
  error: string | null
  createFile: () => Promise<void>
  openFile: () => Promise<void>
  reconnect: () => Promise<void>
  disconnect: () => Promise<void>
}

interface Options {
  /** Document courant, écrit dans le fichier à chaque modification. */
  serialized: string
  /**
   * Adopte le contenu du fichier comme source de vérité.
   * Doit être stable : la fonction sert de dépendance aux effets.
   */
  onAdopt: (data: PatrimoineData) => void
}

/** La prise en charge dépend du navigateur, pas d'un état React. */
const noopSubscribe = () => () => {}

export function useFileLink({ serialized, onAdopt }: Options): FileLink {
  const supported = useSyncExternalStore(
    noopSubscribe,
    isFileLinkSupported,
    () => false,
  )

  const [linkStatus, setStatus] = useState<
    Exclude<FileLinkStatus, 'unsupported'>
  >('checking')
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const status: FileLinkStatus = supported ? linkStatus : 'unsupported'

  const handleRef = useRef<FileSystemFileHandle | null>(null)
  /** Dernier contenu écrit : sert à repérer une modification externe. */
  const lastSyncedRef = useRef<string | null>(null)

  const adopt = useCallback(
    (content: string) => {
      lastSyncedRef.current = content
      try {
        onAdopt(migrate(JSON.parse(content)))
      } catch {
        setError('Le fichier n’est pas une sauvegarde Patrimoine valide.')
      }
    },
    [onAdopt],
  )

  // --- Reprise au démarrage -------------------------------------------------
  useEffect(() => {
    if (!supported) return

    let cancelled = false

    async function restore() {
      const handle = await recallHandle()
      if (cancelled) return

      if (!handle) {
        setStatus('none')
        return
      }

      handleRef.current = handle
      setFileName(handle.name)

      const permission = await ensureWritePermission(handle)
      if (cancelled) return

      if (permission !== 'granted') {
        // Chrome oublie l'autorisation entre deux sessions : il faut un clic.
        setStatus('needs-permission')
        return
      }

      const content = await readFileContent(handle)
      if (cancelled) return

      if (content !== null && content.trim() !== '') adopt(content)
      setStatus('connected')
    }

    void restore()
    return () => {
      cancelled = true
    }
  }, [adopt, supported])

  // --- Écriture à chaque modification --------------------------------------
  useEffect(() => {
    if (status !== 'connected') return
    const handle = handleRef.current
    if (!handle) return
    if (serialized === lastSyncedRef.current) return

    let cancelled = false

    async function persist() {
      const written = await writeFileContent(handle!, serialized)
      if (cancelled) return

      if (written) {
        lastSyncedRef.current = serialized
        setError(null)
      } else {
        setStatus('needs-permission')
        setError('Écriture impossible : l’autorisation a peut-être été révoquée.')
      }
    }

    void persist()
    return () => {
      cancelled = true
    }
  }, [serialized, status])

  // --- Modification externe : le fichier fait autorité ----------------------
  useEffect(() => {
    if (status !== 'connected') return

    async function refresh() {
      const handle = handleRef.current
      if (!handle || document.visibilityState !== 'visible') return

      const content = await readFileContent(handle)
      // Toute écriture locale a déjà été synchronisée : un contenu différent
      // vient forcément de l'extérieur.
      if (content !== null && content !== lastSyncedRef.current) adopt(content)
    }

    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [status, adopt])

  // --- Actions --------------------------------------------------------------
  const attach = useCallback(
    async (handle: FileSystemFileHandle, mode: 'create' | 'open') => {
      const permission = await ensureWritePermission(handle, { request: true })
      if (permission !== 'granted') {
        setError('Autorisation d’écriture refusée.')
        return
      }

      handleRef.current = handle
      setFileName(handle.name)
      await rememberHandle(handle)
      setError(null)

      if (mode === 'open') {
        const content = await readFileContent(handle)
        if (content !== null && content.trim() !== '') {
          adopt(content)
          setStatus('connected')
          return
        }
      }

      // Nouveau fichier, ou fichier vide : on y écrit le document courant.
      lastSyncedRef.current = null
      setStatus('connected')
    },
    [adopt],
  )

  const createFile = useCallback(async () => {
    const handle = await chooseNewFile()
    if (handle) await attach(handle, 'create')
  }, [attach])

  const openFile = useCallback(async () => {
    const handle = await chooseExistingFile()
    if (handle) await attach(handle, 'open')
  }, [attach])

  const reconnect = useCallback(async () => {
    const handle = handleRef.current ?? (await recallHandle())
    if (!handle) {
      setStatus('none')
      return
    }
    await attach(handle, 'open')
  }, [attach])

  const disconnect = useCallback(async () => {
    await forgetHandle()
    handleRef.current = null
    lastSyncedRef.current = null
    setFileName(null)
    setError(null)
    setStatus('none')
  }, [])

  return { status, fileName, error, createFile, openFile, reconnect, disconnect }
}
