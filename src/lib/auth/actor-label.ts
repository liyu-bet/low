export function resolveActorLabel(options: {
  user?: { name: string; email: string } | null;
  legacy?: string | null;
}): string {
  if (options.user?.name?.trim()) return options.user.name.trim();
  if (options.user?.email?.trim()) return options.user.email.trim();
  if (options.legacy?.trim()) return options.legacy.trim();
  return 'Неизвестно';
}
