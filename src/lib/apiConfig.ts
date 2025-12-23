/**
 * API Configuration with Smart Environment Detection
 * 
 * This module automatically detects whether the app is running:
 * - Locally (localhost) → Uses localhost:3001
 * - Publicly (Cloudflare Tunnel) → Uses injected backend URL
 * 
 * No manual configuration required.
 */

// Extend Window interface for TypeScript
declare global {
    interface Window {
        __API_CONFIG__?: {
            backendUrl?: string;
            frontendUrl?: string;
            timestamp?: number;
        };
    }
}

/**
 * Check if we're running on localhost
 */
const isLocalhost = (): boolean => {
    const hostname = window.location.hostname;
    return (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '::1' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.endsWith('.local')
    );
};

/**
 * Check if we're running on Cloudflare Tunnel
 */
const isCloudflare = (): boolean => {
    return window.location.hostname.endsWith('.trycloudflare.com');
};

/**
 * Get the API base URL based on environment
 * 
 * Priority:
 * 1. Injected config (from api-config.js, set by start.ps1)
 * 2. Environment variable (VITE_API_URL)
 * 3. Same-origin (for production proxy setups)
 * 4. Localhost fallback
 */
export const getApiBaseUrl = (): string => {
    // 1. Check for runtime-injected config (highest priority for tunnel)
    if (window.__API_CONFIG__?.backendUrl) {
        console.log('[API Config] Using injected backend URL:', window.__API_CONFIG__.backendUrl);
        return window.__API_CONFIG__.backendUrl;
    }

    // 2. Check Vite environment variable
    const envUrl = import.meta.env.VITE_API_URL;
    if (envUrl) {
        console.log('[API Config] Using VITE_API_URL:', envUrl);
        return envUrl;
    }

    // 3. If on localhost, use localhost backend
    if (isLocalhost()) {
        console.log('[API Config] Local environment detected, using localhost:3001');
        return 'http://localhost:3001';
    }

    // 4. If on Cloudflare but no injected config, try same-origin
    // This won't work for API calls but will fail gracefully
    if (isCloudflare()) {
        console.warn('[API Config] Cloudflare detected but no backend URL injected!');
        console.warn('[API Config] Make sure to run the app using start.ps1 or npm run start:all');
        // Return empty to trigger "Backend Not Connected" UI
        return '';
    }

    // 5. Default fallback
    console.log('[API Config] Using default localhost:3001');
    return 'http://localhost:3001';
};

/**
 * Get full URL for a static file/asset from the API server
 */
export const getApiFileUrl = (path: string): string => {
    if (path.startsWith('http')) return path;
    const baseUrl = getApiBaseUrl();
    if (!baseUrl) return path;
    return `${baseUrl}${path}`;
};

/**
 * Check if the backend is properly configured
 * Returns false if we're on Cloudflare but don't have a backend URL
 */
export const isBackendConfigured = (): boolean => {
    if (isCloudflare() && !window.__API_CONFIG__?.backendUrl) {
        return false;
    }
    return true;
};

/**
 * Get diagnostic info about the current configuration
 * Useful for debugging
 */
export const getConfigDiagnostics = () => {
    return {
        hostname: window.location.hostname,
        isLocalhost: isLocalhost(),
        isCloudflare: isCloudflare(),
        injectedConfig: window.__API_CONFIG__,
        envUrl: import.meta.env.VITE_API_URL,
        resolvedApiUrl: getApiBaseUrl(),
        isConfigured: isBackendConfigured(),
    };
};

// Export a singleton API_BASE for backwards compatibility
export const API_BASE = getApiBaseUrl();
