import React, { useState } from 'react';
import { Calendar, Plus, Trash2, Edit3, Tag, Clock } from 'lucide-react';
import { CalendarEvent } from '../../types';

interface AcademicCalendarViewProps {
  events: CalendarEvent[];
  onUpdateEvents: (events: CalendarEvent[]) => void;
}

export const AcademicCalendarView: React.FC<AcademicCalendarViewProps> = ({
  events,
  onUpdateEvents
}) => {
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  const handleSave = (event: CalendarEvent) => {
    const exists = events.some(e => e.id === event.id);
    let newEvents: CalendarEvent[];
    if (exists) {
      newEvents = events.map(e => e.id === event.id ? event : e);
    } else {
      newEvents = [...events, event];
    }
    onUpdateEvents(newEvents);
    setEditingEvent(null);
  };

  const handleDelete = (id: string) => {
    onUpdateEvents(events.filter(e => e.id !== id));
  };

  const colors = [
    { name: 'Red', class: 'bg-rose-500' },
    { name: 'Blue', class: 'bg-blue-500' },
    { name: 'Green', class: 'bg-emerald-500' },
    { name: 'Amber', class: 'bg-amber-500' },
    { name: 'Purple', class: 'bg-purple-500' }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-blue-600" />
              <span>Kalenda ya Kitaaluma</span>
            </h3>
            <p className="text-sm text-slate-500">
              Panga likizo, mitihani, na matukio muhimu ya shule.
            </p>
          </div>
          <button
            onClick={() => setEditingEvent({
              id: Math.random().toString(36).substr(2, 9),
              title: '',
              type: 'Holiday',
              startDate: new Date().toISOString().split('T')[0],
              endDate: new Date().toISOString().split('T')[0],
              color: 'bg-blue-500'
            })}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Ongeza Tukio</span>
          </button>
        </div>

        <div className="space-y-4">
          {events.sort((a, b) => a.startDate.localeCompare(b.startDate)).map((event) => (
            <div key={event.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-200 transition">
              <div className={`w-3 h-12 rounded-full ${event.color}`} />
              <div className="flex-1">
                <h4 className="text-sm font-bold text-slate-900">{event.title}</h4>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {event.startDate} - {event.endDate}</span>
                  <span className="font-bold text-blue-600 uppercase">{event.type}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setEditingEvent(event)} className="p-2 text-slate-400 hover:text-blue-600"><Edit3 className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(event.id)} className="p-2 text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editingEvent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <h3 className="text-lg font-black text-slate-900">Hariri Tukio</h3>
            <input type="text" value={editingEvent.title} onChange={e => setEditingEvent({...editingEvent, title: e.target.value})} className="w-full p-3 bg-slate-50 border rounded-xl" placeholder="Jina la tukio" />
            <select value={editingEvent.type} onChange={e => setEditingEvent({...editingEvent, type: e.target.value as any})} className="w-full p-3 bg-slate-50 border rounded-xl">
              <option value="Holiday">Likizo</option>
              <option value="Term">Muhula</option>
              <option value="Exam">Mtihani</option>
              <option value="Other">Tukio Lingine</option>
            </select>
            <div className="grid grid-cols-2 gap-4">
              <input type="date" value={editingEvent.startDate} onChange={e => setEditingEvent({...editingEvent, startDate: e.target.value})} className="p-3 bg-slate-50 border rounded-xl" />
              <input type="date" value={editingEvent.endDate} onChange={e => setEditingEvent({...editingEvent, endDate: e.target.value})} className="p-3 bg-slate-50 border rounded-xl" />
            </div>
            <div className="flex gap-2">
              {colors.map(c => (
                <button key={c.name} onClick={() => setEditingEvent({...editingEvent, color: c.class})} className={`w-8 h-8 rounded-full ${c.class} ${editingEvent.color === c.class ? 'ring-2 ring-offset-2 ring-slate-900' : ''}`} />
              ))}
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button onClick={() => setEditingEvent(null)} className="px-6 py-2.5 text-sm font-bold">Ghairi</button>
              <button onClick={() => handleSave(editingEvent)} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700">Hifadhi</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
