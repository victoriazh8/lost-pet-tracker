import { useState } from 'react';
import { Link } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const SOURCE_LABELS = {
  reddit: 'Reddit',
  craigslist: 'Craigslist',
};

function formatDate(dateStr) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function getTitle(pet) {
  if (pet.name) return pet.name;
  const parts = [];
  if (pet.type === 'lost') parts.push('Lost');
  else parts.push('Found');
  if (pet.color) parts.push(pet.color.toLowerCase());
  parts.push(pet.petType || 'pet');
  if (pet.location && pet.location !== 'Unknown') parts.push(`in ${pet.location}`);
  return parts.join(' ');
}

function truncate(str, len = 100) {
  if (!str || str.length <= len) return str;
  return str.slice(0, len).trimEnd() + '...';
}

function PetCard({ pet, matchScore, reasons = [], large = false, linkable = true }) {
  const [showReasons, setShowReasons] = useState(false);

  const hasReasons = Array.isArray(reasons) && reasons.length > 0;
  const imageSrc = pet.imageUrl
    ? (pet.imageUrl.startsWith('http') ? pet.imageUrl : `${API_BASE}${pet.imageUrl}`)
    : null;

  const placeholderBg = pet.petType === 'cat' ? 'bg-amber-50' : pet.petType === 'dog' ? 'bg-sky-50' : 'bg-gray-50';

  const dateStr = pet.type === 'lost'
    ? formatDate(pet.dateLost)
    : formatDate(pet.dateReported);

  const handleToggleReasons = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowReasons((prev) => !prev);
  };

  const cardContent = (
    <div className={`border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition ${large ? "bg-teal-50" : "bg-white"}`}>
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={getTitle(pet)}
          className={`w-full object-cover ${large ? "h-64" : "h-44"}`}
          onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
        />
      ) : null}
      <div
        className={`w-full ${large ? "h-64" : "h-44"} ${placeholderBg} flex flex-col items-center justify-center gap-2`}
        style={{ display: imageSrc ? 'none' : 'flex' }}
      >
        <svg className="w-12 h-12 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
          <path d="M4.5 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zm15 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM9 7.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zm6 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM12 21c-4.5 0-8-2.5-8-7 0-2.4 1.6-4.5 4-5.5.6-.3 1.3-.5 2-.5h4c.7 0 1.4.2 2 .5 2.4 1 4 3.1 4 5.5 0 4.5-3.5 7-8 7z"/>
        </svg>
        <span className="text-xs text-gray-400">No photo available</span>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg font-semibold text-gray-900 leading-tight">
            {getTitle(pet)}
          </h2>
          <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
            pet.type === 'lost'
              ? 'bg-red-100 text-red-700'
              : 'bg-green-100 text-green-700'
          }`}>
            {pet.type === 'lost' ? 'Lost' : 'Found'}
          </span>
        </div>

        <p className="text-sm text-gray-500 mt-1">
          {pet.breed || "Unknown breed"}{pet.color ? ` · ${pet.color}` : ''}
          {pet.size ? ` · ${pet.size}` : ''}
          {pet.coatPattern ? ` · ${pet.coatPattern}` : ''}
        </p>

        {pet.location && pet.location !== 'Unknown' && (
          <p className="text-sm text-gray-500">{pet.location}</p>
        )}

        <div className="flex items-center gap-2 mt-2">
          {pet.source && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {SOURCE_LABELS[pet.source] || pet.source}
            </span>
          )}
          {dateStr && (
            <span className="text-xs text-gray-400">{dateStr}</span>
          )}
        </div>

        {pet.description && (
          <p className="text-sm text-gray-600 mt-2 leading-relaxed">
            {truncate(pet.description)}
          </p>
        )}

        {matchScore !== undefined && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-block bg-teal-100 text-teal-800 text-sm font-medium px-3 py-1 rounded-full">
                {matchScore}% match
              </span>

              {pet.imageScore !== null && pet.imageScore !== undefined && (
                <span className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full">
                  Image: {pet.imageScore}%
                </span>
              )}
            </div>

            {hasReasons && (
              <button
                type="button"
                className="text-xs text-teal-600 hover:underline mt-1"
                onClick={handleToggleReasons}
              >
                {showReasons ? "Hide details" : "Why this match?"}
              </button>
            )}

            {hasReasons && showReasons && (
              <ul className="mt-2 text-xs text-gray-600 list-disc pl-5 space-y-1">
                {reasons.map((reason, idx) => (
                  <li key={idx}>{reason}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (!linkable) return cardContent;

  return (
    <Link to={`/pets/${pet.id}`}>
      {cardContent}
    </Link>
  );
}

export default PetCard;
