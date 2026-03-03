export const onRequest: PagesFunction = async (context) => {
    const { request, params } = context;
    const url = new URL(request.url);

    // Extract the path after /supabase-proxy/
    // params.path is an array from [[path]].ts
    const pathParts = Array.isArray(params.path) ? params.path : [];
    const supabasePath = pathParts.join('/');

    // Construct the target Supabase URL safely
    const baseUrl = 'https://olmmjovxfqminuewygeq.supabase.co';
    const targetUrl = new URL(supabasePath, baseUrl);
    targetUrl.search = url.search;

    // Clone the request headers and prepare for proxying
    const headers = new Headers(request.headers);
    headers.set('Host', 'olmmjovxfqminuewygeq.supabase.co');

    // Perform the proxy request
    try {
        const response = await fetch(targetUrl.toString(), {
            method: request.method,
            headers: headers,
            body: request.body,
            redirect: 'manual'
        });

        // Return the response from Supabase back to the client
        return response;
    } catch (error) {
        return new Response(`Proxy Error: ${error.message}`, { status: 500 });
    }
};
