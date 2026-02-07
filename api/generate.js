
export default async function handler(req, res) {
    // CORS Handling
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { prompt, image } = req.body;
    const apiKey = process.env.VITE_NANOBANANA_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'Server Config Error: Missing API Key' });
    }

    try {
        let finalPrompt = prompt;

        // [Step 1: Vision Analysis]
        // If an image is provided, we first ask Gemini 1.5 Flash to analyze it and extract visual traits.
        // This acts as a "Bridge" for Image-to-Image generation 
        // since the generation endpoint might not accept direct image input yet.
        if (image) {
            console.log("👁️ Step 1: Analyzing Reference Image (Vision)...");

            const visionModel = "gemini-1.5-flash"; // Good at seeing things
            const visionUrl = `https://generativelanguage.googleapis.com/v1beta/models/${visionModel}:generateContent?key=${apiKey}`;

            const visionResponse = await fetch(visionUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: "Describe this character's physical appearance in extreme detail for an artist to recreate. Focus on hair color, hairstyles (pigtails?), eye shape, face shape, and art style involved (chibi? vector?). Do not describe the clothing. Just the body and head." },
                            { inlineData: { mimeType: "image/png", data: image } }
                        ]
                    }]
                })
            });

            const visionData = await visionResponse.json();
            const description = visionData.candidates?.[0]?.content?.parts?.[0]?.text;

            if (description) {
                console.log("✅ Analysis Complete:", description.substring(0, 50) + "...");
                // Combine the extracted identity with the user's clothing request
                finalPrompt = `Character Description: ${description}. \n\n Request: Draw this exact character wearing [${prompt}]. Maintain the face/hair/style exactly as described. High quality, 2D vector art, white background.`;
            } else {
                console.warn("⚠️ Vision analysis failed, falling back to original prompt.");
            }
        }

        // [Step 2: Image Generation]
        // Now use the detailed prompt to generate the new image
        console.log("🎨 Step 2: Generating Image...");
        // NOTE: Ensure we use a model capable of image generation. 
        // If 'gemini-2.5-flash-image' was a hallucinated name that worked by luck (mapping to imagen), 
        // we should try 'gemini-1.5-flash' (if enabled for imagen) or 'imagen-3.0-generate-001' via vertex.
        // However, for AI Studio API, 'gemini-1.5-flash-8b' or similar often routes correctly. 
        // Let's stick to what partially worked or standard 'gemini-1.5-pro' with tools if available.
        // Retrying the model string that yielded results purely for text.

        const genModel = "gemini-2.0-flash-exp"; // Trying a newer experimental model which often has image gen capabilities enabled in beta
        // Or fallback to the previous one if 2.0 fails. Let's try to be robust. 

        const genUrl = `https://generativelanguage.googleapis.com/v1beta/models/${genModel}:generateContent?key=${apiKey}`;

        const genResponse = await fetch(genUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: `Generate an image: ${finalPrompt}` }]
                }],
                generationConfig: {
                    temperature: 0.4
                },
                safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" }
                ]
            })
        });

        if (!genResponse.ok) {
            throw new Error(`Gen API Error: ${genResponse.status}`);
        }

        const data = await genResponse.json();

        // Extract Image
        const candidate = data.candidates?.[0]?.content?.parts?.[0];
        let finalImageUrl = null;

        if (candidate?.inlineData?.mimeType?.startsWith('image/')) {
            finalImageUrl = `data:${candidate.inlineData.mimeType};base64,${candidate.inlineData.data}`;
        } else if (candidate?.text && candidate.text.startsWith('http')) {
            finalImageUrl = candidate.text;
        }

        if (finalImageUrl) {
            return res.status(200).json({ success: true, imageUrl: finalImageUrl });
        } else {
            // If text returned ("I cannot draw..."), pass it as error
            return res.status(422).json({ success: false, error: "AI Refused: " + (candidate?.text || "No image") });
        }

    } catch (error) {
        console.error("Vercel Function Error:", error);
        return res.status(500).json({ error: error.message });
    }
}
