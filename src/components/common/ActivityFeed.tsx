import React from 'react';
import { History, Shield, Clock, User, ArrowRight, Activity, FileText, CheckCircle2 } from 'lucide-react';
import { ActivityLog } from '../../types';

interface ActivityFeedProps {
  activityLogs?: ActivityLog[];
  onClearLogs?: () => void;
  maxItems?: number;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  activityLogs = [],
  onClearLogs,
  maxItems = 8
}) => {
  const sortedLogs = [...(activityLogs || [])].sort((a, b) => {
    const timeA = new Date(a.timestamp || 0).getTime();
    const timeB = new Date(b.timestamp || 0).getTime();
    return timeB - timeA;
  }).slice(0, maxItems);

  const getCategoryColor = (category?: string) => {
    switch ((category || '').toLowerCase()) {
      case 'timetable':
      case 'timetable_update':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'settings':
      case 'school_info_update':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'exams':
      case 'exam_update':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'students':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-black text-sm text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <span>Activity Timeline Feed</span>
              <span className="px-2 py-0.5 text-[10px] rounded-full bg-blue-100 text-blue-800 font-bold">
                {activityLogs.length} Events
              </span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Recent administrative and academic system actions
            </p>
          </div>
        </div>

        {onClearLogs && activityLogs.length > 0 && (
          <button
            type="button"
            onClick={onClearLogs}
            className="text-xs font-bold text-slate-500 hover:text-rose-600 transition cursor-pointer"
          >
            Clear Feed
          </button>
        )}
      </div>

      {sortedLogs.length === 0 ? (
        <div className="text-center py-8 space-y-2">
          <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold text-slate-600">No recent activity recorded</p>
          <p className="text-[11px] text-slate-400">Actions like updating timetables or student records will appear here.</p>
        </div>
      ) : (
        <div className="relative pl-4 space-y-4 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
          {sortedLogs.map((log, index) => {
            const timeStr = log.timestamp ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now';
            const dateStr = log.timestamp ? new Date(log.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '';
            return (
              <div key={log.id || index} className="relative flex items-start gap-3 group">
                {/* Timeline dot */}
                <div className="w-3 h-3 rounded-full bg-blue-600 ring-4 ring-white relative z-10 mt-1 shrink-0 shadow-xs" />

                <div className="flex-1 bg-slate-50/80 hover:bg-slate-50 border border-slate-200/80 rounded-xl p-3 transition shadow-2xs space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-black text-xs text-slate-900">
                      {log.action || 'System Action'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getCategoryColor(log.category)}`}>
                      {log.category || 'General'}
                    </span>
                  </div>

                  {log.description && (
                    <p className="text-xs text-slate-600 font-medium">
                      {log.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200/50">
                    <span className="flex items-center gap-1 font-semibold text-slate-500">
                      <User className="w-3 h-3 text-slate-400" />
                      <span>{log.userName || log.userRole || 'Admin'}</span>
                    </span>
                    <span className="font-mono">
                      {dateStr} at {timeStr}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
