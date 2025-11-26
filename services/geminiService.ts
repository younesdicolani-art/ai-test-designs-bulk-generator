import { GoogleGenAI, Type } from "@google/genai";
import { DesignStyle } from "../types";

// Helper to create the client instance dynamically
const createClient = (apiKey: string) => {
  return new GoogleGenAI({ apiKey });
};

const cleanJson = (text: string) => {
  if (!text) return "[]";
  // Remove markdown code blocks if present
  let cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
  // Extract array if embedded in text
  const firstBracket = cleaned.indexOf('[');
  const lastBracket = cleaned.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket !== -1) {
    cleaned = cleaned.substring(firstBracket, lastBracket + 1);
  }
  return cleaned;
};

export const generateDesignIdeas = async (
  apiKey: string,
  niche: string,
  count: number = 5
): Promise<string[]> => {
  const ai = createClient(apiKey);
  
  const prompt = `Generate a list of ${count} distinct, creative, and sellable T-shirt design concepts based on the niche: "${niche}". 
  Return ONLY the concepts as a JSON array of strings. Keep them concise (e.g., "A astronaut cat surfing").`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    return JSON.parse(cleanJson(response.text || "[]")) as string[];
  } catch (error) {
    console.error("Error generating ideas:", error);
    // Return a basic fallback if parsing fails to avoid app crash
    return [`${niche} vintage style`, `${niche} typography design`, `${niche} mascot character`];
  }
};

export const analyzeImageForIdeas = async (
  apiKey: string,
  imageBase64: string,
  mimeType: string
): Promise<string[]> => {
  const ai = createClient(apiKey);

  const prompt = `You are a professional merchandising expert. Analyze the uploaded T-shirt design image. 
  Based on its style, subject matter, and vibe, generate a list of 10 NEW, distinct, and creative T-shirt design concepts that would appeal to the exact same target audience.
  Do not describe the existing image. Generate NEW variations and concepts.
  Return ONLY the concepts as a JSON array of strings.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: imageBase64
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    return JSON.parse(cleanJson(response.text || "[]")) as string[];
  } catch (error) {
    console.error("Error analyzing image for ideas:", error);
    throw error;
  }
};

export const generateImage = async (
  apiKey: string,
  prompt: string,
  style: DesignStyle
): Promise<string> => {
  const ai = createClient(apiKey);
  
  // Simplified prompt to reduce refusal chances while maintaining quality instructions
  const enhancedPrompt = `T-shirt design, ${style} style. ${prompt}. Vector graphic, isolated on white background, high quality, professional print ready.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: enhancedPrompt }]
      }
    });

    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
       throw new Error("API returned no candidates. The prompt might have triggered safety filters.");
    }

    // Note: The structure for image response in gemini-2.5-flash-image usually involves candidates
    const parts = candidates[0].content?.parts;
    
    if (!parts || parts.length === 0) {
        throw new Error("Response body is empty.");
    }

    const imagePart = parts.find(p => p.inlineData);
    
    if (imagePart && imagePart.inlineData && imagePart.inlineData.data) {
        return `data:${imagePart.inlineData.mimeType || 'image/png'};base64,${imagePart.inlineData.data}`;
    }
    
    // Check if the model returned text instead (often a refusal or clarification)
    const textPart = parts.find(p => p.text);
    if (textPart && textPart.text) {
        throw new Error(`Generation failed: ${textPart.text.substring(0, 100)}...`);
    }

    throw new Error("No image data found in response");
  } catch (error) {
    console.error("Error generating image:", error);
    throw error;
  }
};