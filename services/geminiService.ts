import { GoogleGenAI, Type } from "@google/genai";
import { DesignStyle } from "../types";

// Helper to create the client instance dynamically
const createClient = (apiKey: string) => {
  return new GoogleGenAI({ apiKey });
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

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text) as string[];
  } catch (error) {
    console.error("Error generating ideas:", error);
    throw error;
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
  Return ONLY the concepts as a JSON array of strings. Keep them concise.`;

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

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text) as string[];
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
  
  // Enhance prompt for T-shirt specific quality
  const enhancedPrompt = `T-shirt design, ${style} style, ${prompt}. 
  High quality, isolated on a solid background, vector aesthetics, vibrant colors, professional print ready design, no text.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: enhancedPrompt }]
      },
      config: {
        // gemini-2.5-flash-image does not support responseMimeType
      }
    });

    // Extract image
    // Note: The structure for image response in gemini-2.5-flash-image usually involves candidates
    const parts = response.candidates?.[0]?.content?.parts;
    const imagePart = parts?.find(p => p.inlineData);
    
    if (imagePart && imagePart.inlineData && imagePart.inlineData.data) {
        return `data:${imagePart.inlineData.mimeType || 'image/png'};base64,${imagePart.inlineData.data}`;
    }
    
    throw new Error("No image data found in response");
  } catch (error) {
    console.error("Error generating image:", error);
    throw error;
  }
};