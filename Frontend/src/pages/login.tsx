/**
 * login.tsx
 * ---------
 * Handles user authentication through username and password credentials.
 *
 * The page performs basic client-side validation, requests JWT tokens from
 * the backend, and persists them for authenticated navigation.
 */
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';

export const Login = () => {
    /** Stores user-provided credentials for authentication. */
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [globalError, setGlobalError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    /** Stores per-field validation messages updated during input handling. */
    const [fieldErrors, setFieldErrors] = useState({
        username: '',
        password: ''
    });
    
    const navigate = useNavigate();

    /**
     * Fills the login form with demo user credentials for instant evaluation.
     */
    const handleDemoLogin = () => {
        setUsername('demo');
        setPassword('demopassword123');
        setFieldErrors({ username: '', password: '' });
        setGlobalError('');
    };

    /**
     * Performs basic field validation to ensure required inputs are not empty.
     */
    const validateField = (field: string, value: string) => {
        let message = '';
        if (value.trim() === '') {
            message = 'This field is required.';
        }
        setFieldErrors(prev => ({ ...prev, [field]: message }));
        return message === '';
    };

    /**
     * Validates credentials and requests authentication tokens from the API.
     */
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault(); 
        setGlobalError('');

        const usernameValid = validateField('username', username);
        const passwordValid = validateField('password', password);

        if (!usernameValid || !passwordValid) return; 
        
        setIsLoading(true);

        try {
            // Requests JWT tokens from the Django authentication endpoint.
            const response = await api.post('token/', {
                username: username,
                password: password
            });
            
            // Persists tokens in local storage for authenticated API access.
            localStorage.setItem('access', response.data.access);
            localStorage.setItem('refresh', response.data.refresh);
            
            // Redirects to the home page after a successful login.
            navigate('/dashboard'); 
            
        } catch (err) {
            // Displays a user-facing error when authentication fails.
            setGlobalError('Invalid username or password. Please try again.');
            setIsLoading(false);
        }
    };

    /** Renders the login page with inline validation feedback. */
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-zinc-900 font-sans text-black dark:text-zinc-100 transition-colors duration-300 relative">
            
            {/* Loading Overlay */}
            {isLoading && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
                    <div className="bg-white dark:bg-zinc-800 p-8 rounded-2xl shadow-2xl flex flex-col items-center text-center max-w-sm border border-gray-100 dark:border-zinc-700">
                        <svg className="animate-spin h-10 w-10 text-orange-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="text-gray-800 dark:text-zinc-100 font-bold text-lg mb-2">Initializing server...</p>
                        <p className="text-gray-600 dark:text-zinc-400 text-sm">
                            Please wait for the Render server to initialize, this can take up to 30 seconds.
                        </p>
                    </div>
                </div>
            )}

            <div className="flex items-center gap-2 mb-10">
                <img src="/logo_icon.png" alt="Sampleton" className="w-12 h-12 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                <span className="font-semibold text-3xl tracking-tighter">
                    <span className="text-black dark:text-white">Sample</span><span className="text-orange-500">ton</span>
                </span>
            </div>

            <div className="bg-white dark:bg-zinc-800 p-8 md:p-10 rounded-2xl w-[90%] max-w-[400px] shadow-xl border border-gray-100 dark:border-zinc-700 transition-colors duration-300">
                
                <h2 className="text-3xl font-extrabold mb-8 text-gray-800 dark:text-zinc-100">Log In</h2>
                
                {globalError && <p className="text-red-600 bg-red-100 p-2 rounded text-sm mb-6 text-center">{globalError}</p>}

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    
                    <div className="flex flex-col gap-1.5">
                        <label className="font-bold text-sm">Username</label>
                        <input 
                            type="text" 
                            placeholder="Enter username" 
                            value={username}
                            onChange={(e) => {
                                setUsername(e.target.value);
                                setFieldErrors(prev => ({ ...prev, username: '' }));
                            }}
                            onBlur={(e) => validateField('username', e.target.value)}
                            className={`p-3 rounded-xl border text-sm focus:outline-none focus:ring-0 transition-colors duration-300 ${fieldErrors.username ? 'border-red-500 focus:ring-0' : 'border-gray-200 dark:border-zinc-600 focus:border-orange-500 dark:focus:border-orange-500 focus:ring-0'} bg-gray-50 dark:bg-zinc-900/50 dark:text-white`}
                        />
                        {fieldErrors.username && <span className="text-red-500 text-xs">{fieldErrors.username}</span>}
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="font-bold text-sm">Password</label>
                        <input 
                            type="password" 
                            placeholder="Enter password" 
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                setFieldErrors(prev => ({ ...prev, password: '' }));
                            }}
                            onBlur={(e) => validateField('password', e.target.value)}
                            className={`p-3 rounded-xl border text-sm focus:outline-none focus:ring-0 transition-colors duration-300 ${fieldErrors.password ? 'border-red-500 focus:ring-0' : 'border-gray-200 dark:border-zinc-600 focus:border-orange-500 dark:focus:border-orange-500 focus:ring-0'} bg-gray-50 dark:bg-zinc-900/50 dark:text-white`}
                        />
                        {fieldErrors.password && <span className="text-red-500 text-xs">{fieldErrors.password}</span>}
                    </div>

                    <button 
                        type="submit" 
                        className="bg-gradient-to-r from-orange-500 to-yellow-500 hover:scale-105 hover:shadow-lg text-white font-bold py-3 px-4 mt-2 transition-all shadow-md text-sm rounded-xl"
                    >
                        Log In
                    </button>

                    <button 
                        type="button" 
                        onClick={handleDemoLogin}
                        className="w-full bg-orange-50 dark:bg-zinc-700/60 hover:bg-orange-100 dark:hover:bg-zinc-700 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-zinc-600 font-bold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm"
                    >
                        Demo Account
                    </button>
                </form>

                <div className="text-center mt-6 text-sm">
                    Don't have an account?{' '}
                    <Link to="/register" className="font-bold text-orange-500 hover:text-orange-600 transition-colors hover:underline">
                        Sign Up
                    </Link>
                </div>
            </div>

            <div className="mt-10 text-center text-sm">
                <Link to="/dashboard" className="text-gray-600 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:underline transition-colors">
                    Continue as Guest
                </Link>
            </div>
        </div>
    );
};

export default Login;