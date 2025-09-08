// FigmaFiles.jsx - Updated with debug functions
import React, { useState, useEffect } from 'react';
import { FileText, Search, Filter, Star, Eye, Download, MessageSquare, RefreshCw, Grid, List } from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001';

const FigmaFiles = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [filterCategory] = useState('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found. Please login again.');
      }

      console.log('Making request to:', `${API_BASE_URL}/api/figma/files`);
      
      const response = await axios.get(`${API_BASE_URL}/api/figma/files`, {
        headers: { 'auth-token': token },
        timeout: 15000
      });
      
      console.log('Response:', response.data);
      setFiles(response.data.files || []);
    } catch (error) {
      console.error('Error loading files:', error);
      
      if (error.response?.status === 401) {
        setError('Authentication failed. Please reconnect to Figma.');
      } else if (error.response?.status === 400) {
        setError('Figma not connected. Please check your connection.');
      } else {
        setError(error.response?.data?.error || error.message || 'Failed to load files');
      }
    } finally {
      setLoading(false);
    }
  };

  // DEBUG FUNCTION 1: Debug Figma Access
  const debugFigmaAccess = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      console.log('🔍 Starting Figma debug...');
      const response = await axios.get(`${API_BASE_URL}/api/figma/debug-figma-access`, {
        headers: { 'auth-token': token },
        timeout: 30000
      });
      
      console.log('🔍 Debug results:', response.data);
      
      // Display results in a more readable format
      const results = response.data.results;
      
      console.log('📊 Summary:');
      console.log('- User info:', results.userInfo.success ? '✅' : '❌');
      console.log('- Recent files:', results.recentFiles.success ? 
        `✅ (${results.recentFiles.count} files)` : '❌');
      
      if (results.teamFiles) {
        console.log('- Team files:');
        Object.values(results.teamFiles).forEach(team => {
          const totalFiles = team.projects?.reduce((sum, project) => 
            sum + (project.fileCount || 0), 0) || 0;
          console.log(`  - ${team.teamName}: ${totalFiles} files`);
        });
      }
      
      // Show debug info to user
      setError(`Debug complete. Check console for details. Recent files: ${results.recentFiles.count || 0}`);
      
    } catch (error) {
      console.error('Debug failed:', error);
      setError(`Debug failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // DEBUG FUNCTION 2: Enhanced File Loading
  const loadFilesEnhanced = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      console.log('🔄 Using enhanced files endpoint...');
      
      const response = await axios.get(`${API_BASE_URL}/api/figma/files-enhanced`, {
        headers: { 'auth-token': token },
        timeout: 30000
      });
      
      console.log('📁 Enhanced response:', response.data);
      setFiles(response.data.files || []);
      
      if (response.data.files.length === 0) {
        setError('No files found. This could mean: 1) You have no files in Figma, 2) Token lacks permissions, 3) Files are in private teams');
      }
      
    } catch (error) {
      console.error('Enhanced load failed:', error);
      setError(`Enhanced load failed: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (fileId, currentStatus) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${API_BASE_URL}/api/figma/files/${fileId}/metadata`,
        { isFavorite: !currentStatus },
        { headers: { 'auth-token': token } }
      );
      
      // Update local state
      setFiles(prevFiles => 
        prevFiles.map(file => 
          file.figmaFileId === fileId 
            ? { ...file, localMetadata: { ...file.localMetadata, isFavorite: !currentStatus } }
            : file
        )
      );
    } catch (error) {
      console.error('Error toggling favorite:', error);
      setError('Failed to update favorite status');
    }
  };

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         file.localMetadata?.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFavorites = !showFavoritesOnly || file.localMetadata?.isFavorite;
    const matchesCategory = filterCategory === 'all' || file.localMetadata?.category === filterCategory;
    
    return matchesSearch && matchesFavorites && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
        <span className="ml-3 text-gray-600">Loading your Figma files...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <div className="text-red-500">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-medium text-red-800">Error Loading Files</h3>
              <p className="text-red-600">{error}</p>
            </div>
          </div>
          <div className="mt-4 space-x-2">
            <button
              onClick={loadFiles}
              className="bg-red-100 text-red-800 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => setError(null)}
              className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Clear Error
            </button>
          </div>
        </div>
        
        {/* DEBUG TOOLS SECTION */}
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-medium text-yellow-800 mb-2">Debug Tools</h3>
          <div className="space-x-2">
            <button
              onClick={debugFigmaAccess}
              className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded text-sm hover:bg-yellow-200"
            >
              Debug Figma Access
            </button>
            <button
              onClick={loadFilesEnhanced}
              className="bg-blue-100 text-blue-800 px-3 py-1 rounded text-sm hover:bg-blue-200"
            >
              Try Enhanced Load
            </button>
            <button
              onClick={() => {
                console.log('Current token:', localStorage.getItem('token'));
                console.log('API Base URL:', API_BASE_URL);
              }}
              className="bg-gray-100 text-gray-800 px-3 py-1 rounded text-sm hover:bg-gray-200"
            >
              Check Config
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* DEBUG TOOLS - Always visible during debugging */}
      <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-medium text-yellow-800 mb-2">Debug Tools</h3>
        <div className="space-x-2">
          <button
            onClick={debugFigmaAccess}
            className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded text-sm hover:bg-yellow-200"
          >
            Debug Figma Access
          </button>
          <button
            onClick={loadFilesEnhanced}
            className="bg-blue-100 text-blue-800 px-3 py-1 rounded text-sm hover:bg-blue-200"
          >
            Try Enhanced Load
          </button>
          <button
            onClick={() => {
              console.log('Current token:', localStorage.getItem('token'));
              console.log('API Base URL:', API_BASE_URL);
            }}
            className="bg-gray-100 text-gray-800 px-3 py-1 rounded text-sm hover:bg-gray-200"
          >
            Check Config
          </button>
        </div>
      </div>

      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Your Figma Files</h2>
          <p className="text-gray-600">{filteredFiles.length} files found</p>
        </div>
        
        <button
          onClick={loadFiles}
          className="flex items-center space-x-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-lg hover:bg-purple-200 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
              showFavoritesOnly 
                ? 'bg-yellow-100 text-yellow-800' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Star className={`w-4 h-4 ${showFavoritesOnly ? 'fill-current' : ''}`} />
            <span>Favorites</span>
          </button>
          
          <div className="flex items-center border border-gray-300 rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-purple-100 text-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-purple-100 text-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Files Display */}
      {filteredFiles.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm || showFavoritesOnly ? 'No files match your criteria' : 'No files found'}
          </h3>
          <p className="text-gray-600">
            {searchTerm || showFavoritesOnly 
              ? 'Try adjusting your search or filters' 
              : 'Your recent Figma files will appear here once you create some'}
          </p>
        </div>
      ) : (
        <div className={viewMode === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
          : 'space-y-4'
        }>
          {filteredFiles.map((file) => (
            <FileCard 
              key={file.figmaFileId} 
              file={file} 
              viewMode={viewMode}
              onToggleFavorite={toggleFavorite}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// File Card Component (unchanged)
const FileCard = ({ file, viewMode, onToggleFavorite }) => {
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const openInFigma = () => {
    window.open(`https://www.figma.com/file/${file.figmaFileId}`, '_blank');
  };

  if (viewMode === 'list') {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
            {file.thumbnail_url ? (
              <img 
                src={file.thumbnail_url} 
                alt={file.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 truncate">{file.name}</h3>
            <p className="text-sm text-gray-600">
              Modified {formatDate(file.lastModified)}
            </p>
            {file.localMetadata?.description && (
              <p className="text-sm text-gray-500 truncate mt-1">
                {file.localMetadata.description}
              </p>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onToggleFavorite(file.figmaFileId, file.localMetadata?.isFavorite)}
              className={`p-2 rounded-lg transition-colors ${
                file.localMetadata?.isFavorite
                  ? 'text-yellow-600 hover:bg-yellow-50'
                  : 'text-gray-400 hover:bg-gray-50'
              }`}
            >
              <Star className={`w-4 h-4 ${file.localMetadata?.isFavorite ? 'fill-current' : ''}`} />
            </button>
            
            <button
              onClick={openInFigma}
              className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
      <div className="aspect-video bg-gray-100 relative group">
        {file.thumbnail_url ? (
          <img 
            src={file.thumbnail_url} 
            alt={file.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FileText className="w-12 h-12 text-gray-400" />
          </div>
        )}
        
        <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
          <button
            onClick={openInFigma}
            className="bg-white text-gray-800 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
          >
            Open in Figma
          </button>
        </div>
      </div>
      
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-medium text-gray-900 truncate flex-1" title={file.name}>
            {file.name}
          </h3>
          <button
            onClick={() => onToggleFavorite(file.figmaFileId, file.localMetadata?.isFavorite)}
            className={`ml-2 p-1 rounded transition-colors ${
              file.localMetadata?.isFavorite
                ? 'text-yellow-600 hover:bg-yellow-50'
                : 'text-gray-400 hover:bg-gray-50'
            }`}
          >
            <Star className={`w-4 h-4 ${file.localMetadata?.isFavorite ? 'fill-current' : ''}`} />
          </button>
        </div>
        
        <p className="text-sm text-gray-600 mb-2">
          Modified {formatDate(file.lastModified)}
        </p>
        
        {file.localMetadata?.description && (
          <p className="text-sm text-gray-500 truncate">
            {file.localMetadata.description}
          </p>
        )}
        
        {file.localMetadata?.tags && file.localMetadata.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {file.localMetadata.tags.slice(0, 3).map((tag, index) => (
              <span 
                key={index}
                className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded"
              >
                {tag}
              </span>
            ))}
            {file.localMetadata.tags.length > 3 && (
              <span className="text-xs text-gray-500">
                +{file.localMetadata.tags.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FigmaFiles;