import { useState } from 'react';
import PetList from '../components/PetList';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function FoundPets() {
  const [refreshKey, setRefreshKey] = useState(0);

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
      setRefreshKey(k => k + 1);
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
      setRefreshKey(k => k + 1);
    } catch (err) {
      setClError(err.message);
    } finally {
      setClSyncing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto mt-6 px-4">
      <h1 className="text-3xl font-bold text-teal-700 mb-4">Found Pets</h1>

      {/* Sync panels */}
      <details className="mb-6 bg-gray-50 border border-gray-200 rounded-lg">
        <summary className="cursor-pointer px-4 py-3 font-medium text-gray-700 hover:text-teal-600">
          Import from external sources
        </summary>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 pt-2">
          {/* Reddit */}
          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-1">Reddit r/lostpets</h3>
            <p className="text-sm text-gray-500 mb-3">Pull community posts. Optionally filter by city.</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="City (optional)"
                value={redditQuery}
                onChange={e => setRedditQuery(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1.5 text-sm flex-1"
              />
              <button
                onClick={handleRedditSync}
                disabled={redditSyncing}
                className="bg-teal-600 text-white px-4 py-1.5 rounded text-sm hover:bg-teal-700 disabled:opacity-50"
              >
                {redditSyncing ? 'Syncing...' : 'Sync'}
              </button>
            </div>
            {redditResult && <p className="text-sm text-green-700 mt-2">Added {redditResult.added} of {redditResult.total} posts.</p>}
            {redditError && <p className="text-sm text-red-600 mt-2">{redditError}</p>}
          </div>

          {/* Craigslist */}
          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-1">Craigslist Lost &amp; Found</h3>
            <p className="text-sm text-gray-500 mb-3">Pull from the Lost &amp; Found section by city.</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="City (e.g. new york, chicago)"
                value={clCity}
                onChange={e => setClCity(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1.5 text-sm flex-1"
              />
              <button
                onClick={handleCraigslistSync}
                disabled={clSyncing || !clCity.trim()}
                className="bg-teal-600 text-white px-4 py-1.5 rounded text-sm hover:bg-teal-700 disabled:opacity-50"
              >
                {clSyncing ? 'Syncing...' : 'Sync'}
              </button>
            </div>
            {clResult && <p className="text-sm text-green-700 mt-2">Added {clResult.added} of {clResult.total} posts.</p>}
            {clError && <p className="text-sm text-red-600 mt-2">{clError}</p>}
          </div>
        </div>
      </details>

      <PetList type="found" refreshKey={refreshKey} />
    </div>
  );
}
