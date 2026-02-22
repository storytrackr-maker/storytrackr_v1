const FALLBACK_ICON = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='22' fill='%230a0a0f'/><text y='.9em' x='.5em' font-size='72' font-family='serif'>⭐</text></svg>";

export function buildManifest(settings) {
  const name = settings?.ministryName || 'Anthem Students';
  const year = new Date().getFullYear();

  const icons = [];
  if (settings?.logoEnabled && settings?.logoUrl) {
    icons.push({ src: settings.logoUrl, sizes: '192x192', type: 'image/png' });
    icons.push({ src: settings.logoUrl, sizes: '512x512', type: 'image/png' });
  }
  icons.push({ src: FALLBACK_ICON, sizes: '192x192', type: 'image/svg+xml' });

  return JSON.stringify({
    name: `ASM ${year} · ${name}`,
    short_name: name.length > 12 ? 'ASM Roster' : name,
    description: `Worship Grow Go · ${name} Mentorship Roster`,
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0f',
    theme_color: '#0a0a0f',
    icons,
  });
}
