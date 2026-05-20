import { useEffect, useState } from 'react';
import PetCard from './PetCard';
import FilterBar from './FilterBar';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

/**
 * Shared listing component for Lost and Found pages.
 * Props:
 *   type        — 'lost' | 'found'
 *   refreshKey  — increment to trigger a re-fetch (used by sync buttons)
 */
export default function PetList({ type, refreshKey = 0 }) {
  const [allPets, setAllPets] = useState([]);
  const [filteredPets, setFilteredPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFetchError(null);

    fetch(`${API_BASE}/api/pets`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load');
        return res.json();
      })
      .then(data => {
        if (cancelled) return;
        const filtered = data.filter(p => p.type === type);
        setAllPets(filtered);
        setFilteredPets(filtered);
      })
      .catch(() => {
        if (!cancelled) setFetchError('Could not load pets. Is the backend running?');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [type, refreshKey]);

  if (loading) return <p className="text-gray-500 mt-6">Loading...</p>;
  if (fetchError) return <p className="text-red-500 mt-6">{fetchError}</p>;

  const emptyMessage = type === 'lost'
    ? 'No lost pets match your filters.'
    : 'No found pets match your filters.';

  return (
    <>
      <FilterBar pets={allPets} onFilter={setFilteredPets} />
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredPets.map(pet => (
          <PetCard key={pet.id} pet={pet} />
        ))}
        {filteredPets.length === 0 && (
          <p className="text-gray-500 col-span-full">{emptyMessage}</p>
        )}
      </div>
    </>
  );
}
