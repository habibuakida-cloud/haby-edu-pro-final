import { normalizeTzPhone, sendBeemSMS } from '../../src/server/smsUtils.ts';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { schoolId, schoolName = 'HABY EDU PRO', message, recipients } = req.body;

    if (!schoolId) {
      return res.status(400).json({ success: false, error: 'schoolId is required' });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Ujumbe hauwezi kuwa mtupu' });
    }

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ success: false, error: 'Hakuna walengwa' });
    }

    const logs: any[] = [];
    let sentCount = 0;
    let failedCount = 0;

    const finalMsg = message.includes(schoolName) ? message : `${message}\n- ${schoolName}`;

    for (const item of recipients) {
      const phone = normalizeTzPhone(item.phone_255 || item.phone || '');
      const studentCno = item.student_cno || item.cno || 'ALL';

      if (!phone) {
        failedCount++;
        logs.push({ student_cno: studentCno, status: 'FAILED', error: 'Namba haipo' });
        continue;
      }

      const dispatchResult = await sendBeemSMS(phone, finalMsg);

      if (dispatchResult.success) {
        sentCount++;
        logs.push({ student_cno: studentCno, phone, status: 'SENT' });
      } else {
        failedCount++;
        logs.push({ student_cno: studentCno, phone, status: 'FAILED', error: dispatchResult.error });
      }
    }

    res.json({ success: true, sentCount, failedCount, totalCount: recipients.length, logs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}
