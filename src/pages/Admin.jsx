import { useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL;
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD;

export default function Admin() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState('');
  const [pwError, setPwError] = useState(false);

  // Reddit sync state
  const [redditQuery, setRedditQuery] = useState('');
  const [redditSyncing, setRedditSyncing] = useState(false);
  const [redditResult, setRedditResult] = useState(null);
  const [redditError, setRedditError] = useState(null);

  // Craigslist sync state
  const [clCity, setClCity] = useState('');
  const [clSyncing, setClSyncing] = useState(false);
  const [clResult, setClResult] = useState(null);
  const [clError, setClError] = useState(null);

  const handleLogin = (e) => {
    e.preventDefault();
    if (pw === ADMIN_PASSWORD) {
      setAuthed(true);
      setPwError(false);
    } else {
      setPwError(true);
    }
  };

  const handleRedditSync = async () => {
    setRedditSyncing(true);
    setRedditResult(null);
    setRedditError(null);
    try {
      const res = await fetch(`${API_BASE}/api/sync/reddit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: redditQuery }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');
      setRedditResult(data);
    } catch (err) {
      setRedditError(err.message);
    } finally {
      setRedditSyncing(false);
    }
  };

  const handleCraigslistSync = async () => {
    if (!clCity.trim()) return;
    setClSyncing(true);
    setClResult(null);
    setClError(null);
    try {
      const res = await fetch(`${API_BASE}/api/sync/craigslist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: clCity }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');
      setClResult(data);
    } catch (err) {
      setClError(err.message);
    } finally {
      setClSyncing(false);
    }
  };

  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white border border-gray-200 rounded-xl p-8 w-full max-w-sm shadow-sm">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Admin</h1>
          <p className="text-sm text-gray-500 mb-6">Enter password to continue</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              placeholder="Password"
              value={pw}
              onChange={e => { setPw(e.target.value); setPwError(false); }}
              className={`w-full px-3 py-2 border rounded-lg text-sm ${pwError ? 'border-red-400' : 'border-gray-300'}`}
              autoFocus
            />
            {pwError && <p className="text-red-500 text-sm">Incorrect password</p>}
            <button
              type="submit"
              className="w-full bg-teal-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-teal-700 transition"
            >
              Sign in
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin</h1>
          <p className="text-sm text-gray-500 mt-1">Import data from external sources</p>
        </div>
        <button
          onClick={() => setAuthed(false)}
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          Sign out
        </button>
      </div>

      <div className="space-y-4">
        {/* Reddit */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="font-semibold text-gray-900 mb-1">Reddit — r/lostpets</h2>
          <p className="text-sm text-gray-500 mb-4">Pull recent posts. Optionally filter by city name.</p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="City (optional, e.g. brooklyn)"
              value={redditQuery}
              onChange={e => setRedditQuery(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1"
            />
            <button
              onClick={handleRedditSync}
              disabled={redditSyncing}
              className="bg-teal-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50"
            >
              {redditSyncing ? 'Syncing...' : 'Sync'}
            </button>
          </div>
          {redditResult && (
            <p className="text-sm text-green-700 mt-3">
              ✓ Added {redditResult.added} new posts ({redditResult.total - redditResult.added} duplicates skipped)
            </p>
          )}
          {redditError && <p className="text-sm text-red-600 mt-3">{redditError}</p>}
        </div>

        {/* Craigslist */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="font-semibold text-gray-900 mb-1">Craigslist — Lost &amp; Found</h2>
          <p className="text-sm text-gray-500 mb-4">Pull listings by city. Supports most major US cities.</p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="City (e.g. new york, chicago, seattle)"
              value={clCity}
              onChange={e => setClCity(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCraigslistSync()}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1"
            />
            <button
              onClick={handleCraigslistSync}
              disabled={clSyncing || !clCity.trim()}
              className="bg-teal-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50"
            >
              {clSyncing ? 'Syncing...' : 'Sync'}
            </button>
          </div>
          {clResult && (
            <p className="text-sm text-green-700 mt-3">
              ✓ Added {clResult.added} new listings ({clResult.total - clResult.added} duplicates skipped)
            </p>
          )}
          {clError && <p className="text-sm text-red-600 mt-3">{clError}</p>}
        </div>
      </div>
    </div>
  );
}
