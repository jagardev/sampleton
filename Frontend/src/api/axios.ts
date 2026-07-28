/**
 * axios.ts
 * --------
 * Configures and exports a pre-configured Axios instance for all API requests.
 *
 * This module centralises HTTP communication with the Django backend. It sets
 * the base URL so that individual components only need to provide the relative
 * path of each endpoint. A response interceptor is also registered to handle
 * authentication failures globally, avoiding the need to duplicate that logic
 * in every component that makes a request.
 */

import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/',
});

/**
 * Global response interceptor that handles expired or invalid JWT tokens.
 *
 * When the backend returns a 401 Unauthorized response on any endpoint other
 * than the token endpoint itself, the interceptor clears the stored tokens
 * from local storage, notifies the user, and redirects to the login page.
 * For all other errors, the rejection is forwarded so that individual
 * components can handle specific cases such as validation errors (400).
 */
api.interceptors.response.use(
    (response) => {
        // Successful responses pass through without modification.
        return response;
    },
    (error) => {
        // A 401 outside of the token endpoint means the session has expired.
        if (error.response && error.response.status === 401 && !error.config.url.includes('token/')) {

            // Remove the invalid tokens from storage.
            localStorage.removeItem('access');
            localStorage.removeItem('refresh');

            // Inform the user before redirecting.
            alert("Your session has expired. Please log in again.");

            // Send the user back to the login page.
            window.location.href = '/login';
        }

        // Re-throw the error so components can handle other failure cases.
        return Promise.reject(error);
    }
);

export default api;