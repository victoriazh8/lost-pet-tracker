import { useState } from 'react';

const PET_TYPES = ['all', 'dog', 'cat', 'other'];
const SIZES = ['all', 'small', 'medium', 'large'];
const SOURCES = ['all', 'user', 'reddit', 'craigslist', 'extension'];

export default function FilterBar({ pets, onFilter }) {
  const [petType, setPetType] = useState('all');
  const [size, setSize] = useState('all');
  const [breed, setBreed] = useState('');
  const [color, setColor] = useState('');
  const [location, setLocation] = useState('');
  const [source, setSource] = useState('all');
  const [search, setSearch] = useState('');

  function apply(overrides = {}) {
    const f = {
      petType: overrides.petType ?? petType,
      size:    overrides.size    ?? size,
      breed:   overrides.breed   ?? breed,
      color:   overrides.color   ?? color,
      location: overrides.location ?? location,
      source:  overrides.source  ?? source,
      search:  overrides.search  ?? search,
    };

    const result = pets.filter(pet => {
      if (f.petType !== 'all' && pet.petType !== f.petType) return false;
      if (f.size !== 'all' && (pet.size || '').toLowerCase() !== f.size) return false;
      if (f.source !== 'all') {
        const petSource = pet.source || 'user';
        if (f.source === 'user') {
          // User-submitted: no source, or source doesn't match known scrapers
          if (pet.source && ['reddit', 'craigslist'].includes(pet.source)) return false;
        } else if (f.source === 'extension') {
          // Extension bulk-scan: source is a hostname like "reddit.com", "nextdoor.com"
          if (!pet.source || !pet.source.includes('.')) return false;
        } else {
          if (petSource !== f.source) return false;
        }
      }
      if (f.breed && !(pet.breed || '').toLowerCase().includes(f.breed.toLowerCase())) return false;
      if (f.color && !(pet.color || '').toLowerCase().includes(f.color.toLowerCase())) return false;
      if (f.location && !(pet.location || '').toLowerCase().includes(f.location.toLowerCase())) return false;
      if (f.search) {
        const q = f.search.toLowerCase();
        const text = [pet.name, pet.breed, pet.color, pet.size, pet.coatPattern, pet.location, pet.description]
          .filter(Boolean).join(' ').toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });

    onFilter(result);
  }

  function update(field, value) {
    const setters = { petType: setPetType, size: setSize, breed: setBreed, color: setColor, location: setLocation, source: setSource, search: setSearch };
    setters[field](value);
    apply({ [field]: value });
  }

  function clearAll() {
    setPetType('all'); setSize('all'); setBreed(''); setColor(''); setLocation(''); setSource('all'); setSearch('');
    onFilter(pets);
  }

  const hasFilters = petType !== 'all' || size !== 'all' || breed || color || location || source !== 'all' || search;

  return (
    <div className="mb-6 space-y-3">
      {/* Search bar */}
      <input
        type="text"
        placeholder="Search across all fields..."
        className="border border-gray-300 rounded-lg px-4 py-2 w-full"
        value={search}
        onChange={e => update('search', e.target.value)}
      />

      {/* Filter row */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Pet type pills */}
        <div className="flex gap-1">
          {PET_TYPES.map(t => (
            <button
              key={t}
              onClick={() => update('petType', t)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                petType === t
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1) + 's'}
            </button>
          ))}
        </div>

        {/* Size pills */}
        <div className="flex gap-1 border-l border-gray-200 pl-2">
          {SIZES.map(s => (
            <button
              key={s}
              onClick={() => update('size', s)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                size === s
                  ? 'bg-violet-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s === 'all' ? 'Any size' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {/* Text filters */}
        <input
          type="text"
          placeholder="Breed"
          className="border border-gray-300 rounded px-3 py-1.5 text-sm w-28"
          value={breed}
          onChange={e => update('breed', e.target.value)}
        />
        <input
          type="text"
          placeholder="Color"
          className="border border-gray-300 rounded px-3 py-1.5 text-sm w-24"
          value={color}
          onChange={e => update('color', e.target.value)}
        />
        <input
          type="text"
          placeholder="Location"
          className="border border-gray-300 rounded px-3 py-1.5 text-sm w-32"
          value={location}
          onChange={e => update('location', e.target.value)}
        />

        {/* Source dropdown */}
        <select
          className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white"
          value={source}
          onChange={e => update('source', e.target.value)}
        >
          {SOURCES.map(s => (
            <option key={s} value={s}>
              {s === 'all' ? 'All sources' : s === 'user' ? 'User submitted' : s === 'extension' ? 'Extension import' : s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>

        {hasFilters && (
          <button
            onClick={clearAll}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
