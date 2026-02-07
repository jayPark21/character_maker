
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
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'Server Config Error: Missing API Key' });
    }

    try {
        let finalPrompt = prompt;

        // [Step 1: Vision Analysis]
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
                finalPrompt = `Character Description: ${description}. \n\n Request: Draw this exact character wearing [${prompt}]. Maintain the face/hair/style exactly as described. High quality, 2D vector art, white background.`;
            }
        } else {
            // [Item Only Mode] - Strictly just the clothing!
            console.log("👕 Item Only Generation Mode...");
            finalPrompt = `Draw a single, isolated piece of clothing: ${prompt}. 
            Style: Clean 2D flat vector art, professional illustration.
            Composition: Centered, full view of the item. No person, no background elements.
            Background: Pure solid white background. No mannequin, no human, just the item.`;
        }

        // [Step 2: Image Generation]
        console.log(image ? "🎨 Step 2: Character Synthesis Mode..." : "👕 Step 2: Item Design Mode...");

        const genModel = "gemini-2.5-flash-image";
        const genUrl = `https://generativelanguage.googleapis.com/v1beta/models/${genModel}:generateContent?key=${apiKey}`;

        const parts = [];

        if (image) {
            // [Synthesis Mode] - Character + Item
            parts.push({
                inlineData: {
                    mimeType: "image/png",
                    data: image
                }
            });
            parts.push({
                text: `Task: GENERATE_IMAGE
                Reference: Use the character in the attached image.
                Action: Redraw this exact character wearing: ${finalPrompt}.
                
                STRICT CONSTRAINTS:
                - EXACT same face, purple hair, and body shape as the reference.
                - Art Style: High-quality, clean 2D vector art (flat illustration).
                - Background: Pure white.
                - MUST output an image part (inlineData). 
                - NO conversational text. DO NOT EXPLAIN.`
            });
        } else {
            // [Item-Only Mode] - Strictly just the clothing!
            parts.push({
                text: `Task: GENERATE_ISOLATED_CLOTHING_ASSET
                Target Item: ${finalPrompt}
                
                CRITICAL RULES (MUST FOLLOW):
                1. DRAW ONLY THE CLOTHING ITEM.
                2. DO NOT DRAW A PERSON, CHARACTER, OR MODEL.
                3. DO NOT DRAW FACE, HAIR, HANDS, LEGS, OR SKIN code.
                4. The item should look like a "Game Item Icon" or "Ghost Mannequin" shot.
                
                Visual Style:
                - Flat 2D Vector Art.
                - Clean lines, solid colors.
                - Centered composition.
                - PURE WHITE BACKGROUND (#FFFFFF).`
            });
        }

        const genResponse = await fetch(genUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: parts }],
                generationConfig: {
                    temperature: 0.7,
                    topP: 0.95,
                    maxOutputTokens: 2048
                }
            })
        });

        const data = await genResponse.json();

        if (!genResponse.ok) {
            throw new Error(`Gen API Error: ${genResponse.status} - ${data.error?.message || 'Unknown'}`);
        }

        const candidates = data.candidates || [];
        let finalImageUrl = null;

        for (const candidate of candidates) {
            const parts = candidate.content?.parts || [];
            for (const part of parts) {
                if (part.inlineData) {
                    const { mimeType, data: base64Data } = part.inlineData;
                    if (mimeType.startsWith('image/')) {
                        finalImageUrl = `data:${mimeType};base64,${base64Data}`;
                        break;
                    }
                }

                if (part.text) {
                    const cleanedText = part.text.replace(/```[a-z]*\n?|```/g, '').trim();
                    try {
                        const jsonObj = JSON.parse(cleanedText);
                        if (jsonObj.inlineData) {
                            finalImageUrl = `data:${jsonObj.inlineData.mimeType};base64,${jsonObj.inlineData.data}`;
                            break;
                        }
                    } catch (e) {
                        const urlMatch = cleanedText.match(/https?:\/\/[^\s]+(png|jpg|jpeg|webp)/i);
                        if (urlMatch) {
                            finalImageUrl = urlMatch[0];
                            break;
                        }
                    }
                }
            }
            if (finalImageUrl) break;
        }

        if (finalImageUrl) {
            console.log("✅ Synthesis Success! Image generated.");
            return res.status(200).json({ success: true, imageUrl: finalImageUrl });
        } else {
            const stopReason = data.candidates?.[0]?.finishReason;
            const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text || "No text content";

            return res.status(422).json({
                success: false,
                error: `AI Refused (Reason: ${stopReason || 'No image part found'}). AI says: ${textContent.substring(0, 50)}...`
            });
        }

    } catch (error) {
        console.error("Vercel Function Error:", error);
        return res.status(500).json({ error: error.message });
    }
}
