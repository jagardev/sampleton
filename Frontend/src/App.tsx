/**
 * App.tsx
 * -------
 * Declares the root routing tree for the Sampleton frontend.
 *
 * Public authentication routes are defined at the top level, while all
 * authenticated and shared pages are rendered inside the Layout route.
 */
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import Register from './pages/register';
import Login from './pages/login';
import Home from './pages/home';
import Upload from './pages/upload';
import Layout from './components/layout';
import EditProfile from './pages/editProfile';
import MyLibrary from './pages/myLibrary';
import PlaylistPage from './pages/playlistPage';
import SampleDetails from './pages/sampleDetails';

export function App() {
  /**
   * Initializes the persisted theme preference on first render.
   * Dark mode is used as the default when no preference exists.
   */
  useEffect(() => {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark' || !theme) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  return (
    <Router>
      <div className="min-h-screen font-sans text-black dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-900 transition-colors duration-300">
        <Routes>
          
          <Route element={<Layout />}>
             <Route path="/dashboard" element={<Home />} />
             <Route path="/upload" element={<Upload />} />
             <Route path="/profile" element={<EditProfile />} />
             <Route path="/library" element={<MyLibrary />} />
             <Route path="/playlist/:id" element={<PlaylistPage />} />
             <Route path="/sample/:id" element={<SampleDetails />} />
          </Route>

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          
        </Routes>
      </div>
    </Router>
  );
}

export default App;
