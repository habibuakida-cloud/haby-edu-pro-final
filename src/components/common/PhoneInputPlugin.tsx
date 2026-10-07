import React, { useState, useId } from 'react';
import { 
  Phone, 
  MessageSquare, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle,
  X,
  PhoneCall
} from 'lucide-react';
import { 
  formatPhoneNumber, 
  getTanzanianCarrier, 
  isValidTanzanianPhone, 
  getWhatsAppUrl, 
  getCallUrl, 
  getSmsUrl,
  CarrierInfo 
} from '../../utils/phoneUtils';

interface PhoneInputPluginProps {
  value: string;
  onChange: (val: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  showCarrierBadge?: boolean;
  showQuickActions?: boolean;
  className?: string;
  id?: string;
  studentName?: string;
}

const COUNTRY_OPTIONS = [
  { code: '+255', flag: '🇹🇿', name: 'Tanzania' },
  { code: '+254', flag: '🇰🇪', name: 'Kenya' },
  { code: '+256', flag: '🇺🇬', name: 'Uganda' },
  { code: '+250', flag: '🇷🇼', name: 'Rwanda' },
  { code: '+257', flag: '🇧🇮', name: 'Burundi' }
];

export const PhoneInputPlugin: React.FC<PhoneInputPluginProps> = ({
  value,
  onChange,
  label = 'Phone Number',
  placeholder = 'e.g. 0754 123 456',
  required = false,
  disabled = false,
  showCarrierBadge = true,
  showQuickActions = true,
  className = '',
  id,
  studentName = ''
}) => {
  const generatedId = useId();
  const inputId = id || generatedId;
  const [selectedCountry, setSelectedCountry] = useState('+255');
  const carrier: CarrierInfo | null = getTanzanianCarrier(value);
  const isValid = isValidTanzanianPhone(value);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const formatted = formatPhoneNumber(raw, selectedCountry);
    onChange(formatted);
  };

  const handleClear = () => {
    onChange('');
  };

  const defaultMsg = studentName
    ? `Habari, tunawasiliana kutoka shuleni kuhusu mwanafunzi ${studentName}.`
    : 'Habari, ujumbe kutoka shuleni.';

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label htmlFor={inputId} className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-blue-600" />
            <span>{label}</span>
            {required && <span className="text-rose-500 font-bold">*</span>}
          </label>

          {/* Carrier Badge if detected */}
          {showCarrierBadge && carrier && (
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${carrier.bgColor} ${carrier.textColor} ${carrier.borderColor} animate-in fade-in`}>
              ● {carrier.name} Network
            </span>
          )}
        </div>
      )}

      {/* Input Box with Country Select + Phone Icon */}
      <div className="relative flex items-center rounded-lg border border-slate-300 bg-white shadow-xs focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
        {/* Country Selector */}
        <div className="flex items-center pl-2.5 pr-1.5 py-1.5 border-r border-slate-200 bg-slate-50 rounded-l-lg shrink-0">
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            disabled={disabled}
            className="text-xs font-bold text-slate-700 bg-transparent border-0 focus:ring-0 cursor-pointer pr-1"
            title="Chagua nchi (Country code)"
          >
            {COUNTRY_OPTIONS.map(c => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.code}
              </option>
            ))}
          </select>
        </div>

        {/* Text Input */}
        <input
          id={inputId}
          type="tel"
          value={value || ''}
          onChange={handleTextChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className="w-full px-3 py-2 text-sm text-slate-800 placeholder-slate-400 bg-transparent border-0 focus:ring-0 focus:outline-none font-medium"
        />

        {/* Clear Button */}
        {value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 mr-1 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer hover:bg-slate-100"
            title="Futa namba"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Validation Status Indicator */}
        {value && (
          <div className="pr-2 shrink-0">
            {isValid ? (
              <span title="Valid phone number format">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </span>
            ) : (
              <span title="Phone format incomplete (10 digits needed)">
                <AlertCircle className="w-4 h-4 text-amber-500" />
              </span>
            )}
          </div>
        )}
      </div>

      {/* Quick Action Plug-in Toolbar (Call, SMS, WhatsApp) */}
      {showQuickActions && value && isValid && (
        <div className="flex items-center gap-1.5 pt-0.5 flex-wrap animate-in fade-in">
          <a
            href={getCallUrl(value)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition"
            title="Piga simu moja kwa moja"
          >
            <PhoneCall className="w-3 h-3 text-blue-600" />
            <span>Call</span>
          </a>

          <a
            href={getSmsUrl(value, defaultMsg)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition"
            title="Tuma ujumbe mfupi (SMS)"
          >
            <MessageSquare className="w-3 h-3 text-purple-600" />
            <span>SMS</span>
          </a>

          <a
            href={getWhatsAppUrl(value, defaultMsg)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition"
            title="Tuma ujumbe kupitia WhatsApp"
          >
            <span className="w-3 h-3 flex items-center justify-center font-bold text-emerald-600 text-[10px]">🟢</span>
            <span>WhatsApp</span>
            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
          </a>
        </div>
      )}
    </div>
  );
};
