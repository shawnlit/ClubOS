import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { createClub } from '../../services/clubs';
import { btnPrimary, cardClass, inputClass, labelClass } from '../../lib/styles';

export default function CreateClubForm() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState('');

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setCreated('');
    setBusy(true);
    try {
      await createClub({ name: name.trim(), description: description.trim(), category: category.trim() });
      setCreated(name.trim());
      setName('');
      setDescription('');
      setCategory('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create club');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`${cardClass} mt-6`}>
      <h2 className="text-lg font-semibold text-neutral-900 mb-4">Create a club</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="club-name" className={labelClass}>Name</label>
          <input id="club-name" value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} />
        </div>
        <div>
          <label htmlFor="club-category" className={labelClass}>Category</label>
          <input id="club-category" value={category} onChange={(e) => setCategory(e.target.value)} required className={inputClass} />
        </div>
        <div>
          <label htmlFor="club-desc" className={labelClass}>Description</label>
          <textarea id="club-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputClass} />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {created && (
          <p className="text-sm text-green-700">
            Created "{created}". <Link to="/clubs" className="underline">View clubs</Link>
          </p>
        )}
        <button type="submit" disabled={busy} className={btnPrimary}>
          {busy ? 'Creating…' : 'Create club'}
        </button>
      </form>
    </div>
  );
}
