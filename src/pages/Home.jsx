import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function Home() {
  const [stats, setStats] = useState({ lost: 0, found: 0 });

  useEffect(() => {
    fetch(`${API_BASE}/api/stats`)
      .then(r => r.json())
      .then(data => setStats({ lost: data.lost, found: data.found }))
      .catch(() => {});
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4">

      {/* Hero */}
      <div className="text-center py-20">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
          Find your pet, faster.
        </h1>
        <p className="text-lg text-gray-500 max-w-xl mx-auto mb-10">
          We aggregate lost and found pet posts from across the web and use AI
          to match them — so reunions happen sooner.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            to="/reportPet"
            className="bg-teal-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-teal-700 transition"
          >
            Report a pet
          </Link>
          <Link
            to="/lost"
            className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition"
          >
            Browse lost pets
          </Link>
          <Link
            to="/found"
            className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition"
          >
            Browse found pets
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-20">
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
          <p className="text-3xl font-semibold text-gray-900">{stats.lost}</p>
          <p className="text-sm text-gray-500 mt-1">Lost pets reported</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
          <p className="text-3xl font-semibold text-gray-900">{stats.found}</p>
          <p className="text-sm text-gray-500 mt-1">Found pets reported</p>
        </div>
      </div>

      {/* How it works */}
      <div className="mb-20">
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider text-center mb-8">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <p className="text-sm font-semibold text-teal-600 mb-1">01</p>
            <h3 className="font-semibold text-gray-900 mb-2">Consolidate</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Posts are pulled from Reddit and Craigslist automatically. You can also paste
              text from any platform and AI extracts the details.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-teal-600 mb-1">02</p>
            <h3 className="font-semibold text-gray-900 mb-2">Match</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Our algorithm scores potential matches by breed, color, location, description,
              and image similarity using CLIP embeddings.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-teal-600 mb-1">03</p>
            <h3 className="font-semibold text-gray-900 mb-2">Reunite</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Every report shows its top matches with a confidence score and an explanation
              of why they matched.
            </p>
          </div>
        </div>
      </div>

      {/* Sources */}
      <div className="mb-20 text-center">
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-6">Data sources</h2>
        <div className="flex flex-wrap justify-center gap-2 text-sm">
          {['Reddit r/lostpets', 'Craigslist Lost & Found'].map(s => (
            <span key={s} className="border border-gray-200 rounded-full px-4 py-1.5 text-gray-600">
              {s}
            </span>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Plus any post you paste from Nextdoor, Facebook, Citizen, or anywhere else.
        </p>
      </div>

    </div>
  );
}
