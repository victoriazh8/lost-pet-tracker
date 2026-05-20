import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';

export default function Navbar() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  const links = [
    { to: '/lost', label: 'Lost Pets' },
    { to: '/found', label: 'Found Pets' },
    { to: '/reportPet', label: 'Report a Pet' },
  ];

  return (
    <nav className="w-full bg-white shadow-sm border-b border-gray-100 px-6 py-4">
      <div className="flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold text-teal-600">
          Lost Pet Finder
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6">
          {links.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`font-medium transition ${
                pathname === link.to
                  ? 'text-teal-600'
                  : 'text-gray-500 hover:text-teal-600'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 text-gray-600"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4">
          {links.map(link => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setOpen(false)}
              className={`font-medium py-1 ${
                pathname === link.to
                  ? 'text-teal-600'
                  : 'text-gray-500 hover:text-teal-600'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
