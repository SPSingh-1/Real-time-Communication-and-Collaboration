// src/components/VideoConference/InCallPolls.jsx
import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Plus,
  Trash2,
  CheckCircle2,
  X,
  Vote,
  Sparkles,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { toast } from 'react-toastify';

const InCallPolls = ({ isOpen, onClose, socket, roomId, currentUser }) => {
  const [polls, setPolls] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [userVotes, setUserVotes] = useState({}); // pollId -> selectedOptionIndex

  // Listen to live polls via Socket.io
  useEffect(() => {
    if (!socket) return;

    const handleNewPoll = (poll) => {
      setPolls((prev) => {
        if (prev.some((p) => p.id === poll.id)) return prev;
        return [poll, ...prev];
      });
      toast.info(`📊 New Poll: "${poll.question}"`, { position: 'bottom-right' });
    };

    const handlePollVoted = ({ pollId, optionIndex, voter }) => {
      setPolls((prev) =>
        prev.map((p) => {
          if (p.id !== pollId) return p;
          const updatedOptions = p.options.map((opt, idx) => {
            if (idx === optionIndex) {
              const currentVoters = opt.voters || [];
              const voterId = voter?.id || voter?._id;
              if (currentVoters.some((v) => (v.id || v._id) === voterId)) return opt;
              return {
                ...opt,
                votes: (opt.votes || 0) + 1,
                voters: [...currentVoters, voter]
              };
            }
            return opt;
          });
          const totalVotes = updatedOptions.reduce((acc, o) => acc + (o.votes || 0), 0);
          return { ...p, options: updatedOptions, totalVotes };
        })
      );
    };

    const handlePollEnded = ({ pollId }) => {
      setPolls((prev) =>
        prev.map((p) => (p.id === pollId ? { ...p, ended: true } : p))
      );
      toast.warn('A meeting poll has ended.', { position: 'bottom-right' });
    };

    socket.on('new-poll', handleNewPoll);
    socket.on('poll-voted', handlePollVoted);
    socket.on('poll-ended', handlePollEnded);

    return () => {
      socket.off('new-poll', handleNewPoll);
      socket.off('poll-voted', handlePollVoted);
      socket.off('poll-ended', handlePollEnded);
    };
  }, [socket]);

  const handleAddOption = () => {
    if (options.length >= 6) {
      toast.warning('Maximum 6 options allowed');
      return;
    }
    setOptions([...options, '']);
  };

  const handleRemoveOption = (index) => {
    if (options.length <= 2) {
      toast.warning('Minimum 2 options required');
      return;
    }
    setOptions(options.filter((_, idx) => idx !== index));
  };

  const handleOptionChange = (index, value) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const handleCreatePoll = (e) => {
    e.preventDefault();
    if (!question.trim()) {
      toast.error('Please enter a poll question');
      return;
    }
    const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
    if (cleanOptions.length < 2) {
      toast.error('Please provide at least 2 non-empty options');
      return;
    }

    const newPoll = {
      id: `poll_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      question: question.trim(),
      options: cleanOptions.map((text) => ({ text, votes: 0, voters: [] })),
      totalVotes: 0,
      createdBy: {
        id: currentUser?._id || currentUser?.id,
        name: currentUser?.name || 'Host'
      },
      createdAt: new Date().toISOString(),
      ended: false
    };

    setPolls((prev) => [newPoll, ...prev]);
    setIsCreating(false);
    setQuestion('');
    setOptions(['', '']);

    if (socket && roomId) {
      socket.emit('create-poll', { roomId, poll: newPoll });
    }
    toast.success('Poll launched to all meeting participants!');
  };

  const handleVote = (pollId, optionIndex) => {
    if (userVotes[pollId] !== undefined) {
      toast.warning('You have already voted in this poll');
      return;
    }

    setUserVotes((prev) => ({ ...prev, [pollId]: optionIndex }));

    const voterInfo = {
      id: currentUser?._id || currentUser?.id,
      name: currentUser?.name || 'Teammate'
    };

    // Update locally
    setPolls((prev) =>
      prev.map((p) => {
        if (p.id !== pollId) return p;
        const updatedOptions = p.options.map((opt, idx) => {
          if (idx === optionIndex) {
            return {
              ...opt,
              votes: (opt.votes || 0) + 1,
              voters: [...(opt.voters || []), voterInfo]
            };
          }
          return opt;
        });
        const totalVotes = updatedOptions.reduce((acc, o) => acc + (o.votes || 0), 0);
        return { ...p, options: updatedOptions, totalVotes };
      })
    );

    if (socket && roomId) {
      socket.emit('vote-poll', {
        roomId,
        pollId,
        optionIndex,
        voter: voterInfo
      });
    }
  };

  const handleEndPoll = (pollId) => {
    setPolls((prev) =>
      prev.map((p) => (p.id === pollId ? { ...p, ended: true } : p))
    );
    if (socket && roomId) {
      socket.emit('end-poll', { roomId, pollId });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50 w-[92vw] sm:w-[420px] max-h-[80vh] bg-slate-900/95 backdrop-blur-md border border-slate-700 shadow-2xl rounded-2xl flex flex-col overflow-hidden text-white animate-fade-in">
      {/* HEADER */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold leading-none">In-Meeting Live Polls</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Vote & gather live team feedback</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {!isCreating && (
            <button
              onClick={() => setIsCreating(true)}
              className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> New Poll
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* CONTENT BODY */}
      <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-4">
        {/* CREATE POLL FORM */}
        {isCreating ? (
          <form onSubmit={handleCreatePoll} className="space-y-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Create New Poll
              </span>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Question *
              </label>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g. Should we launch the feature this week?"
                required
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-xs"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-semibold text-slate-400">
                Options *
              </label>
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-500 w-4 font-mono">{idx + 1}.</span>
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    placeholder={`Option ${idx + 1}`}
                    required
                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-xs"
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(idx)}
                      className="p-1.5 text-slate-400 hover:text-red-400 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {options.length < 6 && (
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 mt-1"
                >
                  <Plus className="w-3 h-3" /> Add another option
                </button>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition-colors shadow-sm mt-2"
            >
              Launch Poll to Call
            </button>
          </form>
        ) : null}

        {/* LIST OF ACTIVE / PAST POLLS */}
        {polls.length === 0 && !isCreating ? (
          <div className="text-center py-8 text-slate-400">
            <BarChart3 className="w-10 h-10 mx-auto text-slate-600 mb-2 opacity-50" />
            <p className="text-xs font-semibold text-slate-300">No active polls yet</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Create a quick question to get live votes from call attendees.
            </p>
            <button
              onClick={() => setIsCreating(true)}
              className="mt-3 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg inline-flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3 h-3" /> Create First Poll
            </button>
          </div>
        ) : (
          polls.map((poll) => {
            const hasVoted = userVotes[poll.id] !== undefined;
            const total = poll.totalVotes || 0;
            const isCreator =
              poll.createdBy?.id &&
              String(poll.createdBy.id) === String(currentUser?._id || currentUser?.id);

            return (
              <div
                key={poll.id}
                className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-white">{poll.question}</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      By {poll.createdBy?.name || 'Host'} · {total} vote{total === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {poll.ended ? (
                      <span className="px-1.5 py-0.5 bg-red-950/60 border border-red-800 text-red-400 text-[9px] font-bold rounded">
                        Closed
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 bg-emerald-950/60 border border-emerald-800 text-emerald-400 text-[9px] font-bold rounded animate-pulse">
                        Live
                      </span>
                    )}
                    {isCreator && !poll.ended && (
                      <button
                        onClick={() => handleEndPoll(poll.id)}
                        className="text-[10px] text-slate-400 hover:text-red-400 ml-1 px-1.5 py-0.5 rounded bg-slate-900"
                        title="Close Poll"
                      >
                        End
                      </button>
                    )}
                  </div>
                </div>

                {/* OPTIONS LIST */}
                <div className="space-y-2">
                  {poll.options.map((opt, optIdx) => {
                    const votes = opt.votes || 0;
                    const percent = total > 0 ? Math.round((votes / total) * 100) : 0;
                    const isMyVote = userVotes[poll.id] === optIdx;

                    return (
                      <div key={optIdx} className="space-y-1">
                        <button
                          disabled={hasVoted || poll.ended}
                          onClick={() => handleVote(poll.id, optIdx)}
                          className={`w-full text-left p-2 rounded-lg border text-xs transition-all relative overflow-hidden flex items-center justify-between ${
                            isMyVote
                              ? 'bg-blue-950/40 border-blue-500 font-semibold text-white'
                              : hasVoted || poll.ended
                              ? 'bg-slate-900 border-slate-800 text-slate-300'
                              : 'bg-slate-900 border-slate-700 hover:border-blue-500 text-slate-200'
                          }`}
                        >
                          {/* Animated Progress Fill */}
                          {(hasVoted || poll.ended) && (
                            <div
                              className={`absolute inset-y-0 left-0 transition-all duration-500 opacity-20 ${
                                isMyVote ? 'bg-blue-500' : 'bg-slate-400'
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          )}

                          <div className="flex items-center gap-2 relative z-10 min-w-0 pr-2">
                            {isMyVote && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />}
                            <span className="truncate">{opt.text}</span>
                          </div>

                          {(hasVoted || poll.ended) && (
                            <span className="text-[10px] font-mono font-bold text-slate-300 relative z-10 flex-shrink-0">
                              {percent}% ({votes})
                            </span>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {hasVoted && (
                  <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Your vote has been counted!
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default InCallPolls;
