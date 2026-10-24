/**
 * Centralized WhatsApp Integration Utility Module
 * Supports native file sharing (Web Share API for direct PDF file attachment) 
 * and wa.me / api.whatsapp.com fallback links for sending official school documents (PDFs, Timetables, Sitting Plans, Report Cards).
 */

export interface WhatsAppSendOptions {
  phoneNumber?: string;
  documentTitle: string;
  pdfBlob?: Blob;
  pdfUrl?: string;
  customMessage?: string;
}

/**
 * Triggers native PDF file sharing (if supported on mobile/device) or opens WhatsApp link with summary.
 */
export async function sendDocumentViaWhatsApp(options: WhatsAppSendOptions): Promise<{ success: boolean; method: string }> {
  const {
    phoneNumber = '',
    documentTitle,
    pdfBlob,
    customMessage
  } = options;

  const fileName = `${documentTitle.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  const defaultMsg = `Hello! Please find attached the official PDF document: *${documentTitle}* generated from Haby Edu Pro School Portal.`;
  const messageToSend = customMessage || defaultMsg;

  // Attempt native Web Share API with actual PDF file attachment (supported on mobile WhatsApp, Android, iOS, Chrome, Safari)
  if (pdfBlob && typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
    try {
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
      const shareData = {
        title: documentTitle,
        text: messageToSend,
        files: [file]
      };

      if (navigator.canShare(shareData)) {
        await navigator.share(shareData);
        return { success: true, method: 'native-file-share' };
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.warn('Native file share declined or unsupported, opening WhatsApp link:', err);
      } else {
        return { success: false, method: 'aborted' };
      }
    }
  }

  // Fallback: Open WhatsApp web/app link with text message and instructions
  const encodedText = encodeURIComponent(messageToSend);
  const cleanPhone = (phoneNumber || '').replace(/[^0-9]/g, '');

  const waUrl = cleanPhone
    ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`
    : `https://wa.me/?text=${encodedText}`;

  try {
    window.open(waUrl, '_blank');
    return { success: true, method: 'whatsapp-link' };
  } catch (err) {
    console.error('Failed to open WhatsApp window:', err);
    return { success: false, method: 'error' };
  }
}

/**
 * Formats a Tanzania phone number for WhatsApp (e.g. 0717... -> 255717...).
 */
export function formatTanzaniaPhoneForWhatsApp(rawPhone: string): string {
  const digits = (rawPhone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('255')) {
    return digits;
  }
  if (digits.startsWith('0')) {
    return `255${digits.substring(1)}`;
  }
  return `255${digits}`;
}
