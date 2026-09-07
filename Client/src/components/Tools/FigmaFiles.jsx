// src/components/Tools/FigmaFiles.jsx
import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Star,
  Eye,
  ExternalLink,
  Plus,
  RefreshCw,
  Grid,
  List,
  Trash2,
  Maximize2,
  Minimize2,
  X,
  Sparkles,
  Layers,
  Layout,
  CheckCircle2,
  AlertCircle,
  AlertTriangle
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';

const API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL}`;

const CATEGORIES = ['All', 'UI Design', 'Wireframe', 'Prototype', 'Design System', 'Presentation', 'Other'];

const FigmaFiles = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [activeCategory, setActiveCategory] = useState('All');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeEmbedFile, setActiveEmbedFile] = useState(null);
  const [isEmbedFullscreen, setIsEmbedFullscreen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Add Form State
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newCategory, setNewCategory] = useState('UI Design');
  const [newDescription, setNewDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Auto detect category & title from Figma link
  const detectCategoryAndTitleFromUrl = (url) => {
    if (!url) return;
    const lower = url.toLowerCase();

    let detectedCat = 'UI Design';
    if (lower.includes('/proto/') || lower.includes('type=proto') || lower.includes('scaling=')) {
      detectedCat = 'Prototype';
    } else if (lower.includes('wireframe') || lower.includes('wire')) {
      detectedCat = 'Wireframe';
    } else if (lower.includes('system') || lower.includes('token') || lower.includes('component')) {
      detectedCat = 'Design System';
    } else if (lower.includes('deck') || lower.includes('slide') || lower.includes('presentation')) {
      detectedCat = 'Presentation';
    } else if (lower.includes('/design/') || lower.includes('/file/')) {
      detectedCat = 'UI Design';
    }
    setNewCategory(detectedCat);

    // Auto extract title from URL path if not already typed
    if (!newTitle.trim()) {
      try {
        const parsed = new URL(url);
        const parts = parsed.pathname.split('/').filter(Boolean);
        if (parts.length >= 3) {
          const rawSlug = decodeURIComponent(parts[2]).replace(/[-_]/g, ' ');
          if (rawSlug && rawSlug.length > 1) {
            setNewTitle(rawSlug.charAt(0).toUpperCase() + rawSlug.slice(1));
          }
        }
      } catch (e) {}
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load locally stored boards first for instant display
      const localCached = JSON.parse(localStorage.getItem('workspace_figma_boards') || '[]');

      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await axios.get(`${API_BASE_URL}/api/figma/files`, {
            headers: { 'auth-token': token },
            timeout: 8000
          });
          const serverFiles = response.data.files || [];

          // Merge local and server files
          const mergedMap = new Map();
          localCached.forEach((f) => mergedMap.set(f.originalUrl || f.figmaFileId || f._id, f));
          serverFiles.forEach((f) => mergedMap.set(f.originalUrl || f.figmaFileId || f._id, f));

          const combined = Array.from(mergedMap.values());
          setFiles(combined);
          localStorage.setItem('workspace_figma_boards', JSON.stringify(combined));
          return;
        } catch (serverErr) {
          console.warn('Backend Figma fetch fallback to local storage:', serverErr);
        }
      }

      setFiles(localCached);
    } catch (err) {
      console.error('Error loading Figma files:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFigmaBoard = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newUrl.trim()) {
      toast.warn('Please provide a board title and a valid Figma URL');
      return;
    }

    const cleanUrl = newUrl.trim();
    const embedUrl = cleanUrl.includes('figma.com/embed')
      ? cleanUrl
      : `https://www.figma.com/embed?embed_host=astra&url=${encodeURIComponent(cleanUrl)}`;

    const localNewBoard = {
      _id: `fig_${Date.now()}`,
      figmaFileId: `fig_${Date.now()}`,
      name: newTitle.trim(),
      originalUrl: cleanUrl,
      embedUrl,
      category: newCategory || 'UI Design',
      description: newDescription.trim(),
      isFavorite: false,
      lastModified: new Date()
    };

    // Instant optimistic update
    const updatedList = [localNewBoard, ...files.filter((f) => f.originalUrl !== cleanUrl)];
    setFiles(updatedList);
    localStorage.setItem('workspace_figma_boards', JSON.stringify(updatedList));

    toast.success('Figma design board added successfully! 🎨');
    setNewTitle('');
    setNewUrl('');
    setNewDescription('');
    setShowAddModal(false);

    // Sync with backend API
    try {
      const token = localStorage.getItem('token');
      if (token) {
        axios
          .post(
            `${API_BASE_URL}/api/figma/custom-file`,
            {
              name: localNewBoard.name,
              url: localNewBoard.originalUrl,
              category: localNewBoard.category,
              description: localNewBoard.description
            },
            { headers: { 'auth-token': token } }
          )
          .catch((err) => console.warn('Background backend sync:', err));
      }
    } catch (err) {
      console.warn('Sync warning:', err);
    }
  };

  const handleDeleteFile = (fileToDelete) => {
    const fileId = fileToDelete?._id || fileToDelete?.figmaFileId || fileToDelete;
    const targetUrl = fileToDelete?.originalUrl;

    const updated = files.filter(
      (f) =>
        String(f._id) !== String(fileId) &&
        String(f.figmaFileId) !== String(fileId) &&
        (!targetUrl || f.originalUrl !== targetUrl)
    );
    setFiles(updated);
    localStorage.setItem('workspace_figma_boards', JSON.stringify(updated));
    toast.info('Figma board removed 🗑️');

    try {
      const token = localStorage.getItem('token');
      if (token && fileId) {
        axios
          .delete(`${API_BASE_URL}/api/figma/files/${fileId}`, {
            headers: { 'auth-token': token }
          })
          .catch((e) => console.warn('Backend delete sync:', e));
      }
    } catch (err) {}
  };

  const toggleFavorite = async (fileId, currentStatus) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${API_BASE_URL}/api/figma/files/${fileId}/metadata`,
        { isFavorite: !currentStatus },
        { headers: { 'auth-token': token } }
      );

      setFiles((prev) =>
        prev.map((f) =>
          f._id === fileId || f.figmaFileId === fileId
            ? { ...f, isFavorite: !currentStatus, localMetadata: { ...f.localMetadata, isFavorite: !currentStatus } }
            : f
        )
      );
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  const filteredFiles = files.filter((file) => {
    const matchesSearch =
      file.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFav = !showFavoritesOnly || file.isFavorite || file.localMetadata?.isFavorite;
    const cat = file.category || file.localMetadata?.category || 'UI Design';
    const matchesCat = activeCategory === 'All' || cat === activeCategory;
    return matchesSearch && matchesFav && matchesCat;
  });

  return (
    <div className="space-y-6">
      {/* Header with Title and Add Action */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Layout className="w-5 h-5 text-purple-400" />
            <span>Interactive Figma Boards & Files</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Embed, preview live prototypes, and review designs with your team & clients.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={loadFiles}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition"
            title="Refresh Boards"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition transform hover:scale-[1.02] active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Figma Board</span>
          </button>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 custom-scrollbar">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
              activeCategory === cat
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800/80'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Search and View Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search designs, wireframes, prototypes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
              showFavoritesOnly
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${showFavoritesOnly ? 'fill-current text-amber-400' : ''}`} />
            <span>Favorites</span>
          </button>

          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition ${viewMode === 'grid' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition ${viewMode === 'list' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-400 font-medium">Loading Figma design boards...</p>
        </div>
      ) : filteredFiles.length === 0 ? (
        /* Empty State */
        <div className="py-16 text-center bg-slate-900/40 border border-slate-800/80 rounded-3xl p-8">
          <div className="w-14 h-14 rounded-2xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mx-auto mb-3">
            <Layers className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">
            {searchTerm || showFavoritesOnly ? 'No matching Figma designs found' : 'No Figma Boards Added Yet'}
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-5">
            Paste any Figma design link to review prototypes, conduct live design critiques, and share with clients.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs inline-flex items-center gap-2 shadow-lg shadow-purple-600/30 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Your First Figma Board</span>
          </button>
        </div>
      ) : (
        /* Files Grid / List */
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
              : 'space-y-3'
          }
        >
          {filteredFiles.map((file) => (
            <FigmaBoardCard
              key={file._id || file.figmaFileId}
              file={file}
              viewMode={viewMode}
              onOpenLiveEmbed={() => setActiveEmbedFile(file)}
              onToggleFavorite={() => toggleFavorite(file._id || file.figmaFileId, file.isFavorite || file.localMetadata?.isFavorite)}
              onDelete={() => setDeleteTarget(file)}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto border border-red-500/30">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Delete Figma Board?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Are you sure you want to remove <span className="text-white font-semibold">"{deleteTarget.name}"</span>? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleDeleteFile(deleteTarget);
                  setDeleteTarget(null);
                }}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/30 transition transform hover:scale-105"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Figma Board Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Add Figma Design Board</h3>
                  <p className="text-[11px] text-slate-400">Directly embed and view interactive prototypes</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddFigmaBoard} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Board / Project Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Landing Page Redesign, Mobile UI Kit"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Figma File or Prototype URL *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://www.figma.com/design/... or /proto/..."
                  value={newUrl}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewUrl(val);
                    detectCategoryAndTitleFromUrl(val);
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Copy link from Figma ("Share" ➔ "Copy link"). Live interactive canvas will automatically embed.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Notes / Client Info</label>
                  <input
                    type="text"
                    placeholder="Optional notes..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition disabled:opacity-50"
                >
                  {submitting ? 'Adding...' : 'Embed Board'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Live Interactive Figma Canvas Modal */}
      {activeEmbedFile && (
        <div
          className={`fixed z-50 inset-0 bg-black/90 backdrop-blur-xl flex flex-col transition-all duration-300 ${
            isEmbedFullscreen ? 'p-0' : 'p-3 sm:p-6'
          }`}
        >
          {/* Modal Header Toolbar */}
          <div className="bg-slate-900 border border-slate-800 rounded-t-2xl px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center flex-shrink-0 font-black text-xs">
                F
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-white truncate">{activeEmbedFile.name}</h3>
                <p className="text-[11px] text-slate-400 truncate">
                  Category: <span className="text-purple-300 font-medium">{activeEmbedFile.category || 'UI Design'}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={activeEmbedFile.originalUrl || `https://www.figma.com/file/${activeEmbedFile.figmaFileId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Open in Figma</span>
              </a>

              <button
                onClick={() => setIsEmbedFullscreen(!isEmbedFullscreen)}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                title={isEmbedFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              >
                {isEmbedFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              <button
                onClick={() => {
                  setActiveEmbedFile(null);
                  setIsEmbedFullscreen(false);
                }}
                className="p-2 rounded-lg bg-red-950/40 hover:bg-red-900 border border-red-800/50 text-red-300 hover:text-white transition"
                title="Close Viewer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Iframe Live Interactive Canvas */}
          <div className="flex-1 bg-slate-950 border-x border-b border-slate-800 rounded-b-2xl overflow-hidden relative">
            <iframe
              src={
                activeEmbedFile.embedUrl ||
                `https://www.figma.com/embed?embed_host=astra&url=${encodeURIComponent(
                  activeEmbedFile.originalUrl || `https://www.figma.com/file/${activeEmbedFile.figmaFileId}`
                )}`
              }
              title={activeEmbedFile.name}
              className="w-full h-full border-0"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Sub-component: Figma Board Card
const FigmaBoardCard = ({ file, viewMode, onOpenLiveEmbed, onToggleFavorite, onDelete }) => {
  const isFav = file.isFavorite || file.localMetadata?.isFavorite;
  const category = file.category || file.localMetadata?.category || 'UI Design';

  if (viewMode === 'list') {
    return (
      <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-purple-950/60 border border-purple-800/40 text-purple-400 flex items-center justify-center font-bold text-sm flex-shrink-0">
            F
          </div>
          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-bold text-white truncate">{file.name}</h4>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-purple-300 text-[10px] font-semibold">
                {category}
              </span>
              <span>•</span>
              <span className="truncate">{file.description || 'Interactive prototype canvas'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleFavorite}
            className={`p-2 rounded-xl border text-xs transition ${
              isFav ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="Favorite"
          >
            <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
          </button>

          <button
            onClick={onOpenLiveEmbed}
            className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-purple-600/30 transition"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Open Canvas</span>
          </button>

          <button
            onClick={onDelete}
            className="p-2 rounded-xl bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-400 border border-slate-700 transition"
            title="Delete Board"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-950/30 transition flex flex-col justify-between group">
      {/* Visual Canvas Header */}
      <div className="aspect-video bg-gradient-to-br from-slate-950 via-slate-900 to-purple-950/40 relative flex items-center justify-center p-4 border-b border-slate-800/80">
        <div className="w-12 h-12 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-300 group-hover:scale-110 transition">
          <Layout className="w-6 h-6" />
        </div>

        <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-md border border-white/10 text-purple-300 text-[10px] font-bold">
          {category}
        </span>

        <button
          onClick={onToggleFavorite}
          className={`absolute top-2.5 right-2.5 p-1.5 rounded-full backdrop-blur-md border transition ${
            isFav
              ? 'bg-amber-500/30 border-amber-500/50 text-amber-400'
              : 'bg-slate-950/60 border-white/10 text-slate-400 hover:text-white'
          }`}
        >
          <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
        </button>

        {/* Hover Overlay with 1-click open */}
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2 p-3">
          <button
            onClick={onOpenLiveEmbed}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-purple-600/40 transition transform hover:scale-105"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Live Interactive View</span>
          </button>
        </div>
      </div>

      {/* Card Info */}
      <div className="p-4 space-y-2">
        <h4 className="text-xs sm:text-sm font-bold text-white truncate" title={file.name}>
          {file.name}
        </h4>
        <p className="text-[11px] text-slate-400 line-clamp-1">
          {file.description || 'Interactive prototype & design specs'}
        </p>

        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
          <button
            onClick={onOpenLiveEmbed}
            className="text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1"
          >
            <span>Preview</span> ➔
          </button>

          <button
            onClick={onDelete}
            className="text-slate-500 hover:text-red-400 transition"
            title="Delete Board"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default FigmaFiles;