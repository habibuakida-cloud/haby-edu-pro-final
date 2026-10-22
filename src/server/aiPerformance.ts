import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

export async function generatePerformanceInsight(examinationRecords: any[]): Promise<string> {
  const prompt = `
    Analyze the following class performance data: ${JSON.stringify(examinationRecords.slice(0, 50))}.
    Identify subjects (use NECTA codes if available in data, else use subject name) with the highest failure rates.
    Suggest actionable remedial steps for teachers.
    Provide the response in a concise, structured format.
  `;
  
  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: prompt,
  });
  
  return response.text || "No insights could be generated.";
}
