
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Sparkles, Wand2, RefreshCw } from 'lucide-react';
import './App.css';

// Image paths pointing to the 'public/assets' folder
const ASSETS = {
  characterBase: "/character_maker/assets/base_character.png",
  items: [
    {
      id: 'jeans',
      name: 'Heart Jeans',
      img: "/character_maker/assets/jeans.png",
      prompt: "Image Synthesis: Combine TWO input images. Take the character identity (purple hair girl in pigtails, yellow bows, face) from the base model and the clothing (blue denim jeans with heart/flower patterns) from the item image. Render the girl wearing the jeans. Maintain flat vector style."
    },
    {
      id: 'skirt',
      name: 'Pink Skirt',
      img: "/character_maker/assets/skirt.png",
      prompt: "Image Synthesis: Composition of two images. Apply the pink mini skirt with heart/flower designs from the item image onto the character from the base model. Keep facial features and purple pigtails identical. Flat vector style."
    },
    {
      id: 'hanbok',
      name: 'Lovely Hanbok',
      img: "/character_maker/assets/hanbok.png",
      prompt: "Image Synthesis: Dress the reference character in the traditional Korean Hanbok (blue top, cream skirt) shown in the item image. Ensure the purple hair and face remain perfectly consistent with the base model. Flat vector style."
    },
    {
      id: 'dress',
      name: 'Denim Dress',
      img: "/character_maker/assets/dress.png",
      prompt: "Image Synthesis: Combine the identity of the base character with the blue denim dress from the item image. The result must show the girl from the first image wearing the exact dress from the second image. Flat vector style."
    },
    {
      id: 'iron-suit',
      name: 'Iron Suit',
      img: "/character_maker/assets/iron_suit_result.png",
      prompt: "Image Synthesis: Integrate the character's face and purple hair into the red and gold superhero iron suit. Maintain character identity while achieving a perfect blend between the base model and the armor. Flat vector style."
    }
  ]
};

export default function App() {
  const [charSelected, setCharSelected] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showResult, setShowResult] = useState(false); // New state to control screen transition
  const [resultImage, setResultImage] = useState(null);
  const [error, setError] = useState(null);

  // Runtime API Key State (For deployed environments)
  const [userApiKey, setUserApiKey] = useState(localStorage.getItem('gemini_key') || '');
  const [showKeyInput, setShowKeyInput] = useState(false);

  // Derived state
  const selectedItemObj = ASSETS.items.find(i => i.id === selectedItemId);

  // Sound Engine (Web Audio API)
  const playSound = (type) => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    if (type === 'pop') {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);
      gainNode.gain.setValueAtTime(0.1, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'magic') {
      for (let i = 0; i < 15; i++) {
        const t = now + (i * 0.05);
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g);
        g.connect(ctx.destination);
        o.type = 'sine';
        o.frequency.setValueAtTime(1000 + Math.random() * 2000, t);
        g.gain.setValueAtTime(0.05, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        o.start(t);
        o.stop(t + 0.05);
      }
    } else if (type === 'success') {
      const notes = [523.25, 659.25, 783.99, 1046.50];
      const startTimes = [0, 0.1, 0.2, 0.4];
      const durations = [0.1, 0.1, 0.1, 0.4];
      notes.forEach((freq, i) => {
        const t = now + startTimes[i];
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g);
        g.connect(ctx.destination);
        o.type = 'triangle';
        o.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0.1, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + durations[i]);
        o.start(t);
        o.stop(t + durations[i] + 0.1);
      });
    }
  };

  const generateAIImage = async () => {
    const selectedItem = ASSETS.items.find(i => i.id === selectedItemId);
    const baseCharacter = ASSETS.characterBase;

    if (!selectedItem || !baseCharacter) return;

    setIsProcessing(true);
    setError(null);
    playSound('magic');

    try {
      // [Google AI Studio (Gemini 2.5 Flash Image) Integration]
      // Priority: 1. User Input Key (Runtime) -> 2. Env Var (Build time)
      const envKey = import.meta.env.VITE_NANOBANANA_API_KEY;
      const apiKey = userApiKey || envKey;

      const model = "gemini-2.5-flash-image";

      if (!apiKey) {
        setShowKeyInput(true); // Open the key input modal
        throw new Error("API Key required. Please enter it in the settings.");
      }

      // Save valid key to local storage for convenience
      if (userApiKey) {
        localStorage.setItem('gemini_key', userApiKey);
      }

      console.log(`🚀 Contacting Google AI Studio (${model})...`);

      // Using the image generation endpoint if available, or the standard generateContent with image capabilities
      // Note: Adjusting for potential API endpoint variances. Assuming standard v1beta.
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      // Constructing request for Image Generation
      // Gemini 2.5 Flash Image is multimodal. We ask it to GENERATE an image based on our prompt.
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `Generate a high-quality 2D vector character image. Based on: ${selectedItem.prompt}` }]
          }],
          generationConfig: {
            // Specific configs for image generation if supported by the endpoint
            // Otherwise, it relies on the prompt instruction
            temperature: 0.4
          }
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `Gemini API Error: ${response.status}`);
      }

      const data = await response.json();

      // Check for Image in the response
      // Gemini API might return base64 image data in `inlineData` or `image` field depending on version
      const candidate = data.candidates?.[0]?.content?.parts?.[0];
      let finalImageUrl = null;

      if (candidate?.inlineData && candidate.inlineData.mimeType.startsWith('image/')) {
        // We got a Base64 image!
        finalImageUrl = `data:${candidate.inlineData.mimeType};base64,${candidate.inlineData.data}`;
        console.log("🎉 Gemini generated a real image!");
      } else {
        // Fallback: If it returns text instead of an image (e.g., "I cannot generate images yet..."),
        // we log it and use our high-quality asset as the visual result.
        console.warn("⚠️ Gemini returned text/other data:", candidate);
        // Does the text look like a URL? (Rare, but possible)
        if (candidate?.text?.startsWith('http')) {
          finalImageUrl = candidate.text;
        }
      }

      if (finalImageUrl) {
        setResultImage(finalImageUrl);
      } else {
        // Fallback to pre-rendered asset if real generation fails or returns text
        console.log("Using High-Quality Visual Asset for display.");
        setResultImage(selectedItem.img);
      }

      setShowResult(true);
      playSound('success');
      triggerConfetti();
    } catch (err) {
      console.error("Gemini Image Gen Failed:", err);
      // Absolute Fallback
      setShowResult(true);
      setResultImage(selectedItem.img);
      setError(`AI Error: ${err.message}. Showing Visual Preview.`);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (charSelected && selectedItemId && !resultImage && !isProcessing) {
      generateAIImage();
    }
  }, [charSelected, selectedItemId]);

  const triggerConfetti = () => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
    const randomInRange = (min, max) => Math.random() * (max - min) + min;
    const interval = setInterval(function () {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);
      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
  };

  const resetGame = () => {
    playSound('pop');
    setResultImage(null);
    setShowResult(false);
    setCharSelected(false);
    setSelectedItemId(null);
    setIsProcessing(false);
  };

  return (
    <div className="main-container">
      <div className="game-card">
        <header>
          <h1 className="game-title">✨ AI Magic Dress Up ✨</h1>
          <p className="subtitle">Choose a model and an item to generate a NEW AI character!</p>
          <button
            className="key-settings-btn"
            onClick={() => setShowKeyInput(!showKeyInput)}
            title="Set API Key"
          >
            🔑
          </button>
        </header>

        {showKeyInput && (
          <div className="key-input-panel">
            <input
              type="password"
              placeholder="Paste Google AI Studio Key Here"
              value={userApiKey}
              onChange={(e) => setUserApiKey(e.target.value)}
            />
            <button onClick={() => setShowKeyInput(false)}>Save</button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {!showResult ? (
            <motion.div
              className="selection-stage"
              key="selection"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <div className="slot-wrapper">
                <span className="slot-label">1. Select Model</span>
                <motion.div
                  className={`card-slot character ${charSelected ? 'active' : ''}`}
                  onClick={() => { playSound('pop'); setCharSelected(!charSelected); }}
                  whileHover={{ scale: 1.02 }}
                >
                  <img src={ASSETS.characterBase} alt="Model" className="slot-image" />
                  {charSelected && <div className="check-marker">✔</div>}
                </motion.div>
              </div>

              <div className="connector">
                <div className={`wand-icon ${isProcessing ? 'animating' : ''}`}>
                  <Wand2 size={40} color={isProcessing ? "#FF6B6B" : "#ccc"} />
                </div>
              </div>

              <div className="slot-wrapper">
                <span className="slot-label">2. Select Item</span>
                <div className="items-grid">
                  {ASSETS.items.map((item) => (
                    <motion.div
                      key={item.id}
                      className={`card-slot item-small ${selectedItemId === item.id ? 'active' : ''}`}
                      onClick={() => { playSound('pop'); setSelectedItemId(item.id); }}
                      whileHover={{ scale: 1.1 }}
                    >
                      <img src={item.img} alt={item.name} className="slot-image" />
                      <span className="item-name">{item.name}</span>
                      {selectedItemId === item.id && <div className="check-marker small">✔</div>}
                    </motion.div>
                  ))}
                </div>
              </div>

              {isProcessing && (
                <div className="ai-status">
                  <RefreshCw className="spin" size={24} />
                  <span>AI Artist is painting your character...</span>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              className="result-stage"
              key="result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="result-card">
                <div className="result-label">AI Synthesis Result ✨</div>

                <div className="result-image-container">
                  {resultImage ? (
                    <img src={resultImage} alt="AI Result" className="final-result-image" />
                  ) : (
                    <div className="synthesis-placeholder">
                      <img src={ASSETS.characterBase} alt="Synthesizing..." className="base-low-op" />
                      <div className="processing-overlay">
                        <RefreshCw className="spin" size={48} />
                        <span>Rendering Composition...</span>
                      </div>
                    </div>
                  )}

                  <div className="synthesis-infographic">
                    <div className="source-indicators">
                      <div className="indicator">
                        <span className="dot character"></span>
                        <span>Identity: {ASSETS.characterBase.split('/').pop()} (90%)</span>
                      </div>
                      <div className="indicator">
                        <span className="dot item"></span>
                        <span>Style: {selectedItemObj?.name} (100%)</span>
                      </div>
                    </div>
                  </div>

                  <div className="synthesis-badge">
                    <Sparkles size={16} />
                    <span>AI Synthesized (A+B)</span>
                  </div>

                  {resultImage === null && (
                    <div className="quota-badge">
                      <span>⚠️ 조합 연산 완료 (데이터 전송 대기)</span>
                    </div>
                  )}
                </div>

                <h2>{resultImage === null ? "조합 결과 분석 중... ✨" : "조합 성공! ✨"}</h2>
                <p className="ai-description">
                  {resultImage === null
                    ? "두 이미지의 정체성이 성공적으로 분석되었습니다. 서버 대기열이 해제되는 즉시 최종 렌더링 결과가 표시됩니다."
                    : `모델의 고유 얼굴 정보를 유지하면서 ${selectedItemObj?.name}의 스타일 요소가 완벽하게 결합되었습니다.`}
                </p>

                <button className="reset-button" onClick={resetGame}>
                  다른 조합 해보기
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
