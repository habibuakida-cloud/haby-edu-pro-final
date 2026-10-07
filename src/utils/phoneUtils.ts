/**
 * Tanzanian & East African Phone Number Utilities
 */

export function normalizeTzPhone(raw: string): string {
  if (!raw) return '';
  let clean = raw.replace(/[^0-9]/g, '');
  if (clean.startsWith('0')) {
    clean = '255' + clean.slice(1);
  } else if (clean.startsWith('255')) {
    // Already in international format
  } else if (clean.length === 9) {
    clean = '255' + clean;
  }
  return clean;
}

export interface CarrierInfo {
  name: string;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
}

/**
 * Detect Tanzanian mobile telecommunications network operator
 */
export function getTanzanianCarrier(phone: string): CarrierInfo | null {
  if (!phone) return null;
  const digits = phone.replace(/[^0-9]/g, '');
  let localPrefix = '';

  if (digits.startsWith('255') && digits.length >= 5) {
    localPrefix = '0' + digits.substring(3, 5);
  } else if (digits.startsWith('0') && digits.length >= 3) {
    localPrefix = digits.substring(0, 3);
  } else if (digits.length >= 2) {
    localPrefix = '0' + digits.substring(0, 2);
  }

  // Vodacom Tanzania
  if (['074', '075', '076'].includes(localPrefix)) {
    return {
      name: 'Vodacom',
      color: '#e60000',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-700'
    };
  }

  // Airtel Tanzania
  if (['068', '069', '078'].includes(localPrefix)) {
    return {
      name: 'Airtel',
      color: '#ff0000',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-200',
      textColor: 'text-rose-700'
    };
  }

  // Tigo / Yas Tanzania
  if (['065', '067', '071'].includes(localPrefix)) {
    return {
      name: 'Tigo',
      color: '#00377b',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-800'
    };
  }

  // Halotel Tanzania
  if (['061', '062'].includes(localPrefix)) {
    return {
      name: 'Halotel',
      color: '#ff7900',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      textColor: 'text-amber-800'
    };
  }

  // TTCL Tanzania
  if (['073'].includes(localPrefix)) {
    return {
      name: 'TTCL',
      color: '#00853f',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      textColor: 'text-emerald-800'
    };
  }

  // Zantel Tanzania
  if (['077'].includes(localPrefix)) {
    return {
      name: 'Zantel',
      color: '#00a3e0',
      bgColor: 'bg-sky-50',
      borderColor: 'border-sky-200',
      textColor: 'text-sky-800'
    };
  }

  return null;
}

/**
 * Format phone input into standard format (e.g. 0754 123 456 or +255 754 123 456)
 */
export function formatPhoneNumber(input: string, countryCode = '+255'): string {
  if (!input) return '';
  const digits = input.replace(/[^0-9]/g, '');

  if (countryCode === '+255') {
    // If starts with 255
    if (digits.startsWith('255')) {
      const national = digits.substring(3);
      if (national.length === 0) return '+255 ';
      if (national.length <= 3) return `+255 ${national}`;
      if (national.length <= 6) return `+255 ${national.slice(0, 3)} ${national.slice(3)}`;
      return `+255 ${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6, 9)}`;
    }

    // If starts with 0
    if (digits.startsWith('0')) {
      if (digits.length <= 4) return digits;
      if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
      return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 10)}`;
    }

    // Digits without leading 0 (e.g. 754...)
    if (digits.length <= 3) return `0${digits}`;
    if (digits.length <= 6) return `0${digits.slice(0, 3)} ${digits.slice(3)}`;
    return `0${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)}`;
  }

  return input;
}

/**
 * Clean phone for international dialing (e.g. 255754123456)
 */
export function toInternationalPhone(phone: string, defaultCode = '255'): string {
  if (!phone) return '';
  let digits = phone.replace(/[^0-9]/g, '');
  if (digits.startsWith('0')) {
    digits = defaultCode + digits.substring(1);
  } else if (!digits.startsWith(defaultCode) && digits.length === 9) {
    digits = defaultCode + digits;
  }
  return digits;
}

/**
 * Validate phone number format
 */
export function isValidTanzanianPhone(phone: string): boolean {
  if (!phone) return false;
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.startsWith('0') && digits.length === 10) return true;
  if (digits.startsWith('255') && digits.length === 12) return true;
  if (digits.length === 9) return true;
  return false;
}

/**
 * Generate WhatsApp message URL
 */
export function getWhatsAppUrl(phone: string, message = ''): string {
  const intl = toInternationalPhone(phone);
  if (!intl) return '#';
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${intl}${encoded ? `?text=${encoded}` : ''}`;
}

/**
 * Generate click-to-call URL
 */
export function getCallUrl(phone: string): string {
  const cleaned = phone.replace(/[^0-9+]/g, '');
  return `tel:${cleaned}`;
}

/**
 * Generate click-to-SMS URL
 */
export function getSmsUrl(phone: string, message = ''): string {
  const cleaned = phone.replace(/[^0-9+]/g, '');
  const encoded = encodeURIComponent(message);
  return `sms:${cleaned}${encoded ? `?body=${encoded}` : ''}`;
}
