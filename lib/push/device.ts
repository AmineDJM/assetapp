/**
 * Nom d'appareil lisible.
 *
 * Volontairement approximatif : il ne sert qu'à distinguer « iPhone » de
 * « Chrome · Windows » dans la liste des appareils. Aucun fingerprinting.
 */
export function describeDevice(userAgent: string): string {
  const ua = userAgent

  const platform = /iPhone/i.test(ua)
    ? 'iPhone'
    : /iPad/i.test(ua)
      ? 'iPad'
      : /Android/i.test(ua)
        ? 'Android'
        : /Mac OS X|Macintosh/i.test(ua)
          ? 'Mac'
          : /Windows/i.test(ua)
            ? 'Windows'
            : /Linux/i.test(ua)
              ? 'Linux'
              : null

  const browser = /Edg\//i.test(ua)
    ? 'Edge'
    : /OPR\/|Opera/i.test(ua)
      ? 'Opera'
      : /Firefox\//i.test(ua)
        ? 'Firefox'
        : /Chrome\//i.test(ua)
          ? 'Chrome'
          : /Safari\//i.test(ua)
            ? 'Safari'
            : null

  // Sur iPhone/iPad le nom de la plateforme suffit et parle davantage.
  if (platform === 'iPhone' || platform === 'iPad') return platform
  if (browser && platform) return `${browser} · ${platform}`
  return browser ?? platform ?? 'Cet appareil'
}
