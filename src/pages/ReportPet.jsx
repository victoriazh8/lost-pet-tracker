import { useState } from 'react';
const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function ReportPet() {
  const [form, setForm] = useState({
    type: 'lost',
    petType: 'dog',
    name: '',
    breed: '',
    color: '',
    location: '',
    dateLost: '',
    description: '',
    contactName: '',
    contactInfo: ''
  });

  const [file, setFile] = useState(null);
  const [imgPreview, setImgPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState(null);

  const handleImport = async () => {
    if (!importText.trim()) return;
    setImporting(true);
    setImportError(null);
    try {
      const res = await fetch(`${API_BASE}/api/parse-post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: importText }),
      });
      if (!res.ok) throw new Error('Failed to parse post');
      const data = await res.json();
      setForm(prev => ({
        ...prev,
        type: data.type ?? prev.type,
        petType: data.petType ?? prev.petType,
        name: data.name ?? prev.name,
        breed: data.breed ?? prev.breed,
        color: data.color ?? prev.color,
        location: data.location ?? prev.location,
        dateLost: data.dateLost ?? prev.dateLost,
        description: data.description ?? prev.description,
      }));
      setImportText('');
    } catch (err) {
      setImportError('Could not parse post. Try again or fill in the form manually.');
    } finally {
      setImporting(false);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    if(selectedFile) {
      setImgPreview(URL.createObjectURL(selectedFile));
    }

  };

const validate = () => {
  const newErrors = {};

  if (!form.location.trim()) {
    newErrors.location = 'Location is required';
  }

  if (form.type === 'lost' && !form.dateLost) {
    newErrors.dateLost = 'Date lost is required for lost pets';
  }

  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const formData = new FormData();
      Object.keys(form).forEach((key) => formData.append(key, form[key]));
      if (file) formData.append('image', file);

      const res = await fetch(`${API_BASE}/api/report`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Submission failed');
      }

      setSubmitted(true);
      setForm({
        type: 'lost',
        petType: 'dog',
        name: '',
        breed: '',
        color: '',
        location: '',
        dateLost: '',
        description: '',
        contactName: '',
        contactInfo: '',
      });
      setFile(null);
      setImgPreview(null);
    } catch (error) {
      setSubmitError(error.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto bg-white shadow rounded">
      <h2 className="text-2xl font-bold mb-4">Report a Lost or Found Pet</h2>

      {submitted && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
          <p className="text-green-700 font-medium">Pet reported successfully! Check the listing page to see potential matches.</p>
          <button onClick={() => setSubmitted(false)} className="text-green-500 hover:text-green-700 text-lg font-bold ml-4">×</button>
        </div>
      )}

      {submitError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
          <p className="text-red-700">{submitError}</p>
          <button onClick={() => setSubmitError(null)} className="text-red-400 hover:text-red-600 text-lg font-bold ml-4">×</button>
        </div>
      )}

      {/* Import from social post */}
      <div className="mb-6 p-4 bg-teal-50 border border-teal-200 rounded-lg">
        <h3 className="font-semibold text-teal-800 mb-1">Import from a social post</h3>
        <p className="text-sm text-teal-600 mb-3">
          Paste a post from Nextdoor, Citizen, Facebook, etc. — we'll fill in the form automatically.
        </p>
        <textarea
          className="w-full p-2 border border-teal-300 rounded text-sm resize-none"
          rows={4}
          placeholder='e.g. "Lost golden retriever named Buddy near Prospect Park, Brooklyn. Last seen July 4th. Very friendly, wearing a red collar."'
          value={importText}
          onChange={e => setImportText(e.target.value)}
        />
        {importError && <p className="text-red-500 text-sm mt-1">{importError}</p>}
        <button
          type="button"
          onClick={handleImport}
          disabled={importing || !importText.trim()}
          className="mt-2 bg-teal-600 text-white px-4 py-2 rounded text-sm hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {importing ? 'Parsing...' : 'Auto-fill from post'}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">Report type</label>
          <select id="type" name="type" value={form.type} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded">
            <option value="lost">Lost</option>
            <option value="found">Found</option>
          </select>
        </div>

        <div>
          <label htmlFor="petType" className="block text-sm font-medium text-gray-700 mb-1">Pet type</label>
          <select id="petType" name="petType" value={form.petType} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded">
            <option value="dog">Dog</option>
            <option value="cat">Cat</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Pet name</label>
          <input id="name" name="name" placeholder="If known" value={form.name} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded" />
        </div>

        <div>
          <label htmlFor="breed" className="block text-sm font-medium text-gray-700 mb-1">Breed</label>
          <input id="breed" name="breed" placeholder="e.g. Golden Retriever, Tabby" value={form.breed} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded" />
        </div>

        <div>
          <label htmlFor="color" className="block text-sm font-medium text-gray-700 mb-1">Color / markings</label>
          <input id="color" name="color" placeholder="e.g. black and white, orange tabby" value={form.color} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded" />
        </div>

        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">Location <span className="text-red-500">*</span></label>
          <input
            id="location"
            name="location"
            placeholder="e.g. Brooklyn, NY"
            value={form.location}
            onChange={handleChange}
            className={`w-full p-2 border rounded ${errors.location ? 'border-red-500' : 'border-gray-300'}`}
          />
          {errors.location && <p className="text-red-500 text-sm mt-1">{errors.location}</p>}
        </div>

        <div>
          <label htmlFor="dateLost" className="block text-sm font-medium text-gray-700 mb-1">
            {form.type === 'lost' ? 'Date lost' : 'Date found'} {form.type === 'lost' && <span className="text-red-500">*</span>}
          </label>
          <input
            id="dateLost"
            type="date"
            name="dateLost"
            value={form.dateLost}
            onChange={handleChange}
            className={`w-full p-2 border rounded ${errors.dateLost ? 'border-red-500' : 'border-gray-300'}`}
          />
          {errors.dateLost && <p className="text-red-500 text-sm mt-1">{errors.dateLost}</p>}
        </div>

        <div>
          <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-1">Photo</label>
          <input id="image" type="file" accept="image/*" onChange={handleFileChange} className="w-full p-2 border border-gray-300 rounded" />
          {imgPreview && <img src={imgPreview} alt="Preview" className="w-full h-48 object-cover rounded border mt-2"/>}
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            id="description"
            name="description"
            placeholder="Any distinguishing features, behavior, collar, etc."
            value={form.description}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded"
            rows={3}
          />
        </div>

        <div className="border-t border-gray-200 pt-4 mt-2">
          <p className="text-sm font-medium text-gray-700 mb-3">Your contact info (so people can reach you about a match)</p>
          <div className="space-y-4">
            <div>
              <label htmlFor="contactName" className="block text-sm font-medium text-gray-700 mb-1">Your name</label>
              <input id="contactName" name="contactName" placeholder="e.g. Jane" value={form.contactName} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded" />
            </div>
            <div>
              <label htmlFor="contactInfo" className="block text-sm font-medium text-gray-700 mb-1">Email or phone</label>
              <input id="contactInfo" name="contactInfo" placeholder="e.g. jane@email.com or (555) 123-4567" value={form.contactInfo} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded" />
            </div>
          </div>
        </div>

        <button
          disabled={submitting}
          className="w-full bg-teal-600 text-white p-2.5 rounded-lg font-medium hover:bg-teal-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? 'Submitting...' : 'Submit Report'}
        </button>
      </form>
    </div>
  );
}
