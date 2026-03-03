import { createClient } from '@supabase/supabase-js';

// Use a proxy path to tunnel traffic through the main domain (bypasses ISP blocks)
// Supabase client requires a valid absolute URL, so we use the site's origin
const supabaseUrl = typeof window !== 'undefined' ? `${window.location.origin}/supabase-proxy` : '/supabase-proxy';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'MISSING_KEY';

if (supabaseAnonKey === 'MISSING_KEY') {
    console.error('CRITICAL: VITE_SUPABASE_ANON_KEY is missing. Database connection will fail.');
}

// Custom fetch wrapper to handle ISP-level blocks (e.g. Jio) with retries
const customFetch = async (url: RequestInfo | URL, options?: RequestInit) => {
    let retries = 3;
    let delay = 1000;
    while (retries > 0) {
        try {
            // Signal a timeout for each individual attempt
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 10000); // 10s per attempt

            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(id);

            return response;
        } catch (err) {
            retries--;
            if (retries === 0) {
                console.error(`Fetch failed after all retries for: ${url}`, err);
                throw err;
            }
            console.warn(`Fetch attempt failed, retrying in ${delay}ms... (${retries} left)`, url);
            await new Promise(res => setTimeout(res, delay));
            delay *= 2; // Exponential backoff
        }
    }
    return fetch(url, options); // Fallback to standard fetch
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
        fetch: (url, options) => customFetch(url, options)
    }
});
