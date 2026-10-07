import React, { useState } from 'react';
import { 
  Phone, 
  MessageSquare, 
  Copy, 
  Check, 
  Plus, 
  PhoneCall,
  ExternalLink,
  Smartphone
} from 'lucide-react';
import { 
  getTanzanianCarrier, 
  formatPhoneNumber, 
  getCallUrl, 
  getSmsUrl, 
  getWhatsAppUrl 
} from '../../utils/phoneUtils';

interface StudentPhoneBadgeProps {
  phone?: string;
  studentName?: string;
  onUpdatePhone?: (newPhone: string) => void;
}

export const StudentPhoneBadge: React.FC<StudentPhoneBadgeProps> = ({
  phone,
  studentName = 'Mwanafunzi',
  onUpdatePhone
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [tempPhone, setTempPhone] = useState('');

  const carrier = phone ? getTanzanianCarrier(phone) : null;
  const formatted = phone ? formatPhoneNumber(phone) : '';

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!phone) return;
    navigator.clipboard.writeText(phone.replace(/[^0-9+]/g, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveQuickPhone = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onUpdatePhone && tempPhone.trim()) {
      onUpdatePhone(tempPhone.trim());
      setIsEditing(false);
      setTempPhone('');
    }
  };

  const defaultMsg = `Habari, tunawasiliana kutoka shuleni kuhusu mwanafunzi ${studentName}.`;

  // Inline Quick Add Phone Mode
  if (isEditing) {
    return (
      <form onSubmit={handleSaveQuickPhone} className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
        <input
          type="tel"
          value={tempPhone}
          onChange={e => setTempPhone(e.target.value)}
          placeholder="0754 000 000"
          autoFocus
          className="w-28 px-1.5 py-0.5 text-xs border border-blue-400 rounded bg-white font-medium focus:ring-1 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="px-1.5 py-0.5 bg-emerald-600 text-white text-[10px] font-bold rounded hover:bg-emerald-700 cursor-pointer"
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => setIsEditing(false)}
          className="px-1 py-0.5 bg-slate-200 text-slate-600 text-[10px] rounded hover:bg-slate-300 cursor-pointer"
        >
          ✕
        </button>
      </form>
    );
  }

  // No phone registered
  if (!phone || !phone.trim()) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-bold">
          No Phone
        </span>
        {onUpdatePhone && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            className="text-[10px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-0.5 cursor-pointer hover:underline"
            title="Weka namba ya mzazi haraka"
          >
            <Plus className="w-2.5 h-2.5" />
            <span>Add</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap" onClick={e => e.stopPropagation()}>
      <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md text-xs font-mono font-bold text-slate-800">
        <Smartphone className="w-3 h-3 text-slate-500" />
        <span>{formatted}</span>
        {carrier && (
          <span className={`text-[9px] px-1 py-0.2 rounded font-sans font-bold border ${carrier.bgColor} ${carrier.textColor} ${carrier.borderColor}`}>
            {carrier.name}
          </span>
        )}
      </div>

      {/* Quick Action Buttons */}
      <div className="flex items-center gap-1">
        {/* Copy Phone */}
        <button
          type="button"
          onClick={handleCopy}
          className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition cursor-pointer"
          title={copied ? 'Namba imenakiliwa!' : 'Nakili namba (Copy)'}
        >
          {copied ? (
            <Check className="w-3 h-3 text-emerald-600" />
          ) : (
            <Copy className="w-3 h-3" />
          )}
        </button>

        {/* Click to Call */}
        <a
          href={getCallUrl(phone)}
          className="p-1 text-blue-600 hover:text-blue-800 rounded hover:bg-blue-50 transition cursor-pointer"
          title={`Piga simu: ${phone}`}
        >
          <PhoneCall className="w-3 h-3" />
        </a>

        {/* Click to SMS */}
        <a
          href={getSmsUrl(phone, defaultMsg)}
          className="p-1 text-purple-600 hover:text-purple-800 rounded hover:bg-purple-50 transition cursor-pointer"
          title="Tuma SMS kwa mzazi"
        >
          <MessageSquare className="w-3 h-3" />
        </a>

        {/* Click to WhatsApp */}
        <a
          href={getWhatsAppUrl(phone, defaultMsg)}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1 text-emerald-600 hover:text-emerald-800 rounded hover:bg-emerald-50 transition cursor-pointer"
          title="Tuma ujumbe wa WhatsApp"
        >
          <span className="text-[11px] leading-none">🟢</span>
        </a>
      </div>
    </div>
  );
};
