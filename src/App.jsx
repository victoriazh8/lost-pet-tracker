import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import LostPets from './pages/LostPets';
import FoundPets from './pages/FoundPets';
import ReportPet from './pages/ReportPet';
import PetDetails from './pages/PetDetails';
import './index.css';


function App() {
  return (
    <div className="w-full">
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/lost" element={<LostPets />} />
        <Route path="/found" element={<FoundPets />} />
        <Route path="/reportPet" element={<ReportPet />} />
        <Route path="/pets/:id" element={<PetDetails />} />
        <Route path="*" element={
          <div className="max-w-xl mx-auto mt-16 text-center">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">404</h1>
            <p className="text-gray-500 mb-6">Page not found.</p>
            <a href="/" className="text-teal-600 hover:underline">Go home</a>
          </div>
        } />
      </Routes>
    </div>
  );
}

export default App
