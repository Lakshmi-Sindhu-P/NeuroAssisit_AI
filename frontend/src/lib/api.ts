const API_BASE_URL = "http://localhost:8000/api/v1";

export async function apiRequest(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem("neuroassist_token");

    // Don't set Content-Type for FormData - browser sets multipart boundary automatically
    const isFormData = options.body instanceof FormData;

    // Check if custom Content-Type was provided in options
    const customContentType = (options.headers as Record<string, string>)?.["Content-Type"];

    const headers: Record<string, string> = {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers as Record<string, string> || {}),
    };

    // Only set Content-Type to JSON if not FormData AND no custom Content-Type provided
    if (!isFormData && !customContentType) {
        headers["Content-Type"] = "application/json";
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ detail: "An error occurred" }));
        let errorMessage = "Request failed";

        if (typeof errorBody.detail === "string") {
            errorMessage = errorBody.detail;
        } else if (Array.isArray(errorBody.detail)) {
            // FastAPI 422 errors usually return a list of validation errors
            errorMessage = errorBody.detail.map((err: any) => `${err.loc.join('.')}: ${err.msg}`).join(", ");
        } else if (errorBody.detail && typeof errorBody.detail === "object") {
            errorMessage = JSON.stringify(errorBody.detail);
        } else if (errorBody.message) {
            errorMessage = errorBody.message;
        }

        throw new Error(errorMessage);
    }

    return response.json();
}

const api = {
    get: async (url: string, options?: RequestInit) => {
        const data = await apiRequest(url, { ...options, method: "GET" });
        return { data };
    },
    post: async (url: string, body?: any, options?: RequestInit) => {
        const data = await apiRequest(url, {
            ...options,
            method: "POST",
            body: body instanceof FormData ? body : JSON.stringify(body)
        });
        return { data };
    },
    patch: async (url: string, body?: any, options?: RequestInit) => {
        const data = await apiRequest(url, {
            ...options,
            method: "PATCH",
            body: body instanceof FormData ? body : JSON.stringify(body)
        });
        return { data };
    },
    delete: async (url: string, options?: RequestInit) => {
        const data = await apiRequest(url, { ...options, method: "DELETE" });
        return { data };
    },
};

export default api;
