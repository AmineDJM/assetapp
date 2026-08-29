'use client'

import { Check, FilePlus2, FolderOpen, HardDrive, Link2Off, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useStore } from '@/lib/store/provider'
import { SUGGESTED_FILENAME } from '@/lib/store/file-link'

/**
 * Rattachement des données à un fichier de l'ordinateur.
 *
 * Sans rattachement, tout vit dans le stockage du navigateur : invisible, et
 * effacé avec les données du site. Rattaché, le document est un fichier que
 * l'on voit, que l'on sauvegarde et que l'on peut placer dans un dossier
 * synchronisé.
 */
export function FileLinkSettings() {
  const { fileLink } = useStore()
  const { status, fileName, error } = fileLink

  async function run(action: () => Promise<void>, message?: string) {
    await action()
    if (message) toast.success(message)
  }

  return (
    <div className="space-y-4">
      {status === 'checking' ? (
        <p className="text-[13px] text-muted">Vérification…</p>
      ) : null}

      {status === 'unsupported' ? (
        <div className="space-y-1.5 text-[13px] leading-relaxed">
          <p className="text-ink">
            Ce navigateur ne peut pas écrire directement dans un fichier.
          </p>
          <p className="text-muted">
            Disponible sur Chrome, Edge et Opera de bureau. Ailleurs, utilise l’export et
            l’import de sauvegarde ci-dessous — le résultat est le même, en manuel.
          </p>
        </div>
      ) : null}

      {status === 'none' ? (
        <div className="space-y-3">
          <p className="text-[13px] leading-relaxed text-muted">
            Choisis un fichier sur cet ordinateur : Patrimoine y écrira tes données à chaque
            modification. Place-le dans un dossier synchronisé (iCloud, Drive, Dropbox) et tu
            le retrouveras d’un appareil à l’autre.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => run(fileLink.createFile, 'Données rattachées au fichier')}
            >
              <FilePlus2 />
              Créer {SUGGESTED_FILENAME}
            </Button>
            <Button size="sm" onClick={() => run(fileLink.openFile, 'Fichier ouvert')}>
              <FolderOpen />
              Ouvrir un fichier existant
            </Button>
          </div>
        </div>
      ) : null}

      {status === 'needs-permission' ? (
        <div className="space-y-3">
          <div className="space-y-1 text-[13px] leading-relaxed">
            <p className="font-medium text-ink">Autorisation à redonner</p>
            <p className="text-muted">
              Le navigateur oublie l’accès aux fichiers entre deux sessions. Un clic suffit
              pour reprendre l’écriture dans {fileName ?? 'ton fichier'}.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => run(fileLink.reconnect, 'Fichier reconnecté')}
          >
            <RefreshCw />
            Reconnecter
          </Button>
        </div>
      ) : null}

      {status === 'connected' ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-1.5 text-[13px] text-ink">
              <Check className="size-4 shrink-0 text-success" aria-hidden />
              <span>
                <span className="font-medium">Rattaché</span>
                <span className="ml-1.5 inline-flex items-center gap-1 text-muted">
                  <HardDrive className="size-3.5" aria-hidden />
                  <span className="font-mono text-xs">{fileName}</span>
                </span>
              </span>
            </p>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => run(fileLink.disconnect, 'Fichier détaché')}
            >
              <Link2Off />
              Détacher
            </Button>
          </div>
          <p className="text-xs leading-relaxed text-muted">
            Chaque modification est écrite dans ce fichier. À l’ouverture de l’application et
            au retour sur cet onglet, c’est le fichier qui fait foi — de quoi retrouver ses
            données après une synchronisation.
          </p>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}
