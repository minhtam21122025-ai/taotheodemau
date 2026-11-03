import { UserAccount, AuthSession } from '../types/auth';

const TOKEN_KEY = 'eduexam_auth_token';
const USER_KEY = 'eduexam_auth_user';

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthSession(session: AuthSession): void {
  try {
    localStorage.setItem(TOKEN_KEY, session.token);
    localStorage.setItem(USER_KEY, JSON.stringify(session.user));
  } catch (e) {
    console.error('Failed to save auth session:', e);
  }
}

export function getStoredUser(): UserAccount | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserAccount;
  } catch {
    return null;
  }
}

export function clearAuthSession(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch (e) {
    console.error('Failed to clear auth session:', e);
  }
}

/**
 * Custom fetch tự động gắn Bearer Token và hỗ trợ tự động thử lại khi gặp lỗi mạng tạm thời
 */
export async function authFetch(
  url: string,
  options: RequestInit = {},
  maxRetries = 2
): Promise<Response> {
  let lastError: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const token = getAuthToken();
      const headers = new Headers(options.headers || {});

      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }

      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Nếu gặp mã lỗi quá tải, hết hạn mức tạm thời hoặc lỗi máy chủ (429, 500, 502, 503, 504), tự động thử lại
      if (
        (response.status === 429 ||
          response.status === 500 ||
          response.status === 502 ||
          response.status === 503 ||
          response.status === 504) &&
        attempt < maxRetries
      ) {
        console.warn(
          `[authFetch] Máy chủ phản hồi mã ${response.status}. Đang thử lại (lần ${attempt + 1}/${maxRetries})...`
        );
        await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
        continue;
      }

      return response;
    } catch (err: any) {
      if (err?.name === 'AbortError' || options.signal?.aborted) {
        throw err;
      }
      lastError = err;
      console.warn(`[authFetch] Lỗi mạng khi gọi ${url} (lần ${attempt + 1}/${maxRetries + 1}):`, err?.message || err);
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      }
    }
  }

  throw lastError;
}
