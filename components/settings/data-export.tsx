import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Export des données. Des liens simples : le navigateur télécharge le fichier
 * servi par `/api/export`, protégé par la session.
 */
const EXPORTS = [
  { type: 'assets', label: 'assets.csv' },
  { type: 'obligations', label: 'obligations.csv' },
  { type: 'history', label: 'history.csv' },
] as const

export function DataExport() {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {EXPORTS.map((item) => (
          <Button key={item.type} size="sm" asChild>
            <a href={`/api/export?type=${item.type}`} download>
              <Download />
              {item.label}
            </a>
          </Button>
        ))}
      </div>

      <div>
        <Button size="sm" variant="ghost" asChild>
          <a href="/api/export?type=backup" download>
            <Download />
            Sauvegarde complète (JSON)
          </a>
        </Button>
        <p className="mt-1 text-xs text-muted">
          Biens, obligations et historique dans un seul fichier. Ne contient ni mot de passe ni
          clé d’API.
        </p>
      </div>
    </div>
  )
}
