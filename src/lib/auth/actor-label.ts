export function resolveActorLabel(options: {
  user?: { name: string; email: string } | null;
  legacy?: string | null;
}): string {
  if (options.user?.name?.trim()) return options.user.name.trim();
  if (options.user?.email?.trim()) return options.user.email.trim();
  if (options.legacy?.trim()) return options.legacy.trim();
  return 'Неизвестно';
}

/** Display author for history cards. */
export function resolveDisplayActorLabel(options: {
  user?: { name: string; email: string } | null;
  legacy?: string | null;
}): string {
  const label = resolveActorLabel(options);
  return label === 'Неизвестно' ? 'Неизвестный пользователь' : label;
}

/**
 * Initials from an actor label (name or email).
 * "Anna Smith" → AS; "Анна" → А; "anna@example.com" → A; max 2 chars.
 */
export function getInitials(actorLabel: string | null | undefined): string {
  const raw = (actorLabel ?? '').trim();
  if (!raw || raw === 'Неизвестно' || raw === 'Неизвестный пользователь') {
    return '?';
  }

  if (raw.includes('@')) {
    const local = raw.split('@')[0]?.trim() ?? '';
    const ch = local[0];
    return ch ? ch.toUpperCase() : '?';
  }

  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0]![0];
    const b = parts[1]![0];
    if (!a) return '?';
    return `${a}${b ?? ''}`.toUpperCase().slice(0, 2);
  }
  if (parts.length === 1) {
    const ch = parts[0]![0];
    return ch ? ch.toUpperCase() : '?';
  }
  return '?';
}

/** Show website.name only when it differs from domain / normalizedDomain. */
export function shouldShowWebsiteName(website: {
  domain: string;
  normalizedDomain: string;
  name: string | null;
}): boolean {
  const name = website.name?.trim().toLowerCase();
  if (!name) return false;
  if (name === website.domain.trim().toLowerCase()) return false;
  if (name === website.normalizedDomain.trim().toLowerCase()) return false;
  return true;
}
