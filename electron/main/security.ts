export interface RendererTrustOptions {
  devServerUrl?: string;
  appFileUrl?: string;
}

function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export function isTrustedSenderUrl(
  senderUrl: string,
  options: RendererTrustOptions = {},
): boolean {
  if (!senderUrl) {
    return false;
  }

  const parsedSenderUrl = parseUrl(senderUrl);
  if (!parsedSenderUrl) {
    return false;
  }

  if (options.devServerUrl) {
    const parsedDevServerUrl = parseUrl(options.devServerUrl);
    return (
      parsedDevServerUrl !== null &&
      parsedSenderUrl.origin === parsedDevServerUrl.origin
    );
  }

  if (options.appFileUrl) {
    const parsedAppFileUrl = parseUrl(options.appFileUrl);
    return (
      parsedAppFileUrl !== null &&
      parsedSenderUrl.protocol === "file:" &&
      parsedAppFileUrl.protocol === "file:" &&
      parsedSenderUrl.pathname === parsedAppFileUrl.pathname
    );
  }

  return false;
}

export function isAllowedAppNavigationUrl(
  targetUrl: string,
  options: RendererTrustOptions = {},
): boolean {
  return isTrustedSenderUrl(targetUrl, options);
}
