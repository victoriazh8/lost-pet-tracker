import PetList from '../components/PetList';

export default function FoundPets() {
  return (
    <div className="max-w-6xl mx-auto mt-6 px-4">
      <h1 className="text-3xl font-bold text-teal-700 mb-4">Found Pets</h1>
      <PetList type="found" />
    </div>
  );
}
