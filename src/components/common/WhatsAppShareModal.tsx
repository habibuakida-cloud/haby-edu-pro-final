import React, { useState } from 'react';
import { MessageCircle, Share2, X } from 'lucide-react';
import { sendDocumentViaWhatsApp, formatTanzaniaPhoneForWhatsApp } from '../../utils/WhatsAppIntegration';

interface WhatsAppShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle: string;
  defaultPhone?: string;
  initialMessage?: string;
  pdfBlob?: Blob;
  pdfUrl?: string;
}

export function WhatsAppShareModal({
  isOpen,
  onClose,
  documentTitle,
  defaultPhone = '',
  initialMessage = '',
  pdfBlob,
  pdfUrl
}: WhatsAppShareModalProps) {
  const [phone, setPhone] = useState(defaultPhone);
  const [message, setMessage] = useState(
    initialMessage || `Hello! Please find attached the official document: *${documentTitle}* generated from Haby Edu Pro School Portal.`
  );

  if (!isOpen) return null;

  const handleSend = () => {
    const formattedPhone = formatTanzaniaPhoneForWhatsApp(phone);
    sendDocumentViaWhatsApp({
      phoneNumber: formattedPhone || phone,
      documentTitle,
      pdfBlob,
      pdfUrl,
      customMessage: message
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <MessageCircle className="w-5 h-5" />
            </div>
            <h3 className="font-black text-slate-900 text-base">Send PDF Document via WhatsApp</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-sm font-black p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-slate-600">
          The document <strong>{documentTitle}</strong> has been downloaded as a PDF to your device. You can now send this notification message and document link/summary to teachers, parents, or students via WhatsApp.
        </p>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Recipient Phone Number (Optional)</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 255717616343"
              className="w-full p-2.5 border border-slate-300 rounded-lg font-mono text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">WhatsApp Message</label>
            <textarea
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-xl font-mono text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 leading-relaxed"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            className="px-4 py-2 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer shadow-sm flex items-center gap-1.5"
          >
            <Share2 className="w-4 h-4" />
            <span>Open WhatsApp & Send</span>
          </button>
        </div>
      </div>
    </div>
  );
}
