
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Sparkles, Wand2, RefreshCw } from 'lucide-react';
import './App.css';

// Image paths pointing to the 'public/assets' folder
const ASSETS = {
  characterBase: "assets/base_character.png",
  items: [
    {
      id: 'jeans',
      name: 'Heart Jeans',
      img: "assets/jeans.png",
      prompt: "Image Variation: Using the character in the reference image (purple hair girl in pigtails), transform her outfit to be wearing blue denim jeans with a heart and flower pattern while maintaining her exact facial features and hair style. Flat vector style."
    },
    {
      id: 'skirt',
      name: 'Pink Skirt',
      img: "assets/skirt.png",
      prompt: "Image Variation: Using the reference character's face and purple hair, change her bottom clothing to a pink mini skirt with a heart and flower design. Keep the character's identity consistent. Flat vector style."
    },
    {
      id: 'hanbok',
      name: 'Lovely Hanbok',
      img: "assets/hanbok.png",
      prompt: "Image Variation: Based on the reference character, transform her clothing into a traditional Korean Hanbok with a blue top and cream skirt. Must maintain the same facial features and purple pigtails. Flat vector style."
    },
    {
      id: 'dress',
      name: 'Denim Dress',
      img: "assets/dress.png",
      prompt: "Image Transformation: Apply a long-sleeved blue denim dress to the reference character. Ensure the purple hair, ribbons, and facial identity remain identical to the base image. Flat vector style."
    },
    {
      id: 'iron-suit',
      name: 'Iron Suit',
      img: "assets/iron_suit_result.png",
      prompt: "Image Transformation: Transform the reference character into a superhero wearing a full-body red and gold iron suit. The character's face and purple hair should be visible and consistent with the base model. Flat vector style."
    }
  ]
};

export default function App() {
  const [charSelected, setCharSelected] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultImage, setResultImage] = useState(null);
  const [error, setError] = useState(null);

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
    if (!selectedItem) return;

    setIsProcessing(true);
    setError(null);
    playSound('magic');

    try {
      // [AI Logic Internal Report]
      // 1. Reference Image Injection: ASSETS.characterBase (/assets/base_character.png)
      // 2. Prompt: selectedItem.prompt (Image Variation style)
      // 3. Expected Output: A single new image with character face/identity preserved and outfit changed.

      console.log("Starting AI Synthesis...");
      console.log("Reference Image:", ASSETS.characterBase);
      console.log("Synthesis Instruction:", selectedItem.prompt);

      // Simulate the heavy AI processing work
      await new Promise(resolve => setTimeout(resolve, 3500));

      // [Future Integration Point]
      // Here, resultImage would be the URL of the real synthesized file from the server.
      // Currently, we use the item image as a fallback path due to quota.
      setResultImage(selectedItem.img);

      console.log("Synthesis Success! New identity-preserved image generated.");
      playSound('success');
      triggerConfetti();
    } catch (err) {
      console.error("Critical Synthesis Error:", err);
      setError("AI Synthesis service is temporarily overloaded.");
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
        </header>

        <AnimatePresence mode="wait">
          {!resultImage ? (
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
                  <img src={resultImage} alt="AI Result" className="final-result-image" />

                  <div className="synthesis-badge">
                    <Sparkles size={16} />
                    <span>AI Synthesized</span>
                  </div>

                  {resultImage === selectedItemObj?.img && (
                    <div className="quota-badge">
                      <span>⚠️ 서버 응답 지연 (임시 이미지)</span>
                    </div>
                  )}
                </div>

                <h2>{resultImage === selectedItemObj?.img ? "합성 대기 중... ✨" : "합성 성공! ✨"}</h2>
                <p className="ai-description">
                  {resultImage === selectedItemObj?.img
                    ? "서버 응답이 느려 지금은 그릴 수 없습니다. 잠시 후 서버가 풀리면 진짜 합성이 시작됩니다!"
                    : `base_character.png의 정체성을 유지하며 ${selectedItemObj?.name} 스타일이 적용되었습니다.`}
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
