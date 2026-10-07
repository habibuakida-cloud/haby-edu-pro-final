// Helper to normalize Tanzanian phone number to 255XXXXXXXXX
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

// Helper to send SMS via Beem Africa API (https://apisms.beem.africa/v1/send)
export async function sendBeemSMS(destAddr: string, message: string): Promise<{ success: boolean; data?: any; error?: string }> {
  const apiKey = process.env.BEEM_API_KEY;
  const secretKey = process.env.BEEM_SECRET_KEY;
  const sourceAddr = process.env.BEEM_SOURCE_ADDR || 'HABYEDU';

  const normalized = normalizeTzPhone(destAddr);
  if (!normalized || normalized.length < 10) {
    return { success: false, error: `Namba ya simu si sahihi: ${destAddr}` };
  }

  // If live credentials are not set, run in reliable simulation mode with realistic response
  if (!apiKey || !secretKey) {
    console.log(`[Beem Africa SMS Simulator] Dest: ${normalized} | Msg: ${message}`);
    return {
      success: true,
      data: {
        code: 100,
        message: 'SMS sent successfully (Beem Simulation Mode)',
        dest_addr: normalized
      }
    };
  }

  try {
    const authHeader = 'Basic ' + Buffer.from(`${apiKey}:${secretKey}`).toString('base64');
    const response = await fetch('https://apisms.beem.africa/v1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify({
        source_addr: sourceAddr,
        schedule_time: '',
        encoding: 0,
        message,
        recipients: [
          {
            recipient_id: 1,
            dest_addr: normalized
          }
        ]
      })
    });

    const resData: any = await response.json();
    console.log('[Beem Africa Response]:', resData);
    return { 
      success: response.ok && (resData.code === 100 || resData.successful === true), 
      data: resData 
    };
  } catch (err: any) {
    console.error('[Beem Africa Dispatch Error]:', err);
    return { success: false, error: err.message || 'Beem API communication error' };
  }
}
