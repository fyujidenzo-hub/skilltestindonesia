const sessionMaxAgeSeconds = 60 * 60 * 24 * 7;

export function getCookieSession(key: string) {
  // MOBILE/IN-APP BROWSER SAFETY: cookies can be restricted in some iPhone webviews.
  try {
    const cookie = document.cookie
      .split("; ")
      .find((item) => item.startsWith(`${key}=`));
    return cookie ? decodeURIComponent(cookie.split("=")[1] ?? "") : null;
  } catch (error) {
    console.warn("Unable to read browser session:", error);
    return null;
  }
}

export function setCookieSession(key: string, value: string) {
  try {
    document.cookie = `${key}=${encodeURIComponent(value)}; max-age=${sessionMaxAgeSeconds}; path=/; SameSite=Lax`;
  } catch (error) {
    console.warn("Unable to save browser session:", error);
  }
}

export function clearCookieSession(key: string) {
  try {
    document.cookie = `${key}=; max-age=0; path=/; SameSite=Lax`;
  } catch (error) {
    console.warn("Unable to clear browser session:", error);
  }
}
