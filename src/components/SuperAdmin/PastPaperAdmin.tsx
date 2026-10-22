import React, { useState, useEffect } from 'react';
import { Plus, Trash2, FileText, Search, Save, AlertCircle, CheckCircle2 } from 'lucide-react';

export const PastPaperAdmin: React.FC = () => {
  const [papers, setPapers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    subjectName: '',
    level: 'CSEE',
    year: new Date().getFullYear(),
    examType: 'CSEE',
    paperType: 'Paper 1',
    fileUrl: '',
    markingSchemeUrl: ''
  });
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchPapers();
  }, []);

  const fetchPapers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/past-papers');
      if (!response.ok) throw new Error('Failed to fetch past papers');
      const data = await response.json();
      setPapers(data);
    } catch (err) {
      console.error(err);
      setNotification({ type: 'error', message: 'Failed to fetch papers' });
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/past-papers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!response.ok) throw new Error('Failed to add paper');
      setNotification({ type: 'success', message: 'Paper added successfully' });
      setFormData({
        subjectName: '',
        level: 'CSEE',
        year: new Date().getFullYear(),
        examType: 'CSEE',
        paperType: 'Paper 1',
        fileUrl: '',
        markingSchemeUrl: ''
      });
      fetchPapers();
    } catch (err) {
      setNotification({ type: 'error', message: 'Failed to add paper' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure?')) return;
    try {
      const response = await fetch(`/api/past-papers/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete');
      fetchPapers();
      setNotification({ type: 'success', message: 'Paper deleted' });
    } catch (err) {
      setNotification({ type: 'error', message: 'Failed to delete' });
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-black text-slate-900">Manage Past Papers</h2>
      
      {notification && (
        <div className={`p-4 rounded-xl text-white ${notification.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
          {notification.message}
        </div>
      )}

      <form onSubmit={handleAdd} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <input type="text" placeholder="Subject Name" className="border p-2 rounded" value={formData.subjectName} onChange={e => setFormData({...formData, subjectName: e.target.value})} required />
          <input type="text" placeholder="Level" className="border p-2 rounded" value={formData.level} onChange={e => setFormData({...formData, level: e.target.value})} required />
          <input type="number" placeholder="Year" className="border p-2 rounded" value={formData.year} onChange={e => setFormData({...formData, year: parseInt(e.target.value)})} required />
          <input type="text" placeholder="Exam Type" className="border p-2 rounded" value={formData.examType} onChange={e => setFormData({...formData, examType: e.target.value})} required />
          <input type="text" placeholder="Paper Type" className="border p-2 rounded" value={formData.paperType} onChange={e => setFormData({...formData, paperType: e.target.value})} />
          <input type="text" placeholder="File URL" className="border p-2 rounded col-span-2" value={formData.fileUrl} onChange={e => setFormData({...formData, fileUrl: e.target.value})} required />
          <input type="text" placeholder="Marking Scheme URL" className="border p-2 rounded col-span-2" value={formData.markingSchemeUrl} onChange={e => setFormData({...formData, markingSchemeUrl: e.target.value})} />
        </div>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2">
          <Save size={16} /> Add Paper
        </button>
      </form>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b">
              <th className="p-3">Subject</th>
              <th className="p-3">Level</th>
              <th className="p-3">Year</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {papers.map(p => (
              <tr key={p.id} className="border-b">
                <td className="p-3">{p.subjectName}</td>
                <td className="p-3">{p.level}</td>
                <td className="p-3">{p.year}</td>
                <td className="p-3">
                  <button onClick={() => handleDelete(p.id)} className="text-rose-600"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
