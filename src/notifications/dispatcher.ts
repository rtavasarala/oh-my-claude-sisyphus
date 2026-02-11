/**
 * Notification Dispatcher
 *
 * Sends notifications to configured platforms (Discord, Telegram, Slack, webhook).
 * All sends are non-blocking with timeouts. Failures are swallowed to avoid
 * blocking hooks.
 */

import { request as httpsRequest } from 'https';
import type {
  DiscordNotificationConfig,
  DiscordBotNotificationConfig,
  TelegramNotificationConfig,
  SlackNotificationConfig,
  WebhookNotificationConfig,
  NotificationPayload,
  NotificationResult,
  NotificationPlatform,
  DispatchResult,
  NotificationConfig,
  NotificationEvent,
} from './types.js';

/** Per-request timeout for individual platform sends */
const SEND_TIMEOUT_MS = 10_000;

/** Overall dispatch timeout for all platforms combined */
const DISPATCH_TIMEOUT_MS = 5_000;

/** Resolve config value or fall back to env var */
function resolveEnvOrConfig(configValue: string | undefined, envVar: string): string | undefined {
  return configValue || process.env[envVar] || undefined;
}

/**
 * Validate Discord webhook URL.
 * Must be HTTPS from discord.com or discordapp.com.
 */
function validateDiscordUrl(webhookUrl: string): boolean {
  try {
    const url = new URL(webhookUrl);
    const allowedHosts = ['discord.com', 'discordapp.com'];
    if (!allowedHosts.some(host => url.hostname === host || url.hostname.endsWith(`.${host}`))) {
      return false;
    }
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validate Telegram bot token format (digits:alphanumeric).
 */
function validateTelegramToken(token: string): boolean {
  return /^[0-9]+:[A-Za-z0-9_-]+$/.test(token);
}

/**
 * Validate Slack webhook URL.
 * Must be HTTPS from hooks.slack.com.
 */
function validateSlackUrl(webhookUrl: string): boolean {
  try {
    const url = new URL(webhookUrl);
    return url.protocol === 'https:' && (
      url.hostname === 'hooks.slack.com' ||
      url.hostname.endsWith('.hooks.slack.com')
    );
  } catch {
    return false;
  }
}

/**
 * Validate generic webhook URL. Must be HTTPS.
 */
function validateWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Send notification via Discord webhook.
 */
export async function sendDiscord(
  config: DiscordNotificationConfig,
  payload: NotificationPayload
): Promise<NotificationResult> {
  if (!config.enabled || !config.webhookUrl) {
    return { platform: 'discord', success: false, error: 'Not configured' };
  }

  if (!validateDiscordUrl(config.webhookUrl)) {
    return { platform: 'discord', success: false, error: 'Invalid webhook URL' };
  }

  try {
    const body: Record<string, unknown> = { content: payload.message };
    if (config.username) {
      body.username = config.username;
    }

    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });

    if (!response.ok) {
      return { platform: 'discord', success: false, error: `HTTP ${response.status}` };
    }

    return { platform: 'discord', success: true };
  } catch (error) {
    return {
      platform: 'discord',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send notification via Discord Bot API (token + channel ID).
 * Falls back to env vars: OMC_DISCORD_NOTIFIER_BOT_TOKEN, OMC_DISCORD_NOTIFIER_CHANNEL
 */
export async function sendDiscordBot(
  config: DiscordBotNotificationConfig,
  payload: NotificationPayload
): Promise<NotificationResult> {
  if (!config.enabled) {
    return { platform: 'discord-bot', success: false, error: 'Not enabled' };
  }

  const botToken = resolveEnvOrConfig(config.botToken, 'OMC_DISCORD_NOTIFIER_BOT_TOKEN');
  const channelId = resolveEnvOrConfig(config.channelId, 'OMC_DISCORD_NOTIFIER_CHANNEL');

  if (!botToken || !channelId) {
    return { platform: 'discord-bot', success: false, error: 'Missing botToken or channelId' };
  }

  try {
    const url = `https://discord.com/api/v10/channels/${channelId}/messages`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bot ${botToken}`,
      },
      body: JSON.stringify({ content: payload.message }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });

    if (!response.ok) {
      return { platform: 'discord-bot', success: false, error: `HTTP ${response.status}` };
    }

    return { platform: 'discord-bot', success: true };
  } catch (error) {
    return {
      platform: 'discord-bot',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send notification via Telegram bot API.
 * Uses native https module with IPv4 to avoid fetch/undici IPv6 connectivity issues.
 */
export async function sendTelegram(
  config: TelegramNotificationConfig,
  payload: NotificationPayload
): Promise<NotificationResult> {
  if (!config.enabled || !config.botToken || !config.chatId) {
    return { platform: 'telegram', success: false, error: 'Not configured' };
  }

  if (!validateTelegramToken(config.botToken)) {
    return { platform: 'telegram', success: false, error: 'Invalid bot token format' };
  }

  try {
    const body = JSON.stringify({
      chat_id: config.chatId,
      text: payload.message,
      parse_mode: config.parseMode || 'Markdown',
    });

    const result = await new Promise<NotificationResult>((resolve) => {
      const req = httpsRequest({
        hostname: 'api.telegram.org',
        path: `/bot${config.botToken}/sendMessage`,
        method: 'POST',
        family: 4, // Force IPv4 - fetch/undici has IPv6 issues on some systems
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: SEND_TIMEOUT_MS,
      }, (res) => {
        // Drain the response
        res.resume();
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ platform: 'telegram', success: true });
        } else {
          resolve({ platform: 'telegram', success: false, error: `HTTP ${res.statusCode}` });
        }
      });

      req.on('error', (e) => {
        resolve({ platform: 'telegram', success: false, error: e.message });
      });
      req.on('timeout', () => {
        req.destroy();
        resolve({ platform: 'telegram', success: false, error: 'Request timeout' });
      });

      req.write(body);
      req.end();
    });

    return result;
  } catch (error) {
    return {
      platform: 'telegram',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send notification via Slack incoming webhook.
 */
export async function sendSlack(
  config: SlackNotificationConfig,
  payload: NotificationPayload
): Promise<NotificationResult> {
  if (!config.enabled || !config.webhookUrl) {
    return { platform: 'slack', success: false, error: 'Not configured' };
  }

  if (!validateSlackUrl(config.webhookUrl)) {
    return { platform: 'slack', success: false, error: 'Invalid webhook URL' };
  }

  try {
    const body: Record<string, unknown> = { text: payload.message };
    if (config.channel) {
      body.channel = config.channel;
    }
    if (config.username) {
      body.username = config.username;
    }

    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });

    if (!response.ok) {
      return { platform: 'slack', success: false, error: `HTTP ${response.status}` };
    }

    return { platform: 'slack', success: true };
  } catch (error) {
    return {
      platform: 'slack',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send notification via generic webhook (POST JSON).
 */
export async function sendWebhook(
  config: WebhookNotificationConfig,
  payload: NotificationPayload
): Promise<NotificationResult> {
  if (!config.enabled || !config.url) {
    return { platform: 'webhook', success: false, error: 'Not configured' };
  }

  if (!validateWebhookUrl(config.url)) {
    return { platform: 'webhook', success: false, error: 'Invalid URL (HTTPS required)' };
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...config.headers,
    };

    const response = await fetch(config.url, {
      method: config.method || 'POST',
      headers,
      body: JSON.stringify({
        event: payload.event,
        session_id: payload.sessionId,
        message: payload.message,
        timestamp: payload.timestamp,
        tmux_session: payload.tmuxSession,
        project_name: payload.projectName,
        project_path: payload.projectPath,
        modes_used: payload.modesUsed,
        duration_ms: payload.durationMs,
        reason: payload.reason,
        active_mode: payload.activeMode,
        question: payload.question,
      }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });

    if (!response.ok) {
      return { platform: 'webhook', success: false, error: `HTTP ${response.status}` };
    }

    return { platform: 'webhook', success: true };
  } catch (error) {
    return {
      platform: 'webhook',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get the effective platform config for an event.
 * Event-level config overrides top-level defaults.
 */
function getEffectivePlatformConfig<T>(
  platform: NotificationPlatform,
  config: NotificationConfig,
  event: NotificationEvent
): T | undefined {
  const eventConfig = config.events?.[event];
  const eventPlatform = eventConfig?.[platform as keyof typeof eventConfig];

  // Event-level override
  if (eventPlatform && typeof eventPlatform === 'object' && 'enabled' in eventPlatform) {
    return eventPlatform as T;
  }

  // Top-level default
  return config[platform as keyof NotificationConfig] as T | undefined;
}

/**
 * Dispatch notifications to all enabled platforms for an event.
 *
 * Runs all sends in parallel with an overall timeout.
 * Individual failures don't block other platforms.
 */
export async function dispatchNotifications(
  config: NotificationConfig,
  event: NotificationEvent,
  payload: NotificationPayload
): Promise<DispatchResult> {
  const promises: Promise<NotificationResult>[] = [];

  // Discord
  const discordConfig = getEffectivePlatformConfig<DiscordNotificationConfig>('discord', config, event);
  if (discordConfig?.enabled) {
    promises.push(sendDiscord(discordConfig, payload));
  }

  // Telegram
  const telegramConfig = getEffectivePlatformConfig<TelegramNotificationConfig>('telegram', config, event);
  if (telegramConfig?.enabled) {
    promises.push(sendTelegram(telegramConfig, payload));
  }

  // Slack
  const slackConfig = getEffectivePlatformConfig<SlackNotificationConfig>('slack', config, event);
  if (slackConfig?.enabled) {
    promises.push(sendSlack(slackConfig, payload));
  }

  // Webhook
  const webhookConfig = getEffectivePlatformConfig<WebhookNotificationConfig>('webhook', config, event);
  if (webhookConfig?.enabled) {
    promises.push(sendWebhook(webhookConfig, payload));
  }

  // Discord Bot
  const discordBotConfig = getEffectivePlatformConfig<DiscordBotNotificationConfig>('discord-bot', config, event);
  if (discordBotConfig?.enabled) {
    promises.push(sendDiscordBot(discordBotConfig, payload));
  }

  if (promises.length === 0) {
    return { event, results: [], anySuccess: false };
  }

  // Race all sends against a timeout
  try {
    const results = await Promise.race([
      Promise.allSettled(promises).then(settled =>
        settled.map(s =>
          s.status === 'fulfilled'
            ? s.value
            : { platform: 'unknown' as NotificationPlatform, success: false, error: String(s.reason) }
        )
      ),
      new Promise<NotificationResult[]>(resolve =>
        setTimeout(() => resolve([{ platform: 'unknown' as NotificationPlatform, success: false, error: 'Dispatch timeout' }]), DISPATCH_TIMEOUT_MS)
      ),
    ]);

    return {
      event,
      results,
      anySuccess: results.some(r => r.success),
    };
  } catch (error) {
    return {
      event,
      results: [{ platform: 'unknown' as NotificationPlatform, success: false, error: String(error) }],
      anySuccess: false,
    };
  }
}
