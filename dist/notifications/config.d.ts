/**
 * Notification Configuration Reader
 *
 * Reads notification config from .omc-config.json and provides
 * backward compatibility with the old stopHookCallbacks format.
 */
import type { NotificationConfig, NotificationEvent, NotificationPlatform } from './types.js';
/**
 * Get the notification configuration.
 *
 * Reads from .omc-config.json, looking for the `notifications` key.
 * Falls back to migrating old `stopHookCallbacks` if present.
 * Returns null if no notification config is found.
 */
export declare function getNotificationConfig(): NotificationConfig | null;
/**
 * Check if a specific event has any enabled platform.
 */
export declare function isEventEnabled(config: NotificationConfig, event: NotificationEvent): boolean;
/**
 * Get list of enabled platforms for an event.
 */
export declare function getEnabledPlatforms(config: NotificationConfig, event: NotificationEvent): NotificationPlatform[];
//# sourceMappingURL=config.d.ts.map