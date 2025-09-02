// Add this component temporarily to debug token issues
import React from 'react';
import useAppContext from '../../context/useAppContext';

const AuthDebug = () => {
  const { user, isAuthenticated, loading, authChecked } = useAppContext();
  
  const tokenFromStorage = localStorage.getItem('token');
  const userFromStorage = localStorage.getItem('user');
  
  return (
    <div className="fixed top-4 right-4 bg-black/80 text-white p-4 rounded-lg text-xs z-50 max-w-md">
      <h4 className="font-bold mb-2">Auth Debug Info</h4>
      <div className="space-y-1">
        <div><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</div>
        <div><strong>Auth Checked:</strong> {authChecked ? 'Yes' : 'No'}</div>
        <div><strong>Is Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}</div>
        <div><strong>User in Context:</strong> {user ? user.name : 'None'}</div>
        <div><strong>User Role:</strong> {user?.role || 'None'}</div>
        <div><strong>Token in Storage:</strong> {tokenFromStorage ? 'Yes (length: ' + tokenFromStorage.length + ')' : 'No'}</div>
        <div><strong>User in Storage:</strong> {userFromStorage ? 'Yes' : 'No'}</div>
        {userFromStorage && (
          <div><strong>Stored User:</strong> {JSON.parse(userFromStorage).name}</div>
        )}
      </div>
      <button 
        onClick={() => {
          console.log('Token:', tokenFromStorage);
          console.log('User:', userFromStorage);
          console.log('Context User:', user);
        }}
        className="mt-2 bg-blue-600 px-2 py-1 rounded text-xs"
      >
        Log to Console
      </button>
    </div>
  );
};

export default AuthDebug;