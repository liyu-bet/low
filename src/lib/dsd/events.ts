import {
  EVENT_TYPE_DOMAIN_EXPIRATION_CHANGED,
  EVENT_TYPE_DSD_IP_CHANGED,
  EVENT_TYPE_DSD_SERVER_CHANGED,
  EVENT_TYPE_DSD_SITE_DISCOVERED,
  EVENT_TYPE_SITE_DOWN,
  EVENT_TYPE_SITE_HEALTHY,
  EVENT_TYPE_SITE_RECOVERED,
} from '@/lib/constants';
import type { DsdExternalSnapshot, DsdSite } from '@/lib/dsd/schemas';
import { formatDateOnlyRu, parseDateOnly } from '@/lib/dates/date-only';

export type PlannedDsdEvent = {
  eventType: string;
  title: string;
  description?: string;
  dedupeKey: string;
  occurredAt: Date;
  metadata?: Record<string, unknown>;
};

function isOnlineStatus(status: string): boolean {
  const normalized = status.trim().toLowerCase();
  return normalized === 'online' || normalized === 'up' || normalized === 'ok';
}

function isOfflineStatus(status: string): boolean {
  const normalized = status.trim().toLowerCase();
  return (
    normalized === 'offline' ||
    normalized === 'down' ||
    normalized === 'error' ||
    normalized === 'unreachable'
  );
}

export function planDsdSiteEvents(options: {
  site: DsdSite;
  previousSnapshot: DsdExternalSnapshot | null;
  isFirstLink: boolean;
  willSetFirstHealthy: boolean;
}): PlannedDsdEvent[] {
  const { site, previousSnapshot, isFirstLink, willSetFirstHealthy } = options;
  const events: PlannedDsdEvent[] = [];
  const updatedAt = new Date(site.updatedAt);

  if (isFirstLink) {
    events.push({
      eventType: EVENT_TYPE_DSD_SITE_DISCOVERED,
      title: 'Сайт обнаружен в DSD',
      description: `Импортирован из DSD: ${site.url}`,
      dedupeKey: `dsd:site:${site.id}:discovered`,
      occurredAt: new Date(site.createdAt),
      metadata: { dsdSiteId: site.id, url: site.url, status: site.status },
    });
  }

  if (willSetFirstHealthy && site.firstHealthyAt) {
    events.push({
      eventType: EVENT_TYPE_SITE_HEALTHY,
      title: 'Первый успешный ответ',
      description: 'Дата первого healthy перенесена из DSD',
      dedupeKey: `dsd:site:${site.id}:first_healthy`,
      occurredAt: new Date(site.firstHealthyAt),
      metadata: { dsdSiteId: site.id, firstHealthyAt: site.firstHealthyAt },
    });
  }

  if (!isFirstLink && previousSnapshot) {
    const wasOnline = isOnlineStatus(previousSnapshot.status);
    const wasOffline = isOfflineStatus(previousSnapshot.status);
    const nowOnline = isOnlineStatus(site.status);
    const nowOffline = isOfflineStatus(site.status);

    if (wasOnline && nowOffline) {
      events.push({
        eventType: EVENT_TYPE_SITE_DOWN,
        title: 'Сайт недоступен',
        description: `Статус DSD: ${previousSnapshot.status} → ${site.status}`,
        dedupeKey: `dsd:site:${site.id}:down:${site.updatedAt}`,
        occurredAt: updatedAt,
        metadata: {
          from: previousSnapshot.status,
          to: site.status,
        },
      });
    }

    if (wasOffline && nowOnline) {
      events.push({
        eventType: EVENT_TYPE_SITE_RECOVERED,
        title: 'Сайт восстановлен',
        description: `Статус DSD: ${previousSnapshot.status} → ${site.status}`,
        dedupeKey: `dsd:site:${site.id}:recovered:${site.updatedAt}`,
        occurredAt: updatedAt,
        metadata: {
          from: previousSnapshot.status,
          to: site.status,
        },
      });
    }

    const prevServerId = previousSnapshot.server?.id ?? null;
    const nextServerId = site.server?.id ?? null;
    if (prevServerId !== nextServerId) {
      events.push({
        eventType: EVENT_TYPE_DSD_SERVER_CHANGED,
        title: 'Изменён сервер в DSD',
        description: `${prevServerId ?? '—'} → ${nextServerId ?? '—'}`,
        dedupeKey: `dsd:site:${site.id}:server:${nextServerId ?? 'none'}`,
        occurredAt: updatedAt,
        metadata: { from: prevServerId, to: nextServerId },
      });
    }

    const prevIp = previousSnapshot.server?.ip ?? previousSnapshot.apexARecord ?? null;
    const nextIp = site.server?.ip ?? site.apexARecord ?? null;
    if ((prevIp || nextIp) && prevIp !== nextIp) {
      events.push({
        eventType: EVENT_TYPE_DSD_IP_CHANGED,
        title: 'Изменён IP',
        description: `${prevIp ?? '—'} → ${nextIp ?? '—'}`,
        dedupeKey: `dsd:site:${site.id}:ip:${nextIp ?? 'none'}`,
        occurredAt: updatedAt,
        metadata: { from: prevIp, to: nextIp },
      });
    }

    if (previousSnapshot.domainExpiresAt !== site.domainExpiresAt) {
      let description = `${previousSnapshot.domainExpiresAt ?? '—'} → ${site.domainExpiresAt ?? '—'}`;
      try {
        if (previousSnapshot.domainExpiresAt && site.domainExpiresAt) {
          description = `${formatDateOnlyRu(parseDateOnly(previousSnapshot.domainExpiresAt.slice(0, 10)))} → ${formatDateOnlyRu(parseDateOnly(site.domainExpiresAt.slice(0, 10)))}`;
        }
      } catch {
        // keep raw ISO description
      }
      events.push({
        eventType: EVENT_TYPE_DOMAIN_EXPIRATION_CHANGED,
        title: 'Изменён срок домена',
        description,
        dedupeKey: `dsd:site:${site.id}:domain_expires:${site.domainExpiresAt ?? 'none'}`,
        occurredAt: updatedAt,
        metadata: {
          from: previousSnapshot.domainExpiresAt,
          to: site.domainExpiresAt,
        },
      });
    }
  }

  return events;
}
