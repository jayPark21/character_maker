import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Sparkles, Wand2, RefreshCw } from 'lucide-react';
import './App.css';

// Sound Effects Engine
const playSound = (type) => {
  const sounds = {
    pop: new Audio('https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3'),
    magic: new Audio('https://assets.mixkit.co/active_storage/sfx/2635/2635-preview.mp3'),
    success: new Audio('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3')
  };
  if (sounds[type]) {
    sounds[type].volume = 0.5;
    sounds[type].play().catch(e => console.log('Audio suspended', e));
  }
};

const ASSETS = {
  characterBase: '/assets/base_character.png',
  items: [
    {
      id: 'iron-suit',
      name: 'Iron Suit',
      img: '/assets/iron_suit_result.png',
      prompt: "Image Synthesis: Integrate the character's face and purple hair into the red and gold superhero iron suit. Maintain character identity while achieving a perfect blend between the base model and the armor. Flat vector style."
    },
    {
      id: 'hanbok',
      name: 'Lovely Hanbok',
      img: '/assets/hanbok.png',
      prompt: "Image Synthesis: Start with the base character (cute girl, purple pigtails). DRESS HER in a traditional Korean Hanbok (blue top, cream skirt). REPLACE her clothes but KEEP her exact face, hair, and pose. Flat 2D vector style."
    },
    {
      id: 'dress',
      name: 'Denim Dress',
      img: '/assets/dress.png',
      prompt: "Image Synthesis: Start with the base character (cute girl, purple pigtails). DRESS HER in a blue denim dress with heart patterns. REPLACE her clothes but KEEP her exact face and hair. Flat 2D vector style."
    },
    {
      id: 'jeans',
      name: 'Heart Jeans',
      img: '/assets/jeans.png',
      prompt: "Image Synthesis: Start with the base character (cute girl, purple pigtails). DRESS HER in a cute white t-shirt and heart-patterned jeans. REPLACE her clothes but KEEP her exact face and hair. Flat 2D vector style."
    }
  ]
};

export default function App() {
  const [charSelected, setCharSelected] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [resultImage, setResultImage] = useState(null);
  const [error, setError] = useState(null);

  // Derived state
  const selectedItemObj = ASSETS.items.find(i => i.id === selectedItemId);

  const generateAIImage = async () => {
    const selectedItem = ASSETS.items.find(i => i.id === selectedItemId);
    const baseCharacter = ASSETS.characterBase;

    if (!selectedItem || !baseCharacter) return;

    setIsProcessing(true);
    setError(null);
    playSound('magic');

    try {
      // [Vercel Serverless Function Call]
      // No API key needed on the client side! Secure & Clean.
      console.log("🚀 Requesting Vercel Serverless Function (/api/generate)...");

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: selectedItem.prompt })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server Error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.imageUrl) {
        setResultImage(data.imageUrl);
        console.log("🎉 Serverless AI Generation Success!");
      } else {
        throw new Error(data.error || "No image returned from server.");
      }

      setShowResult(true);
      playSound('success');
      triggerConfetti();
    } catch (err) {
      console.error("Serverless Gen Failed:", err);
      // Fallback
      setShowResult(true);
      setResultImage(selectedItem.img);
      setError(`Server Error: ${err.message}. Showing Preview.`);
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
        </header>

        <AnimatePresence mode="wait">
          {!showResult ? (
            <motion.div
              className="selection-stage"
              key="selection"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <div
                className={`character-box ${charSelected ? 'selected' : ''}`}
                onClick={() => { playSound('pop'); setCharSelected(true); }}
              >
                <div className="card-label">BASE MODEL</div>
                <img src={ASSETS.characterBase} alt="Base Character" className="character-img" />
                {charSelected && <div className="check-mark">✅</div>}
              </div>

              {charSelected && (
                <div className="items-grid">
                  {ASSETS.items.map((item) => (
                    <motion.div
                      key={item.id}
                      className="item-card"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => { playSound('pop'); setSelectedItemId(item.id); }}
                    >
                      <div className="item-img-wrapper">
                        <img src={item.img} alt={item.name} className="item-img" />
                      </div>
                      <div className="item-name">{item.name}</div>
                    </motion.div>
                  ))}
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
                  {resultImage && !isProcessing ? (
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

                  {error && (
                    <div className="synthesis-badge error">
                      ⚠️ {error}
                    </div>
                  )}

                  {!error && !isProcessing && (
                    <div className="synthesis-badge success">
                      <Sparkles size={16} /> AI Synthesized (A+B)
                    </div>
                  )}

                  <div className="source-indicators">
                    <div className="indicator">
                      <span className="dot source-a"></span>
                      <div className="text-group">
                        <span className="label">Identity:</span>
                        <span className="value">base_character.png (90%)</span>
                      </div>
                    </div>
                    <div className="indicator">
                      <span className="dot source-b"></span>
                      <div className="text-group">
                        <span className="label">Style: {selectedItemObj?.name}</span>
                        <span className="value">(100%)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {!isProcessing && (
                  <>
                    <h2 className="result-message">조합 성공! ✨</h2>
                    <p className="result-desc">
                      모델의 고유 얼굴 정보를 유지하면서 {selectedItemObj?.name}의 스타일 요소가 완벽하게 결합되었습니다.
                    </p>
                    <button className="reset-btn" onClick={resetGame}>
                      <Wand2 size={20} /> Try Another
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
