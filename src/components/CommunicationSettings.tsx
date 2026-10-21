import React, { useState } from 'react';
import { 
  MessageSquare, 
  Smartphone, 
  MessageCircle, 
  Save, 
  Plus, 
  Trash2, 
  Info,
  Type,
  Code
} from 'lucide-react';
import { CommunicationTemplate } from '../types';

interface CommunicationSettingsProps {
  templates: CommunicationTemplate[];
  onUpdateTemplates: (templates: CommunicationTemplate[]) => void;
}

export const CommunicationSettings: React.FC<CommunicationSettingsProps> = ({
  templates,
  onUpdateTemplates
}) => {
  const [editingTemplate, setEditingTemplate] = useState<CommunicationTemplate | null>(null);

  const defaultTemplates: CommunicationTemplate[] = [
    {
      id: 'default-results-sms',
      name: 'Matokeo ya Mtihani (SMS)',
      type: 'SMS',
      category: 'Results',
      content: 'Ndugu Mzazi, matokeo ya {studentName} {examName} {year}: DIV {division}, AGGT {marks}. Masomo: {subjects}. - {schoolName}',
      isDefault: true
    },
    {
      id: 'default-results-whatsapp',
      name: 'Matokeo ya Mtihani (WhatsApp)',
      type: 'WhatsApp',
      category: 'Results',
      content: '*MATOKEO YA MTIHANI*\n\nNdugu Mzazi, haya ni matokeo ya mwanao *{studentName}* kwa mtihani wa *{examName}* mwaka *{year}*:\n\n*Division:* {division}\n*Points:* {marks}\n\n*Masomo:*\n{subjects}\n\nAsante,\n*{schoolName}*',
      isDefault: true
    }
  ];

  const currentTemplates = templates.length > 0 ? templates : defaultTemplates;

  const handleSave = (template: CommunicationTemplate) => {
    const exists = currentTemplates.some(t => t.id === template.id);
    let newTemplates: CommunicationTemplate[];
    if (exists) {
      newTemplates = currentTemplates.map(t => t.id === template.id ? template : t);
    } else {
      newTemplates = [...currentTemplates, template];
    }
    onUpdateTemplates(newTemplates);
    setEditingTemplate(null);
  };

  const handleDelete = (id: string) => {
    onUpdateTemplates(currentTemplates.filter(t => t.id !== id));
  };

  const placeholders = [
    { key: '{studentName}', label: 'Jina la Mwanafunzi' },
    { key: '{parentName}', label: 'Jina la Mzazi' },
    { key: '{examName}', label: 'Jina la Mtihani' },
    { key: '{year}', label: 'Mwaka' },
    { key: '{division}', label: 'Division / Grade' },
    { key: '{marks}', label: 'Points / Alama' },
    { key: '{subjects}', label: 'Orodha ya Masomo' },
    { key: '{schoolName}', label: 'Jina la Shule' }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-indigo-600" />
              <span>Templates za Mawasiliano</span>
            </h3>
            <p className="text-sm text-slate-500">
              Sanidi mfumo wa ujumbe wa matokeo na matangazo kwa wazazi.
            </p>
          </div>
          <button
            onClick={() => setEditingTemplate({
              id: Math.random().toString(36).substr(2, 9),
              name: '',
              type: 'SMS',
              category: 'Results',
              content: ''
            })}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Ongeza Template</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentTemplates.map((template) => (
            <div key={template.id} className="group p-4 bg-slate-50 rounded-2xl border border-slate-200 hover:border-indigo-300 transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${template.type === 'SMS' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                    {template.type === 'SMS' ? <Smartphone className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{template.name}</h4>
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">{template.category}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setEditingTemplate(template)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 transition"
                  >
                    <Code className="w-4 h-4" />
                  </button>
                  {!template.isDefault && (
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-600 line-clamp-3 font-medium leading-relaxed bg-white/50 p-2 rounded-lg border border-slate-100 italic">
                "{template.content}"
              </p>
            </div>
          ))}
        </div>
      </div>

      {editingTemplate && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                  <Type className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Hariri Template</h3>
                  <p className="text-xs text-slate-500">Sanidi jinsi ujumbe unavyotumwa kwa wazazi</p>
                </div>
              </div>
              <button
                onClick={() => setEditingTemplate(null)}
                className="p-2 hover:bg-slate-200 rounded-full transition"
              >
                <Plus className="w-6 h-6 rotate-45 text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-600 uppercase tracking-wider">Jina la Template</label>
                  <input
                    type="text"
                    value={editingTemplate.name}
                    onChange={e => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="e.g. Matokeo Matamu"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-600 uppercase tracking-wider">Aina ya Ujumbe</label>
                  <div className="flex p-1 bg-slate-100 rounded-xl">
                    <button
                      onClick={() => setEditingTemplate({ ...editingTemplate, type: 'SMS' })}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${editingTemplate.type === 'SMS' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      SMS
                    </button>
                    <button
                      onClick={() => setEditingTemplate({ ...editingTemplate, type: 'WhatsApp' })}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${editingTemplate.type === 'WhatsApp' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      WhatsApp
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-600 uppercase tracking-wider">Maudhui ya Ujumbe (Content)</label>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${editingTemplate.content.length > 160 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                    Characters: {editingTemplate.content.length}
                  </span>
                </div>
                <textarea
                  value={editingTemplate.content}
                  onChange={e => setEditingTemplate({ ...editingTemplate, content: e.target.value })}
                  rows={5}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none resize-none leading-relaxed"
                  placeholder="Andika ujumbe wako hapa..."
                />
              </div>

              <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-black text-indigo-900 uppercase">Placeholder za Kina</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {placeholders.map((p) => (
                    <button
                      key={p.key}
                      onClick={() => setEditingTemplate({ ...editingTemplate, content: editingTemplate.content + p.key })}
                      className="px-3 py-1.5 bg-white border border-indigo-200 rounded-lg text-[10px] font-bold text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                      title={p.label}
                    >
                      {p.key}
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-[10px] text-indigo-500 font-medium">
                  Bofya placeholder ili kuiongeza kwenye ujumbe wako. Zitabadilishwa na taarifa halisi wakati wa kutuma.
                </p>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setEditingTemplate(null)}
                className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-800 transition"
              >
                Ghairi
              </button>
              <button
                onClick={() => handleSave(editingTemplate)}
                className="flex items-center gap-2 px-8 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200"
              >
                <Save className="w-4 h-4" />
                <span>Hifadhi Template</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
