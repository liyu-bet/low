export const EVENT_TYPE_SITE_CREATED = 'SITE_CREATED';

export const EVENT_TYPE_DATE_OVERRIDE_SET = 'DATE_OVERRIDE_SET';
export const EVENT_TYPE_DATE_OVERRIDE_UPDATED = 'DATE_OVERRIDE_UPDATED';
export const EVENT_TYPE_DATE_OVERRIDE_CLEARED = 'DATE_OVERRIDE_CLEARED';

export const EVENT_TYPE_DSD_SITE_DISCOVERED = 'DSD_SITE_DISCOVERED';
export const EVENT_TYPE_SITE_HEALTHY = 'SITE_HEALTHY';
export const EVENT_TYPE_SITE_DOWN = 'SITE_DOWN';
export const EVENT_TYPE_SITE_RECOVERED = 'SITE_RECOVERED';
export const EVENT_TYPE_DSD_SERVER_CHANGED = 'DSD_SERVER_CHANGED';
export const EVENT_TYPE_DSD_IP_CHANGED = 'DSD_IP_CHANGED';
export const EVENT_TYPE_DOMAIN_EXPIRATION_CHANGED = 'DOMAIN_EXPIRATION_CHANGED';

export const EVENT_TYPE_GSC_PROPERTY_FIRST_SEEN = 'GSC_PROPERTY_FIRST_SEEN';
export const EVENT_TYPE_GSC_FIRST_IMPRESSION = 'GSC_FIRST_IMPRESSION';
export const EVENT_TYPE_GSC_FIRST_CLICK = 'GSC_FIRST_CLICK';
export const EVENT_TYPE_GSC_FIRST_IMPRESSION_REFINED = 'GSC_FIRST_IMPRESSION_REFINED';
export const EVENT_TYPE_GSC_FIRST_CLICK_REFINED = 'GSC_FIRST_CLICK_REFINED';

export const EVENT_TYPE_TASK_COMPLETED = 'TASK_COMPLETED';

export const EVENT_TYPE_BULK_GROUP_CHANGED = 'BULK_GROUP_CHANGED';
export const EVENT_TYPE_BULK_TAGS_CHANGED = 'BULK_TAGS_CHANGED';
export const EVENT_TYPE_BULK_STATUS_CHANGED = 'BULK_STATUS_CHANGED';
export const EVENT_TYPE_BULK_LIFECYCLE_STAGE_CHANGED = 'BULK_LIFECYCLE_STAGE_CHANGED';
export const EVENT_TYPE_BULK_WORK_RECORDED = 'BULK_WORK_RECORDED';
export const EVENT_TYPE_BULK_SITE_ARCHIVED = 'BULK_SITE_ARCHIVED';

export const EVENT_TYPE_WEBSITE_ARCHIVED = 'WEBSITE_ARCHIVED';
export const EVENT_TYPE_WEBSITE_RESTORED = 'WEBSITE_RESTORED';

export const BULK_WEBSITE_IDS_MAX = 500;

export const APP_NAME = 'LOW';
export const APP_FULL_NAME = 'The Life of Websites';

export const AUTH_COOKIE_NAME = 'low_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;

/** Canonical job types for SyncRun (manual + worker). */
export const DSD_SYNC_JOB_TYPE = 'dsd_sites_sync';
export const GSC_PROPERTIES_SYNC_JOB_TYPE = 'gsc_properties_sync';
export const GSC_LIFECYCLE_SYNC_JOB_TYPE = 'gsc_lifecycle_sync';
export const GSC_PERFORMANCE_SYNC_JOB_TYPE = 'gsc_performance_sync';

/** Legacy jobType values still readable for history. */
export const DSD_SYNC_JOB_TYPE_LEGACY = 'manual_full_sync';
export const GSC_PROPERTIES_SYNC_JOB_TYPE_LEGACY = 'manual_properties_sync';
export const GSC_LIFECYCLE_SYNC_JOB_TYPE_LEGACY = 'manual_lifecycle_sync';

export const SYNC_TRIGGER_MANUAL = 'manual';
export const SYNC_TRIGGER_WORKER = 'worker';

export const JOB_LOCK_DSD = 'job:dsd_sites_sync';
export const JOB_LOCK_GSC_PROPERTIES = 'job:gsc_properties_sync';
export const JOB_LOCK_GSC_LIFECYCLE = 'job:gsc_lifecycle_sync';
export const JOB_LOCK_GSC_PERFORMANCE = 'job:gsc_performance_sync';
