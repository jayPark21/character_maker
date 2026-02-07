
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
        // Even if we use 2.5 for generation, using 1.5-Flash for analysis helps refine the prompt greatly.
        if (image) {
            console.log("👁️ Step 1: Analyzing Reference Image (Vision)...");

            const visionModel = "gemini-1.5-flash";
            const visionUrl = `https://generativelanguage.googleapis.com/v1beta/models/${visionModel}:generateContent?key=${apiKey}`;

            const visionResponse = await fetch(visionUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: "Describe this character's physical appearance in extreme detail. Focus on hair color, hairstyles, eye shape, face shape, and art style. Do not describe the clothing. Just the body and head." },
                            { inlineData: { mimeType: "image/png", data: image } }
                        ]
                    }]
                })
            });

            const visionData = await visionResponse.json();
            const description = visionData.candidates?.[0]?.content?.parts?.[0]?.text;

            if (description) {
                console.log("✅ Analysis Complete:", description.substring(0, 50) + "...");
                // Add description to prompt
                finalPrompt = `Character Description: ${description}. \n\n Request: Draw this exact character wearing [${prompt}]. Maintain the face/hair/style exactly as described. High quality, 2D vector art, white background.`;
            }
        }

        // [Step 2: Image Generation - USER COMMAND: gemini-2.5-flash-image]
        console.log("🎨 Step 2: Generating with Gemini 2.5 Flash Image...");

        const genModel = "gemini-2.5-flash-image";
        const genUrl = `https://generativelanguage.googleapis.com/v1beta/models/${genModel}:generateContent?key=${apiKey}`;

        // Payload: Text + Image (Base64)
        const parts = [];
        parts.push({ text: `Task: Character Editing. \nInput Image: (Attached). \nInstruction: ${finalPrompt}` });

        if (image) {
            parts.push({
                inlineData: {
                    mimeType: "image/png",
                    data: image
                }
            });
        }

        const genResponse = await fetch(genUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: parts }],
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
            const errData = await genResponse.json().catch(() => ({}));
            // If 422, it means model doesn't support image input.
            throw new Error(`Gen API Error: ${genResponse.status} - ${errData.error?.message || 'Unknown'}`);
        }

        const data = await genResponse.json();
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
            return res.status(422).json({ success: false, error: "AI Refused: " + (candidate?.text || "No image") });
        }

    } catch (error) {
        console.error("Vercel Function Error:", error);
        return res.status(500).json({ error: error.message });
    }
}
