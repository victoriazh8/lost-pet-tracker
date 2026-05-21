import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import PetCard from "../components/PetCard";
import PetHero from "../components/PetHero";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const PetDetails = () => {
  const { id } = useParams();
  const [pet, setPet] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    const fetchPetAndMatches = async () => {
      try {
        setFetchError(null);
        const res = await fetch(`${API_BASE}/api/pets/${id}/matches`);
        if (!res.ok) throw new Error(res.status === 404 ? 'Pet not found' : 'Failed to load');
        const data = await res.json();
        setPet(data.pet);
        setMatches(data.matches);
      } catch (err) {
        setFetchError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPetAndMatches();
  }, [id]);

  if (loading) return <p className="max-w-6xl mx-auto p-6 text-gray-500">Loading...</p>;
  if (fetchError) return <p className="max-w-6xl mx-auto p-6 text-red-500">{fetchError}</p>;
  if (!pet) return <p className="max-w-6xl mx-auto p-6 text-gray-500">Pet not found.</p>;

  const listingsPath = pet.type === "lost" ? "/lost" : "/found";

  return (
    <div className="max-w-6xl mx-auto p-6">
      <Link
        to={listingsPath}
        className="text-teal-600 hover:underline mb-4 inline-block"
      >
        &larr; Back to listings
      </Link>

      {/* Main Pet */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-teal-700 mb-4">
          {pet.type === "lost" ? "Lost Pet" : "Found Pet"}
        </h1>

        <PetHero pet={pet} />

        {pet.sourceUrl && (
          <div className="mt-4">
            <a
              href={pet.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-teal-600 hover:text-teal-800 hover:underline"
            >
              View original post →
            </a>
          </div>
        )}

        {(pet.contactName || pet.contactInfo) && (
          <div className="mt-6 bg-teal-50 border border-teal-200 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-teal-800 mb-2">Contact</h3>
            {pet.contactName && <p className="text-gray-800">{pet.contactName}</p>}
            {pet.contactInfo && (
              <p className="text-teal-700 font-medium mt-1">
                {pet.contactInfo.includes('@') ? (
                  <a href={`mailto:${pet.contactInfo}`} className="hover:underline">{pet.contactInfo}</a>
                ) : (
                  <a href={`tel:${pet.contactInfo.replace(/\D/g, '')}`} className="hover:underline">{pet.contactInfo}</a>
                )}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Matches */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">
          Potential Matches
        </h2>

        {matches.length === 0 ? (
          <p className="text-gray-500">
            No potential matches found yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {matches.map(match => (
              <PetCard
                key={match.id}
                pet={match}
                matchScore={match.matchScore}
                reasons={match.reasons}
                linkable={true}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PetDetails;
