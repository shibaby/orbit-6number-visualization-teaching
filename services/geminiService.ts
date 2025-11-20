import { GoogleGenAI } from "@google/genai";

const getAIClient = () => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is missing");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const generateOrbitalExplanation = async (
  paramName: string,
  value: number,
  unit: string
): Promise<string> => {
  try {
    const ai = getAIClient();
    const prompt = `
      你是一位航天动力学老师。请向初学者解释轨道根数 "${paramName}"。
      当前值为 ${value.toFixed(2)} ${unit}。
      
      请用生动、直观的中文解释：
      1. 这个参数在几何上代表什么？（例如：形状的扁平程度、轨道面的倾斜角度等）
      2. 这个数值大小意味着什么？
      
      请保持解释简短（100字以内），避免复杂的数学公式。
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "暂无解释。";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "暂时无法获取AI解释。";
  }
};
