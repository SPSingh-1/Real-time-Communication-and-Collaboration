import React, { useCallback, useEffect, useState } from 'react';
import { 
  FileText, 
  Plus, 
  Edit3, 
  Trash2, 
  Filter, 
  Calendar, 
  User,
  Users,
  Globe,
  Quote,
  MessageCircle,
  AlertTriangle,
  Search,
  X,
  Sparkles
} from 'lucide-react';

const DailyNotes = ({ date }) => {
  const [notes, setNotes] = useState([]);
  const [input, setInput] = useState('');
  const [noteType, setNoteType] = useState('comment');
  const [filter, setFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState(date || new Date().toISOString().split('T')[0]);
  const [editingNote, setEditingNote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState({ role: 'single' });
  const [shareMode, setShareMode] = useState('personal');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  // Load user info
  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!token) return;
      
      try {
        const response = await fetch('http://localhost:3001/api/auth/getuser', {
          method: 'POST',
          headers: { 'auth-token': token }
        });
        if (response.ok) {
          const userData = await response.json();
          setUserInfo({
            ...userData,
            role: userData.role || 'single'
          });
        }
      } catch (err) {
        console.error('Failed to fetch user info:', err);
      }
    };

    fetchUserInfo();
  }, [token]);

  const fetchNotes = useCallback(async () => {
    if (!token) return;
    
    setLoading(true);
    let url = `http://localhost:3001/notes/${selectedDate}`;
    if (filter !== 'all') url += `?type=${filter}`;

    try {
      const response = await fetch(url, {
        headers: { 'auth-token': token }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to fetch notes');
      }
      
      const data = await response.json();
      setNotes(data);
      setError('');
    } catch (error) {
      console.error('Failed to fetch notes:', error);
      setError('Failed to load notes');
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, filter, token]);

  useEffect(() => {
    fetchNotes();
  }, [selectedDate, filter, fetchNotes]);

  const handleAddOrEdit = async () => {
    if (!input.trim()) {
      setError('Please enter note content');
      return;
    }

    setLoading(true);
    setError('');
    
    const payload = { 
      content: input, 
      date: selectedDate, 
      type: noteType,
      shareWithTeam: shareMode === 'team',
      shareGlobally: shareMode === 'global'
    };
    
    const url = editingNote
      ? `http://localhost:3001/notes/${editingNote._id}`
      : 'http://localhost:3001/notes';
    const method = editingNote ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json', 
          'auth-token': token 
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save note');
      }

      await response.json();
      
      setInput('');
      setNoteType('comment');
      setEditingNote(null);
      setShareMode('personal');
      setSuccess(editingNote ? 'Note updated successfully' : 'Note added successfully');
      setTimeout(() => setSuccess(''), 3000);
      fetchNotes();
    } catch (err) {
      console.error('Save note error:', err);
      setError(err.message || 'Failed to save note');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this note?')) return;
    
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3001/notes/${id}`, {
        method: 'DELETE',
        headers: { 'auth-token': token }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete note');
      }

      setSuccess('Note deleted successfully');
      setTimeout(() => setSuccess(''), 3000);
      fetchNotes();
    } catch (err) {
      console.error('Delete note error:', err);
      setError(err.message || 'Failed to delete note');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (note) => {
    setEditingNote(note);
    setInput(note.content);
    setNoteType(note.type);
    setShareMode(note.scope === 'global' ? 'global' : note.scope === 'team' ? 'team' : 'personal');
    setError('');
  };

  const cancelEdit = () => {
    setEditingNote(null);
    setInput('');
    setNoteType('comment');
    setShareMode('personal');
    setError('');
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'quote':
        return <Quote className="text-blue-500" size={16} />;
      case 'important':
        return <AlertTriangle className="text-red-500" size={16} />;
      default:
        return <MessageCircle className="text-green-500" size={16} />;
    }
  };

  const getScopeIcon = (scope) => {
    switch (scope) {
      case 'global':
        return <Globe className="text-purple-500" size={14} />;
      case 'team':
        return <Users className="text-blue-500" size={14} />;
      default:
        return <User className="text-green-500" size={14} />;
    }
  };

  const getScopeLabel = (scope) => {
    switch (scope) {
      case 'global': return 'Global';
      case 'team': return 'Team';
      default: return 'Personal';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'quote':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'important':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800';
      default:
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800';
    }
  };

  const filteredNotes = notes.filter(note => {
    if (!searchTerm) return true;
    return note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
           note.user?.name?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="p-6 h-full flex flex-col bg-gradient-to-br from-slate-50/50 to-white dark:from-slate-900/50 dark:to-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl text-white shadow-lg">
            <FileText size={20} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">Daily Notes</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Capture your thoughts and ideas</p>
          </div>
          <Sparkles className="text-yellow-500 animate-pulse" size={18} />
        </div>
        
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`p-2 rounded-lg transition-colors ${showAdvanced ? 'bg-green-500 text-white' : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-400'}`}
        >
          <Filter size={18} />
        </button>
      </div>

      {/* Advanced Controls */}
      {showAdvanced && (
        <div className="bg-white/80 dark:bg-slate-800/80 rounded-2xl p-4 mb-6 space-y-4 border border-gray-200 dark:border-gray-600">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Filter by Type
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">All Notes</option>
                <option value="quote">Quotes</option>
                <option value="comment">Comments</option>
                <option value="important">Important</option>
              </select>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Add/Edit Note Form */}
      <div className="bg-white/80 dark:bg-slate-800/80 rounded-2xl p-6 mb-6 border border-gray-200 dark:border-gray-700 shadow-xl backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl text-white">
            <FileText size={20} />
          </div>
          <div>
            <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              {editingNote ? 'Edit Note' : 'Add New Note'}
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {editingNote ? 'Update your note' : 'Capture your thoughts for today'}
            </p>
          </div>
        </div>
        
        <div className="space-y-4">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none"
            placeholder="Write your note..."
            rows={3}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Note Type
              </label>
              <select
                value={noteType}
                onChange={(e) => setNoteType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              >
                <option value="comment">💬 Comment</option>
                <option value="quote">📝 Quote</option>
                <option value="important">⚠️ Important</option>
              </select>
            </div>
            
            {userInfo.role !== 'single' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Share With
                </label>
                <select
                  value={shareMode}
                  onChange={(e) => setShareMode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                >
                  <option value="personal">👤 Personal</option>
                  {userInfo.role !== 'single' && <option value="team">👥 Team</option>}
                  {userInfo.role === 'global' && <option value="global">🌍 Global</option>}
                </select>
              </div>
            )}
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={handleAddOrEdit}
              disabled={loading || !input.trim()}
              className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-[1.02]"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              ) : (
                editingNote ? <Edit3 size={16} /> : <Plus size={16} />
              )}
              {editingNote ? 'Update Note' : 'Add Note'}
            </button>
            
            {editingNote && (
              <button
                onClick={cancelEdit}
                className="flex items-center gap-2 px-6 py-3 bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-slate-500 transition-colors"
              >
                <X size={16} />
                Cancel
              </button>
            )}
          </div>

          {/* Status Messages */}
          {error && (
            <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
              <AlertTriangle className="text-red-500" size={18} />
              <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}
          
          {success && (
            <div className="flex items-center gap-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3">
              <MessageCircle className="text-green-500" size={18} />
              <p className="text-green-700 dark:text-green-400 text-sm">{success}</p>
            </div>
          )}
        </div>
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto">
        {loading && !notes.length ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-green-200 border-t-green-600 mx-auto"></div>
            <p className="text-gray-500 dark:text-gray-400 mt-2">Loading notes...</p>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 rounded-full w-24 h-24 mx-auto flex items-center justify-center mb-4">
              <FileText className="text-green-500" size={32} />
            </div>
            <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">No notes found</h4>
            <p className="text-gray-500 dark:text-gray-400">
              {searchTerm ? 'No notes match your search' : `No ${filter !== 'all' ? filter : ''} notes for this day`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredNotes.map((note) => (
              <div
                key={note._id}
                className="bg-white/80 dark:bg-slate-700/80 rounded-2xl p-6 border border-gray-200 dark:border-gray-600 shadow-lg hover:shadow-xl transition-all group backdrop-blur-sm"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {getTypeIcon(note.type)}
                    <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getTypeColor(note.type)}`}>
                      {note.type.charAt(0).toUpperCase() + note.type.slice(1)}
                    </div>
                    <div className="flex items-center gap-1">
                      {getScopeIcon(note.scope)}
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-slate-600 text-gray-600 dark:text-gray-400">
                        {getScopeLabel(note.scope)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {note.canEdit && (
                      <button
                        onClick={() => startEdit(note)}
                        className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400 transition-colors"
                        title="Edit note"
                      >
                        <Edit3 size={14} />
                      </button>
                    )}
                    {note.canDelete && (
                      <button
                        onClick={() => handleDelete(note._id)}
                        className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400 transition-colors"
                        title="Delete note"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="mb-4">
                  <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
                    {note.content}
                  </p>
                </div>
                
                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <User size={12} />
                      {note.user?.name || note.user?.email || 'Unknown'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {new Date(note.date).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <span>
                    {new Date(note.time || note.createdAt).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
                
                {note.isSharedWithMe && (
                  <div className="mt-3 text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    <Users size={12} />
                    Shared with you
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
)};

export default DailyNotes;