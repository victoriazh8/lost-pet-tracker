const API_BASE = import.meta.env.VITE_API_BASE_URL;

function formatDate(dateStr) {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function PetHero({ pet }) {
  const imageSrc = pet.imageUrl
    ? (pet.imageUrl.startsWith('http') ? pet.imageUrl : `${API_BASE}${pet.imageUrl}`)
    : null;

  const placeholderBg = pet.petType === 'cat' ? 'bg-amber-50' : pet.petType === 'dog' ? 'bg-sky-50' : 'bg-gray-50';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
      {/* Image */}
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={pet.name || 'Pet photo'}
          className="w-full h-96 object-cover rounded-xl"
          onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
        />
      ) : null}
      <div
        className={`w-full h-96 rounded-xl ${placeholderBg} flex flex-col items-center justify-center gap-3`}
        style={{ display: imageSrc ? 'none' : 'flex' }}
      >
        <svg className="w-20 h-20 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
          <path d="M4.5 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zm15 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM9 7.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zm6 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM12 21c-4.5 0-8-2.5-8-7 0-2.4 1.6-4.5 4-5.5.6-.3 1.3-.5 2-.5h4c.7 0 1.4.2 2 .5 2.4 1 4 3.1 4 5.5 0 4.5-3.5 7-8 7z"/>
        </svg>
        <span className="text-sm text-gray-400">No photo available</span>
      </div>

      {/* Details */}
      <div className="flex flex-col justify-between">
        <div>
          <span
            className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-3
              ${pet.type === "lost"
                ? "bg-red-100 text-red-700"
                : "bg-green-100 text-green-700"}
            `}
          >
            {pet.type === "lost" ? "Lost" : "Found"}
          </span>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {pet.name || `${pet.type === 'lost' ? 'Lost' : 'Found'} ${pet.petType}`}
          </h1>

          <p className="text-lg text-gray-600 mb-1">
            {pet.breed || "Unknown breed"}{pet.color ? ` · ${pet.color}` : ''}
            {pet.size ? ` · ${pet.size}` : ''}
            {pet.coatPattern ? ` · ${pet.coatPattern}` : ''}
          </p>

          {pet.location && pet.location !== 'Unknown' && (
            <p className="text-gray-500 mb-1">{pet.location}</p>
          )}

          {pet.type === "lost" && pet.dateLost && (
            <p className="text-gray-500">Lost on {formatDate(pet.dateLost)}</p>
          )}

          {pet.type === "found" && pet.dateReported && (
            <p className="text-gray-500">Found on {formatDate(pet.dateReported)}</p>
          )}

          {pet.source && (
            <p className="text-sm text-gray-400 mt-2">Source: {pet.source}</p>
          )}
        </div>

        {pet.description && (
          <div className="mt-6 bg-gray-50 border border-gray-100 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Description</h3>
            <p className="text-gray-700 leading-relaxed">{pet.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default PetHero;
