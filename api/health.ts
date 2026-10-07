export default function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    status: 'healthy',
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    appName: 'HABY EDU PRO - School Timetable & Management',
    deployment: 'Vercel'
  });
}
