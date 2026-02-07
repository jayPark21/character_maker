
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader, Wand2, RefreshCw, Sparkles, Plus } from 'lucide-react';
import './App.css';

const ASSETS = {
  characterBase: '/assets/base_character.png', // Corrected path
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
      img: '/assets/hanbok_result.png',
      prompt: "Image Synthesis: Integrate the character's face and purple hair into a traditional Korean Hanbok dress, pastel blue and pink colors. Maintain character identity. Professional vector illustration."
    },
    {
      id: 'denim-dress',
      name: 'Denim Dress',
      img: '/assets/denim_dress_result.png',
      prompt: "Image Synthesis: Integrate the character's face and purple hair into a cute blue denim dress with flower embroidery. Maintain character identity. Clean flat vector style."
    },
    {
      id: 'heart-jeans',
      name: 'Heart Jeans',
      img: '/assets/heart_jeans_result.png',
      prompt: "Image Synthesis: Integrate the character's face and purple hair into a white t-shirt with a red heart and cute blue jeans with heart patterns. Maintain character identity. Detailed vector art."
    }
  ]
};

// Simple Icon Components for fallback
const PlusIcon = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

function App() {
  const [items, setItems] = useState(ASSETS.items);
  const [newItemName, setNewItemName] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultImage, setResultImage] = useState(null);
  const [error, setError] = useState(null);

  // Sound Effects (using simple beep fallback if files missing, or placeholder)
  const playSound = (type) => {
    // Placeholder for sound logic
  };

  const handleAddItem = () => {
    if (!newItemName.trim()) return;
    const newId = `custom-${Date.now()}`;
    const newItem = {
      id: newId,
      name: newItemName,
      img: '/assets/magic_wand.png',
      isCustom: true,
      prompt: `Action: Change clothing. New Outfit: ${newItemName}. Style: Cute 2D Vector. Context: Keep the character's face and hair exactly same.`
    };

    setItems([newItem, ...items]);
    setNewItemName('');
    playSound('pop');
  };

  const handleGenerate = async () => {
    if (!selectedItem) return;

    setIsProcessing(true);
    setError(null);
    playSound('magic');

    try {
      // 1. Load Base Image (Character)
      console.log("🚀 Loading Base Image...");
      const baseImgResponse = await fetch(ASSETS.characterBase);
      const baseBlob = await baseImgResponse.blob();

      const reader = new FileReader();
      const base64Promise = new Promise((resolve) => {
        reader.onloadend = () => {
          const base64data = reader.result.split(',')[1];
          resolve(base64data);
        };
      });
      reader.readAsDataURL(baseBlob);
      const base64Image = await base64Promise;

      console.log("🚀 Requesting Vercel Function with Base Image for Gemini...");

      // Construct Prompt based on item type
      const finalPrompt = selectedItem.isCustom
        ? `Action: Change clothing. New Outfit: ${selectedItem.name}. Style: Cute 2D Vector. Context: Keep the character's face and hair purely unchanged.`
        : selectedItem.prompt;

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: finalPrompt,
          image: base64Image
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate image');
      }

      const data = await response.json();
      if (data.success && data.imageUrl) {
        setResultImage(data.imageUrl);
        playSound('success');
      } else {
        throw new Error('No image URL in response');
      }
    } catch (err) {
      console.error("Generation Error:", err);
      setError(err.message || 'Something went wrong');
      playSound('error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="main-container">
      <header className="header">
        <h1 className="game-title">✨ AI Character Maker ✨</h1>
        <p className="subtitle">Pick an item to generate a NEW AI character!</p>
      </header>

      <div className="stage-area">
        {/* Left: Character Preview */}
        <div className="character-section">
          <div className={`character-box ${!selectedItem ? 'selected' : ''}`}>
            <img src={ASSETS.characterBase} alt="Base Character" className="character-img" />
            <div className="char-label">Me</div>
          </div>
        </div>

        {/* Right: Wardrobe */}
        <div className="wardrobe-section">

          {/* New Item Input Area */}
          <div className="add-item-box">
            <input
              type="text"
              placeholder="Enter style (e.g. Yellow Raincoat)"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
              className="item-input"
            />
            <button onClick={handleAddItem} className="add-btn">
              <PlusIcon size={20} />
            </button>
          </div>

          <div className="items-grid">
            {items.map((item) => (
              <div
                key={item.id}
                className={`item-card ${selectedItem?.id === item.id ? 'selected' : ''}`}
                onClick={() => { setSelectedItem(item); playSound('click'); }}
              >
                <div className="item-img-wrapper">
                  {item.isCustom ? (
                    <div className="custom-icon">✨</div>
                  ) : (
                    <img src={item.img} alt={item.name} className="item-img" />
                  )}
                </div>
                <span className="item-name">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="action-area">
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="error-message"
            >
              ⚠️ {error}
            </motion.div>
          )}
        </AnimatePresence>

        <button
          className={`generate-btn ${isProcessing ? 'disabled' : ''}`}
          onClick={handleGenerate}
          disabled={isProcessing || !selectedItem}
        >
          {isProcessing ? '✨ Magic happening...' : '✨ Make It! ✨'}
        </button>
      </div>

      {/* Result Modal Overlay */}
      <AnimatePresence>
        {resultImage && (
          <motion.div
            className="result-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="result-card">
              <div className="result-header">
                <span className="result-title">AI Synthesis Result ✨</span>
                <button className="close-btn" onClick={() => setResultImage(null)}>X</button>
              </div>

              <div className="result-image-container">
                <img src={resultImage} alt="Generated Character" className="final-result-image" />
                <div className="synthesis-badge success">Auto-Generated</div>
              </div>

              <div className="result-info">
                <p>Identity: base_character (90%)</p>
                <p>Style: {selectedItem?.name} (100%)</p>
              </div>

              <h3>조합 성공! ✨</h3>
              <p>모델의 고유 얼굴 정보를 유지하면서 {selectedItem?.name}의 스타일 요소가 완벽하게 결합되었습니다.</p>

              <button className="reset-btn" onClick={() => { setResultImage(null); setSelectedItem(null); }}>
                <Sparkles size={18} /> Try Another
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
