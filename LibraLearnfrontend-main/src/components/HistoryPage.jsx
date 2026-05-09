import SideNavbar from "./SideNavbar";
import { useChat } from "../hooks/useChat";

const formatDateTime = (timestamp) => {
  if (!timestamp) return "Unknown time";
  try {
    return new Date(timestamp).toLocaleString();
  } catch {
    return "Unknown time";
  }
};

const HistoryPage = () => {
  const { chatHistory, deleteChatEntry } = useChat();
  const entries = [...chatHistory].reverse();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-violet-100">
      <SideNavbar />
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 lg:pl-72">
        <div className="rounded-2xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
            LibraLearn
          </p>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900 md:text-3xl">
            Chat History
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            All conversation history for the currently signed-in account.
          </p>
        </div>

        <div className="mt-6 rounded-3xl border border-white/70 bg-white/90 p-6 shadow-xl backdrop-blur md:p-8">
          {entries.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <p className="text-slate-700 font-semibold">No chat history yet.</p>
              <p className="mt-1 text-sm text-slate-500">
                Start a conversation with the avatar and it will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {entries.map((entry, index) => (
                <div
                  key={entry.id || `history-${index}`}
                  className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 shadow-sm"
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
                      Conversation {entries.length - index}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-slate-500">
                        {formatDateTime(entry.createdAt)}
                      </p>
                      <button
                        onClick={() => deleteChatEntry(entry.id)}
                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                        title="Delete conversation"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 space-y-3">
                    <div className="flex justify-start">
                      <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm border border-slate-200">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          You
                        </p>
                        <p className="mt-1 text-sm text-slate-800">
                          {entry.query || "No question"}
                        </p>
                      </div>
                    </div>

                    {(entry.answers || []).length === 0 ? (
                      <div className="flex justify-end">
                        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 text-white shadow-sm">
                          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-100">
                            Avatar
                          </p>
                          <p className="mt-1 text-sm text-white/95">No answer saved.</p>
                        </div>
                      </div>
                    ) : (
                      (entry.answers || []).map((answer, answerIndex) => (
                        <div
                          key={`${entry.id || index}-a-${answerIndex}`}
                          className="flex justify-end"
                        >
                          <div className="max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 text-white shadow-sm">
                            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-100">
                              Avatar
                            </p>
                            <p className="mt-1 text-sm text-white/95">
                              {answer?.text || "No answer text"}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryPage;
