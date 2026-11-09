import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { AnalysisResult, GroundingChunk } from "../types.ts";

export const identifyMetalImage = async (base64Image: string): Promise<AnalysisResult> => {
  // Initialize the client inside the function to ensure process.env.API_KEY is ready
  // and to avoid issues with stale or missing keys during module loading.
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please ensure you have configured your API key correctly.");
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    // Extract mimeType from data URL header (e.g. "data:image/png;base64,...")
    // Fall back to image/jpeg if no header is present
    const mimeMatch = base64Image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const cleanBase64 = base64Image.split(',')[1] || base64Image;

    const prompt = `
      You are the "Keeper of the Archives," an elite expert in metal music history, subgenres (Black, Death, Thrash, Doom, Heavy, Power, etc.), and deciphering illegible band logos.

      **MISSION:**
      Identify the band and/or album in the image. The image is likely a difficult-to-read Metal Band Logo or an Album Cover.

      **PROTOCOL (Think Step-by-Step):**
      1.  **Visual Deciphering (Critical):** 
          *   Do not rely solely on standard OCR. Metal logos are often symmetric, spiked, web-like, or dripping. 
          *   Analyze the silhouette, the number of "words" or clusters, and specific letter shapes (e.g., 'trve' style calligraphy).
          *   If it is an album cover without text, analyze the art style (painting, collage, grotesque) to match against known discographies.
      2.  **Candidate Generation:**
          *   Based on visual cues, generate 3-5 potential band names.
      3.  **Strict Verification (The "Metal Archives" Standard):**
          *   You MUST use the 'googleSearch' tool.
          *   Search queries should include: "site:metal-archives.com [candidate name] logo", "site:discogs.com [candidate name] [album title]".
          *   **Visual Match Confirmation:** Compare the search results of the band's logo/cover *exactly* against the user's image. If the visual details (font, lines, layout) do not match, discard the candidate.
      4.  **Final Verdict:** Select the definitive match only if you are 95% sure.

      **OUTPUT RULES:**
      
      **Condition A: FAILURE / UNCERTAINTY**
      If the image contains no text, is too blurry, or you cannot verify the band with high confidence:
      output ONLY this structure:
      NAME: Unknown Entity
      TYPE: Unknown
      ---
            (Stop generation here)
      
      **Condition B: SUCCESS**
      
      Otherwise, use this Output Structure:
      Line 1: NAME: [Band Name] or [Band Name - Album Name]
      Line 2: TYPE: [Band] or [Album]
      Line 3: ---
      
      Followed by a Markdown response structured exactly as follows (Use ## for Section Headers):

      ## Overall Information
      * **Band Name:** [Name]
      * **Album:** [Album Name, Album Release Year, or "N/A" if analyzing a Band Logo]
      * **Formed in:** [The Year the Band was Created]
      * **Genre:** [Specific Genre or Subgenre of the Band]
      * **Country of Origin:** [City (if applicable), Country where the Band is From]
      * **Other Releases:** [List all other releases as lists along with their release year and type]
      * **Band Biography:** [A concise, atmospheric bio of the band's history, genre, and vibe]
      * **Album Description:** [Brief description of this specific album, or if it's a logo, say "N/A" and state that becaucse this is a logo, it is not linked to any specific album. Then describe the band's general soundscape]

      ## Track Highlights
      [List 3 key songs (if Band) or track highlights (if Album) with very brief descriptions]

      ## Similar to this [Band/Album]
      [List 3-5 similar bands with one of their iconic albums. For each item, You MUST find the band followed by a short description.]
      Format exactly like this:
      * **[Band Name - Album Name]**: [Brief description of why they are similar]

      
      Important: Use the Google Search tool to find these real URLs.
    `;


    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: cleanBase64,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const fullText = response.text || "Could not identify the image.";
    
    const lines = fullText.split('\n');
    let identifiedName = "Unknown Entity";
    let identifiedType: 'Band' | 'Album' | 'Unknown' = 'Unknown';
    
    const contentLines: string[] = [];

    // Robust parser to extract metadata and strip it from the description
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // Only process headers in the beginning (limit to first 10 lines to be safe against varying whitespace)
      if (i < 10) {
        if (trimmed.startsWith('NAME:')) {
          let nameVal = trimmed.substring(5).trim();
          
          // Handle case where TYPE might be on the same line (hallucination safeguard)
          // e.g., "NAME: Band Name TYPE: Band"
          const typeIndex = nameVal.indexOf('TYPE:');
          if (typeIndex !== -1) {
             const potentialType = nameVal.substring(typeIndex + 5).trim().toLowerCase();
             if (potentialType.includes('band')) identifiedType = 'Band';
             else if (potentialType.includes('album')) identifiedType = 'Album';
             
             nameVal = nameVal.substring(0, typeIndex).trim();
          }
          
          identifiedName = nameVal;
          continue; // Skip metadata line from description
        }
        
        if (trimmed.startsWith('TYPE:')) {
           const t = trimmed.substring(5).trim().toLowerCase();
           if (t.includes('band')) identifiedType = 'Band';
           else if (t.includes('album')) identifiedType = 'Album';
           continue; // Skip metadata line from description
        }
        
        if (trimmed === '---') {
           continue; // Skip separator line
        }
      }
      
      contentLines.push(line);
    }

    // If parser failed to find headers or explicitly unknown, force Unknown
    if (identifiedName.toLowerCase().includes('unknown entity')) {
      identifiedName = "Unknown Entity";
    }

    let descriptionText = contentLines.join('\n').trim();

    // Merge with API-provided grounding chunks safely
    const apiChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    // Deduplicate based on URI using a safer loop approach
    const uniqueChunksMap = new Map<string, GroundingChunk>();
    
    if (Array.isArray(apiChunks)) {
      for (const chunk of apiChunks) {
        // Cast to ensure type safety in the loop
        const c = chunk as GroundingChunk;
        if (c && c.web && c.web.uri) {
          uniqueChunksMap.set(c.web.uri, c);
        }
      }
    }
    
    const uniqueChunks = Array.from(uniqueChunksMap.values());

    return {
      identifiedName,
      identifiedType,
      text: descriptionText,
      sourceImage: base64Image,
      groundingChunks: uniqueChunks,
    };

  } catch (error: any) {
    console.error("Gemini Analysis Error:", error);
    
    let errorMessage = error instanceof Error ? error.message : "Analysis failed";
    
    // Intercept specific Google API quota errors to make them user-friendly
    if (
        errorMessage.includes("429") || 
        errorMessage.toLowerCase().includes("quota") || 
        errorMessage.toLowerCase().includes("exhausted")
    ) {
        errorMessage = "The spirits are recovering. Please wait a moment.";
    } 
    else if (errorMessage.includes("503") || errorMessage.includes("Overloaded")) {
        errorMessage = "The void is overloaded. Try again shortly.";
    }

    throw new Error(errorMessage);
  }
};