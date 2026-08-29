'use client'

import { useRef, useState } from 'react'
import { Download, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  buildAssetsCsv,
  buildBackupJson,
  buildHistoryCsv,
  buildObligationsCsv,
  download,
} from '@/lib/export/download'
import { withDemoData } from '@/lib/store/demo'
import { useStore } from '@/lib/store/provider'
import { createEmptyData, migrate } from '@/lib/store/schema'
import { fromUtcDate } from '@/lib/dates'

/**
 * Sauvegarde, restauration et remise à zéro.
 *
 * Sans serveur, l'export JSON est le seul moyen de conserver les données
 * ailleurs que dans ce navigateur et de les transporter vers un autre
 * appareil : il mérite d'être visible.
 */
export function DataManagement() {
  const { data, replaceAll, fileLink } = useStore()
  const fileInput = useRef<HTMLInputElement>(null)
  const [confirmingReset, setConfirmingReset] = useState(false)

  const stamp = fromUtcDate(new Date())

  const exports = [
    { label: 'assets.csv', build: () => buildAssetsCsv(data), name: `assets-${stamp}.csv` },
    { label: 'obligations.csv', build: () => buildObligationsCsv(data), name: `obligations-${stamp}.csv` },
    { label: 'history.csv', build: () => buildHistoryCsv(data), name: `history-${stamp}.csv` },
  ]

  async function handleImport(file: File) {
    try {
      const restored = migrate(JSON.parse(await file.text()))
      replaceAll(restored)
      toast.success('Sauvegarde restaurée', {
        description: `${restored.assets.length} biens, ${restored.obligations.length} obligations.`,
      })
    } catch {
      toast.error('Fichier illisible', {
        description: 'Attendu : une sauvegarde JSON exportée depuis Patrimoine.',
      })
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-[13px] font-medium text-ink">Sauvegarde complète</p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="primary"
            onClick={() =>
              download(`patrimoine-${stamp}.json`, buildBackupJson(data), 'application/json')
            }
          >
            <Download />
            Exporter
          </Button>
          <Button size="sm" onClick={() => fileInput.current?.click()}>
            <Upload />
            Restaurer
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            aria-label="Fichier de sauvegarde à restaurer"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void handleImport(file)
              event.target.value = ''
            }}
          />
        </div>
        <p className="text-xs leading-relaxed text-muted">
          {fileLink.status === 'connected'
            ? `Tes données sont déjà écrites en continu dans ${fileLink.fileName}. Cet export reste utile pour figer une copie datée.`
            : 'Sans fichier rattaché, tes données ne vivent que dans ce navigateur et disparaissent si tu effaces les données du site. Un export régulier est alors la seule sauvegarde.'}
        </p>
      </div>

      <div className="space-y-2 border-t border-line pt-4">
        <p className="text-[13px] font-medium text-ink">Tableurs</p>
        <div className="flex flex-wrap gap-2">
          {exports.map((item) => (
            <Button
              key={item.label}
              size="sm"
              onClick={() => download(item.name, item.build(), 'text/csv')}
            >
              <Download />
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2 border-t border-line pt-4">
        <p className="text-[13px] font-medium text-ink">Données de démonstration</p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => {
              replaceAll(withDemoData(data))
              toast.success('Données de démonstration ajoutées', {
                description: '4 biens et 13 obligations.',
              })
            }}
          >
            Ajouter des exemples
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-danger hover:text-danger"
            onClick={() => setConfirmingReset(true)}
          >
            <Trash2 />
            Tout effacer
          </Button>
        </div>
        <p className="text-xs text-muted">
          Quatre biens et treize obligations, dont une échéance en retard, pour explorer
          l’application.
        </p>
      </div>

      <Dialog open={confirmingReset} onOpenChange={setConfirmingReset}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Tout effacer</DialogTitle>
            <DialogDescription>
              Tous les biens, obligations et l’historique seront supprimés de ce navigateur.
              Cette action est irréversible — exporte une sauvegarde d’abord si tu hésites.
            </DialogDescription>
          </DialogHeader>
          <DialogBody />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmingReset(false)}>
              Annuler
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                replaceAll(createEmptyData())
                setConfirmingReset(false)
                toast.success('Données effacées')
              }}
            >
              Tout effacer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
