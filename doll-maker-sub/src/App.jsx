
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader, Wand2, RefreshCw, Sparkles, Plus, Zap, Heart, Star } from 'lucide-react';
import './App.css';

import baseCharacter from '/assets/base_character.png';
import ironSuit from '/assets/iron_suit_result.png';
import hanbok from '/assets/hanbok.png';
import dress from '/assets/dress.png';
import jeans from '/assets/jeans.png';

const ASSETS = {
  characterBase: baseCharacter,
  items: [
    {
      id: 'iron-suit',
      name: 'Iron Suit',
      img: ironSuit,
      prompt: "Image Synthesis: Integrate the character's face and purple hair into the red and gold superhero iron suit. Maintain character identity while achieving a perfect blend between the base model and the armor. Flat vector style."
    },
    {
      id: 'hanbok',
      name: 'Lovely Hanbok',
      img: hanbok,
      prompt: "Image Synthesis: Integrate the character's face and purple hair into a traditional Korean Hanbok dress, pastel blue and pink colors. Maintain character identity. Professional vector illustration."
    },
    {
      id: 'denim-dress',
      name: 'Denim Dress',
      img: dress,
      prompt: "Image Synthesis: Integrate the character's face and purple hair into a cute blue denim dress with flower embroidery. Maintain character identity. Clean flat vector style."
    },
    {
      id: 'heart-jeans',
      name: 'Heart Jeans',
      img: jeans,
      prompt: "Image Synthesis: Integrate the character's face and purple hair into a white t-shirt with a red heart and cute blue jeans with heart patterns. Maintain character identity. Detailed vector art."
    }
  ]
};

const LOADING_MESSAGES = [
  "마법 가루를 뿌리는 중입니다... ✨",
  "AI 코디네이터가 열심히 옷을 입히고 있어요! 👗",
  "화면 속 캐릭터가 부끄러워하며 옷을 갈아입는 중... 😊",
  "픽셀 하나하나 정성스럽게 칠하고 있습니다! 🎨",
  "슈퍼 컴퓨터가 대표님의 안목에 감탄하는 중! 🚀",
  "거의 다 됐습니다! 눈을 감고 소원을 빌어보세요... 🌠"
];

const ITEM_LOADING_MESSAGES = [
  "🚧 새로운 디자인 스케치 중... (인형 아님)",
  "🧵 원단 재단 및 바느질 중... (옷만 만듬)",
  "🎨 세상에 없던 스타일 연구 중...",
  "✨ 마네킹에 피팅해 보는 중...",
  "🎁 대표님을 위한 신상 아이템 준비 완료 임박!"
];

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
  const [selectedModel, setSelectedModel] = useState('original');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isItemGenerating, setIsItemGenerating] = useState(false); // [New]
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [resultImage, setResultImage] = useState(null);
  const [error, setError] = useState(null);

  // [New Workflow States]
  const [previewItem, setPreviewItem] = useState(null); // Newly generated item before saving

  // Cycle loading messages
  useEffect(() => {
    let interval;
    if (isProcessing || isItemGenerating) {
      interval = setInterval(() => {
        setLoadingMsgIdx((prev) => {
          const limit = isItemGenerating ? ITEM_LOADING_MESSAGES.length : LOADING_MESSAGES.length;
          return (prev + 1) % limit;
        });
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isProcessing, isItemGenerating]);

  // Sound Effects
  const playSound = (type) => {
    // Placeholder for sound logic
  };

  const handleGenerate = async (targetItem) => {
    const item = targetItem || selectedItem;
    if (!item) return;

    setIsProcessing(true);
    setLoadingMsgIdx(0);
    setError(null);
    playSound('magic');

    try {
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

      console.log("🚀 Requesting AI Synthesis...");

      const finalPrompt = item.isCustom
        ? `Action: Change clothing. New Outfit: ${item.name}. Style: Cute 2D Vector. Context: Keep the character's face and hair purely unchanged.`
        : item.prompt;

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

  const handleAddItem = async () => {
    if (!newItemName.trim()) return;

    setIsProcessing(false); // 확실하게 캐릭터 생성 모드 끄기
    setIsItemGenerating(true); // 아이템 전용 로딩 시작
    setLoadingMsgIdx(0);
    setError(null);
    playSound('magic');

    try {
      console.log("👗 Step 1: Generating Item Preview Only...");
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: newItemName
          // image를 보내지 않으므로 API가 "아이템 단독 모드"로 작동합니다.
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate item image');
      }

      const data = await response.json();
      if (data.success && data.imageUrl) {
        // 프리뷰 창을 띄웁니다 (인형은 변하지 않습니다!)
        setPreviewItem({
          name: newItemName,
          img: data.imageUrl
        });
        playSound('success');
      }
    } catch (err) {
      console.error("Item Generation Error:", err);
      setError(err.message);
    } finally {
      setIsItemGenerating(false);
    }
  };

  const confirmAddItem = () => {
    if (!previewItem) return;

    // 옷장에 저장!
    const newId = `custom-${Date.now()}`;
    const newItem = {
      id: newId,
      name: previewItem.name,
      img: previewItem.img,
      isCustom: true
    };

    setItems([newItem, ...items]);
    setNewItemName('');
    setPreviewItem(null); // 프리뷰 닫기
    playSound('pop');

    // 이제부터 이 아이템을 선택하면 옷을 갈아입습니다!
  };

  const handleItemSelect = (item) => {
    setSelectedItem(item);
    playSound('click');

    // 2. 아이템 카드를 선택하는 순간 바로 생성 시작!
    if (selectedModel) {
      handleGenerate(item);
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
          <div
            className={`character-box ${selectedModel === 'original' ? 'selected' : ''}`}
            onClick={() => { setSelectedModel('original'); playSound('click'); }}
            style={{ cursor: 'pointer' }}
          >
            <img src={ASSETS.characterBase} alt="Base Character" className="character-img" />
            <div className="char-label">Original Model</div>
            {selectedModel === 'original' && (
              <div className="selection-tick top-right"><Check size={14} /></div>
            )}
          </div>
        </div>

        {/* Right: Wardrobe */}
        <div className="wardrobe-section">

          {/* New Item Input Area */}
          <div className="add-item-box">
            <input
              type="text"
              placeholder="직접 입력 (예: 노란색 우비)"
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
              <motion.div
                key={item.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`item-card ${selectedItem?.id === item.id ? 'selected' : ''}`}
                onClick={() => handleItemSelect(item)}
              >
                <div className="item-img-wrapper">
                  <img src={item.img} alt={item.name} className="item-img" />
                  {selectedItem?.id === item.id && (
                    <div className="selection-tick"><Check size={14} /></div>
                  )}
                </div>
                <span className="item-name">{item.name}</span>
              </motion.div>
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
          onClick={() => handleGenerate()}
          disabled={isProcessing || !selectedItem || !selectedModel}
        >
          {isProcessing ? '생성 중...' : '✨ 캐릭터 만들기! ✨'}
        </button>
      </div>

      {/* Loading Overlay (Gamification) */}
      <AnimatePresence>
        {(isProcessing || isItemGenerating) && (
          <motion.div
            className="loading-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="loading-content">
              <div className="magic-circle">
                <motion.div
                  className="spinner-outer"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  style={{ borderColor: isItemGenerating ? '#4ECDC4' : 'var(--primary)' }}
                />
                <motion.div
                  className="spinner-inner"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
                <div className="character-silhouette">
                  {isItemGenerating ? <Plus size={48} className="wand-icon" /> : <Wand2 size={48} className="wand-icon" />}
                </div>
              </div>

              <motion.h2
                key={loadingMsgIdx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="loading-text"
              >
                {isItemGenerating ? ITEM_LOADING_MESSAGES[loadingMsgIdx] : LOADING_MESSAGES[loadingMsgIdx]}
              </motion.h2>

              <div className="loading-bar-container">
                <motion.div
                  className="loading-bar-fill"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 15, ease: "easeInOut" }}
                  style={{ background: isItemGenerating ? 'linear-gradient(to right, #4ECDC4, #45B7AF)' : 'linear-gradient(to right, var(--secondary), var(--primary))' }}
                />
              </div>

              <div className="loading-tips">
                <Sparkles size={16} /> <span>{isItemGenerating ? "대표님을 위한 세상에 하나뿐인 옷을 디자인 중입니다!" : "최첨단 AI가 전용 코디를 준비 중입니다!"}</span>
              </div>
            </div>

            {/* Random Floating Icons for Gamification Effect */}
            <div className="floating-particles">
              {[...Array(10)].map((_, i) => (
                <motion.div
                  key={i}
                  className="particle"
                  initial={{
                    x: Math.random() * window.innerWidth,
                    y: window.innerHeight + 100,
                    opacity: 0
                  }}
                  animate={{
                    y: -100,
                    opacity: [0, 1, 0],
                    rotate: 360
                  }}
                  transition={{
                    duration: Math.random() * 3 + 2,
                    repeat: Infinity,
                    delay: Math.random() * 2
                  }}
                >
                  {i % 3 === 0 ? <Star size={20} color="#FFD93D" /> : i % 3 === 1 ? <Heart size={20} color="#FF6B6B" /> : <Zap size={20} color="#4ECDC4" />}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Item Preview Modal (Newly added) */}
      <AnimatePresence>
        {previewItem && (
          <motion.div
            className="result-overlay item-preview-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="result-card item-preview-card">
              <div className="result-header">
                <span className="result-title">새로운 아이템 탄생! ✨</span>
                <button className="close-btn" onClick={() => setPreviewItem(null)}>X</button>
              </div>

              <div className="result-image-container item-only-preview">
                <img src={previewItem.img} alt="Generated Item" className="final-result-image" />
                <div className="synthesis-badge">디자인 완료</div>
              </div>

              <div className="item-preview-info">
                <h3>{previewItem.name}</h3>
                <p>이 아이템을 옷장에 저장할까요?</p>
              </div>

              <div className="preview-actions">
                <button className="save-btn" onClick={confirmAddItem}>
                  <Check size={18} /> 옷장에 저장하기
                </button>
                <button className="cancel-btn" onClick={() => setPreviewItem(null)}>
                  다시 입력하기
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
                <span className="result-title">AI 합성 결과! ✨</span>
                <button className="close-btn" onClick={() => setResultImage(null)}>X</button>
              </div>

              <div className="result-image-container">
                <img src={resultImage} alt="Generated Character" className="final-result-image" />
                <div className="synthesis-badge success">성공적으로 생성됨</div>
              </div>

              <div className="result-info">
                <div className="score-badge">정확도: 98% | 스타일: 100% | 운수: 대길! 🧧</div>
                <p>캐릭터 베이스: 원본 유지 (95%)</p>
                <p>추가 스타일: {selectedItem?.name} (적용완료)</p>
              </div>

              <h3>변신 완료! 🔥</h3>
              <p>대표님의 센스있는 선택으로 새로운 캐릭터가 탄생했습니다. 정말 멋지네요!</p>

              <button className="reset-btn" onClick={() => { setResultImage(null); setSelectedItem(null); }}>
                <RefreshCw size={18} /> 다른 옷 입히기
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
