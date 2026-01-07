import axios from "axios";

const API_BASE_URL = "http://localhost:8000/api/v1";

// --- Fetch Wrapper for V3 Components ---
export async function apiRequest(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem("neuroassist_token");

    const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
    };

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

// --- Axios Instance for Doctor Console (Legacy Support) ---
const api = axios.create({
    baseURL: "/api/v1", // Proxied to localhost:8000 via Vite
});

// Request Interceptor: Add Bearer Token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("neuroassist_token"); // Updated to use V3 key
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 (Logout)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            console.warn("Unauthorized! Token may be expired.");
            // Optional: localStorage.removeItem("neuroassist_token");
        }
        return Promise.reject(error);
    }
);

export default api;
