import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useAppContext from '../context/useAppContext';
import { jwtDecode } from 'jwt-decode';

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const { login }      = useAppContext();

  useEffect(() => {
    const token = searchParams.get('token');

    if (token) {
      try {
        const decoded = jwtDecode(token);
        login({ ...decoded, token });
        localStorage.setItem('token', token);
        navigate('/dashboard', { replace: true });
      } catch (err) {
        console.error('Invalid token in callback:', err);
        navigate('/login?error=Invalid token received from server', { replace: true });
      }
    } else {
      navigate('/login?error=No token received', { replace: true });
    }
  }, [searchParams, login, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
      <div className="text-center text-white">
        <div className="w-10 h-10 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <h2 className="text-lg font-semibold">Completing Sign In…</h2>
        <p className="text-gray-400 text-xs mt-1">Please wait while we redirect you to your workspace.</p>
      </div>
    </div>
  );
};

export default AuthCallback;
