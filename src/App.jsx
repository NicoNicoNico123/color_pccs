import React, { useState, useEffect, useMemo } from 'react';
import { BookOpen, HelpCircle, Trophy, ChevronRight, Check, X, Info, Sparkles, Bot, Loader2, ArrowRight, Settings, Save } from 'lucide-react';

// --- OpenAI / Compatible API Helper ---

// Helper to read settings safely, prioritizing Environment Variables
const getSettings = () => {
  // 1. Try to read from Environment Variables (import.meta.env for Vite)
  const envApiKey = import.meta.env.VITE_API_KEY || '';
  const envBaseUrl = import.meta.env.VITE_BASE_URL || 'https://models.inference.ai.azure.com';
  const envModel = import.meta.env.VITE_MODEL || 'gpt-4o';

  // 2. Check Local Storage (User Overrides)
  const saved = localStorage.getItem('pccs_app_settings');
  
  if (saved) {
    const parsed = JSON.parse(saved);
    return {
      baseUrl: parsed.baseUrl || envBaseUrl,
      apiKey: parsed.apiKey || envApiKey,
      model: parsed.model || envModel
    };
  }
  
  // 3. Return Environment Defaults
  return {
    baseUrl: envBaseUrl,
    apiKey: envApiKey,
    model: envModel
  };
};

const callOpenAI = async (prompt, systemInstruction = "") => {
  const { baseUrl, apiKey, model } = getSettings();

  if (!apiKey) {
    return "錯誤：未偵測到 API Key。請設定環境變數 (VITE_API_KEY) 或在設定選單中手動輸入。";
  }

  // Ensure baseUrl doesn't end with a slash for consistency
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  
  // GitHub Models and some proxies don't use /v1/chat/completions structure exactly the same, 
  // but standard OpenAI SDK compatibility usually implies /chat/completions is appended to the base.
  // If the user provides a full URL in env, we might need to handle that, but assuming standard base here.
  const url = cleanBaseUrl.includes('chat/completions') ? cleanBaseUrl : `${cleanBaseUrl}/chat/completions`;
  
  const payload = {
    model: model,
    messages: [
      { role: "system", content: systemInstruction },
      { role: "user", content: prompt }
    ],
    temperature: 0.7,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(`API Error: ${response.status} ${errData.error?.message || ''}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "無法產生回應。";
  } catch (error) {
    console.error("LLM Call Failed:", error);
    return `錯誤: ${error.message}`;
  }
};

// --- PCCS Data & Logic ---

const TONES = [
  { id: 'v',   name: 'Vivid',         label: '01 Vivid',         s: 100, l: 50,  desc: '純粹、飽和、鮮豔' },
  { id: 'b',   name: 'Bright',        label: '02 Bright',        s: 85,  l: 65,  desc: '愉悅、清晰' },
  { id: 's',   name: 'Strong',        label: '03 Strong',        s: 70,  l: 45,  desc: '動感、強烈' },
  { id: 'dp',  name: 'Deep',          label: '04 Deep',          s: 80,  l: 30,  desc: '傳統、深奧' },
  { id: 'lt',  name: 'Light',         label: '05 Light',         s: 55,  l: 75,  desc: '舒適、清新' },
  { id: 'sf',  name: 'Soft',          label: '06 Soft',          s: 40,  l: 60,  desc: '溫柔、自然' },
  { id: 'd',   name: 'Dull',          label: '07 Dull',          s: 40,  l: 45,  desc: '穩重、樸實' },
  { id: 'dk',  name: 'Dark',          label: '08 Dark',          s: 50,  l: 25,  desc: '成熟、穩健' },
  { id: 'p',   name: 'Pale',          label: '09 Pale',          s: 25,  l: 88,  desc: '精緻、輕盈' },
  { id: 'ltg', name: 'Light Grayish', label: '10 Light Grayish', s: 15,  l: 70,  desc: '平靜、柔和' },
  { id: 'g',   name: 'Grayish',       label: '11 Grayish',       s: 15,  l: 45,  desc: '寧靜、別緻' },
  { id: 'dkg', name: 'Dark Grayish',  label: '12 Dark Grayish',  s: 10,  l: 25,  desc: '厚重、堅實' },
];

const HUES = [
  { id: 2,  name: '紅色 (Red)',           h: 355 },
  { id: 4,  name: '紅橙色 (Red-Orange)',    h: 15 },
  { id: 6,  name: '橙色 (Orange)',        h: 35 },
  { id: 8,  name: '黃色 (Yellow)',        h: 50 },
  { id: 10, name: '黃綠色 (Yellow-Green)',  h: 75 },
  { id: 12, name: '綠色 (Green)',         h: 120 },
  { id: 14, name: '藍綠色 (Blue-Green)',    h: 160 },
  { id: 16, name: '綠藍色 (Green-Blue)',    h: 180 },
  { id: 18, name: '藍色 (Blue)',          h: 210 },
  { id: 20, name: '藍紫色 (Violet)',        h: 260 },
  { id: 22, name: '紫色 (Purple)',        h: 290 },
  { id: 24, name: '紅紫色 (Red-Purple)',    h: 320 },
];

const generateColor = (tone, hue) => {
  let adjustedL = tone.l;
  if ((hue.h > 30 && hue.h < 60) && tone.l < 50) { 
    adjustedL += 5; 
  }
  return {
    id: `${tone.id}-${hue.id}`,
    toneId: tone.id,
    toneName: tone.name,
    toneLabel: tone.label,
    hueName: hue.name,
    css: `hsl(${hue.h}, ${tone.s}%, ${adjustedL}%)`,
    desc: tone.desc
  };
};

const generateFullDeck = () => {
  let deck = [];
  TONES.forEach(tone => HUES.forEach(hue => deck.push(generateColor(tone, hue))));
  return deck;
};

// --- Components ---

const SettingsModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState(getSettings());
  const [showSuccess, setShowSuccess] = useState(false);

  // Reload settings when modal opens to capture any background updates
  useEffect(() => {
    if (isOpen) setFormData(getSettings());
  }, [isOpen]);

  const handleSave = (e) => {
    e.preventDefault();
    localStorage.setItem('pccs_app_settings', JSON.stringify(formData));
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      onClose();
    }, 1000);
  };

  const handleReset = () => {
    localStorage.removeItem('pccs_app_settings');
    setFormData(getSettings()); // Will reload from Env if available
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Settings size={20} /> API 設定
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="mb-4 p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start gap-2">
          <Info size={16} className="mt-0.5 shrink-0" />
          <p>
            系統優先讀取環境變數 (Environment Variables)。
            若您已在 .env 設定，此處可留空或作為覆蓋使用。
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Base URL</label>
            <input 
              type="text" 
              value={formData.baseUrl}
              onChange={e => setFormData({...formData, baseUrl: e.target.value})}
              placeholder="https://models.inference.ai.azure.com"
              className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">API Key</label>
            <input 
              type="password" 
              value={formData.apiKey}
              onChange={e => setFormData({...formData, apiKey: e.target.value})}
              placeholder="sk-..."
              className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Model Name</label>
            <input 
              type="text" 
              value={formData.model}
              onChange={e => setFormData({...formData, model: e.target.value})}
              placeholder="gpt-4o"
              className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
            />
          </div>

          <div className="flex gap-2 pt-2">
             <button 
              type="button" 
              onClick={handleReset}
              className="px-4 py-3 rounded-xl font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all"
            >
              重置
            </button>
            <button 
              type="submit" 
              className={`flex-1 py-3 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 ${showSuccess ? 'bg-emerald-500' : 'bg-slate-900 hover:bg-slate-800'}`}
            >
              {showSuccess ? <><Check size={18} /> 已儲存</> : <><Save size={18} /> 儲存設定</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Header = ({ currentTab, setTab, onOpenSettings }) => (
  <header className="bg-slate-900 text-white p-4 shadow-lg sticky top-0 z-40">
    <div className="max-w-4xl mx-auto flex justify-between items-center">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded bg-gradient-to-br from-pink-500 via-red-500 to-yellow-500 flex items-center justify-center font-bold text-xs shadow-inner text-white">
          PCCS
        </div>
        <h1 className="font-bold text-xl tracking-tight hidden sm:block">色彩大師 (Color Mastery)</h1>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="flex bg-slate-800 rounded-lg p-1 mr-2">
          <button onClick={() => setTab('learn')} className={`p-2 sm:px-3 rounded-md text-sm font-medium transition-all ${currentTab === 'learn' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
            <BookOpen size={16} className="sm:mr-2 inline" /><span className="hidden sm:inline">圖鑑</span>
          </button>
          <button onClick={() => setTab('quiz')} className={`p-2 sm:px-3 rounded-md text-sm font-medium transition-all ${currentTab === 'quiz' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}>
            <HelpCircle size={16} className="sm:mr-2 inline" /><span className="hidden sm:inline">測驗</span>
          </button>
          <button onClick={() => setTab('ai')} className={`p-2 sm:px-3 rounded-md text-sm font-medium transition-all ${currentTab === 'ai' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}>
            <Sparkles size={16} className="sm:mr-2 inline" /><span className="hidden sm:inline">AI</span>
          </button>
        </div>
        
        <button 
          onClick={onOpenSettings}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          title="API 設定"
        >
          <Settings size={20} />
        </button>
      </div>
    </div>
  </header>
);

const ToneRow = ({ tone }) => {
  const colors = HUES.map(hue => generateColor(tone, hue));
  return (
    <div className="mb-8 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="font-bold text-lg text-slate-800">{tone.label}</h3>
          <p className="text-slate-500 text-sm">{tone.desc}</p>
        </div>
        <div className="flex gap-2 text-xs font-mono text-slate-400">
          <span className="bg-white px-2 py-1 rounded border">S: {tone.s}%</span>
          <span className="bg-white px-2 py-1 rounded border">L: {tone.l}%</span>
        </div>
      </div>
      <div className="grid grid-cols-6 sm:grid-cols-12 h-24 sm:h-20">
        {colors.map(c => (
          <div key={c.id} className="h-full w-full group relative" style={{ backgroundColor: c.css }}>
            <div className="opacity-0 group-hover:opacity-100 absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-200">
              <span className="text-white text-[10px] text-center font-medium px-1">{c.hueName.split(' ')[0]}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ReferenceView = () => (
  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex items-start gap-3">
      <Info className="text-blue-500 mt-0.5 flex-shrink-0" size={20} />
      <div>
        <h3 className="font-semibold text-blue-900 text-sm">PCCS 色調系統</h3>
        <p className="text-blue-700 text-sm mt-1">
          PCCS (Practical Color Coordinate System) 將飽和度與明度結合成「色調 (Tone)」。
          在參加測驗前，請利用此圖表記憶每個類別的感覺。
        </p>
      </div>
    </div>
    {TONES.map(tone => <ToneRow key={tone.id} tone={tone} />)}
  </div>
);

// --- AI Components ---

const AIContextButton = ({ toneName, hueName, onResult }) => {
  const [loading, setLoading] = useState(false);
  const [tip, setTip] = useState(null);

  const getAdvice = async () => {
    setLoading(true);
    try {
      const prompt = `請針對 PCCS 色調 "${toneName}" 中的 ${hueName} 變體提供簡潔的設計建議（最多 2 句話）。請提及一個理想的應用場景（例如：「科技業的 Logo」或「嬰兒房牆面」）。請用繁體中文回答，避免過於艱澀的術語，著重於情感應用。`;
      const result = await callOpenAI(prompt, "You are a helpful design assistant.");
      setTip(result);
      onResult?.();
    } catch (e) {
      setTip("無法聯繫 AI。請檢查 API Key 設定！");
    } finally {
      setLoading(false);
    }
  };

  if (tip) {
    return (
      <div className="mt-4 p-4 bg-purple-50 border border-purple-100 rounded-xl text-left animate-in fade-in slide-in-from-top-2">
        <div className="flex items-center gap-2 mb-1 text-purple-700 font-bold text-xs uppercase tracking-wider">
          <Sparkles size={12} /> AI 設計建議
        </div>
        <p className="text-slate-700 text-sm leading-relaxed">{tip}</p>
      </div>
    );
  }

  return (
    <button
      onClick={getAdvice}
      disabled={loading}
      className="mt-4 w-full py-2 bg-gradient-to-r from-violet-100 to-fuchsia-100 hover:from-violet-200 hover:to-fuchsia-200 text-purple-700 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 border border-purple-200"
    >
      {loading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
      {loading ? "正在詢問 AI..." : "詢問 AI 設計建議"}
    </button>
  );
};

const AILabView = () => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleMatch = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    setResult(null);

    const prompt = `
      You are a color expert using the PCCS (Practical Color Coordinate System). The user wants a color tone for: "${input}".
      Map this request to exactly ONE of these 12 IDs: 'v' (Vivid), 'b' (Bright), 's' (Strong), 'dp' (Deep), 'lt' (Light), 'sf' (Soft), 'd' (Dull), 'dk' (Dark), 'p' (Pale), 'ltg' (Light Grayish), 'g' (Grayish), 'dkg' (Dark Grayish).
      
      Return ONLY valid JSON in this format: 
      { "id": "code", "reasoning": "short explanation of why this tone fits the user's text, in Traditional Chinese (Taiwan)" }
    `;

    try {
      const rawText = await callOpenAI(prompt, "You are a color matching expert who speaks JSON.");
      const jsonStr = rawText.replace(/```json|```/g, '').trim();
      const data = JSON.parse(jsonStr);
      
      const tone = TONES.find(t => t.id === data.id);
      if (tone) {
        setResult({ tone, reasoning: data.reasoning });
      } else {
        throw new Error("Invalid tone ID returned");
      }
    } catch (err) {
      setResult({ error: "抱歉，無法為該描述找到合適的色調。請檢查您的 API 設定或嘗試更簡單的描述！" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Bot size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">AI 氛圍配色 (Mood Matcher)</h2>
        <p className="text-slate-500">描述一種感覺、專案或季節，AI 將為您找到完美的 PCCS 色調。</p>
        <p className="text-xs text-slate-400">請確保已設定 API Key</p>
      </div>

      <form onSubmit={handleMatch} className="relative">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="例如：「台北的雨後午後」或「復古咖啡廳」"
          className="w-full p-4 pr-12 rounded-xl border-2 border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition-all text-lg shadow-sm"
        />
        <button 
          type="submit"
          disabled={loading || !input}
          className="absolute right-2 top-2 bottom-2 bg-purple-600 text-white rounded-lg px-4 font-medium hover:bg-purple-700 disabled:opacity-50 disabled:hover:bg-purple-600 transition-colors flex items-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : <ArrowRight size={20} />}
        </button>
      </form>

      {result && !result.error && (
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-purple-100 animate-in zoom-in-95 duration-300">
          <div className="p-6 bg-gradient-to-br from-purple-50 to-white">
            <p className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-2">AI 推薦</p>
            <h3 className="text-3xl font-bold text-slate-900 mb-2">{result.tone.label}</h3>
            <p className="text-slate-600 text-lg mb-6 leading-relaxed">"{result.reasoning}"</p>
            
            <div className="space-y-4">
              <p className="text-sm font-medium text-slate-400 uppercase">範例配色 ({result.tone.name} Tone)</p>
              <div className="grid grid-cols-6 h-16 rounded-lg overflow-hidden ring-1 ring-black/5">
                {[0, 2, 4, 6, 8, 10].map(idx => {
                  const c = generateColor(result.tone, HUES[idx]);
                  return <div key={c.id} className="h-full w-full" style={{ backgroundColor: c.css }} title={c.hueName} />;
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {result && result.error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-xl text-center border border-red-100">
          {result.error}
        </div>
      )}
    </div>
  );
};

// --- Quiz Components ---

const Flashcard = ({ card, onGuess, showAnswer, isCorrect, selectedOption, nextCard }) => {
  const options = useMemo(() => {
    const distractors = TONES
      .filter(t => t.id !== card.toneId)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);
    const correctTone = TONES.find(t => t.id === card.toneId);
    return [...distractors, correctTone].sort(() => 0.5 - Math.random());
  }, [card]);

  const [tipKey, setTipKey] = useState(0);
  useEffect(() => setTipKey(k => k + 1), [card]);

  return (
    <div className="max-w-md mx-auto w-full">
      <div className="relative aspect-square sm:aspect-video w-full rounded-2xl shadow-xl mb-6 transition-all duration-300 transform"
           style={{ backgroundColor: card.css }}>
        
        {showAnswer && (
          <div className={`absolute inset-0 flex items-center justify-center flex-col bg-black/30 backdrop-blur-sm rounded-2xl animate-in zoom-in duration-300 p-4`}>
            {isCorrect ? (
              <div className="bg-emerald-500 text-white p-3 rounded-full mb-2 shadow-lg scale-75">
                <Check size={32} strokeWidth={4} />
              </div>
            ) : (
              <div className="bg-red-500 text-white p-3 rounded-full mb-2 shadow-lg scale-75">
                <X size={32} strokeWidth={4} />
              </div>
            )}
            <div className="bg-white/95 w-full max-w-sm px-6 py-4 rounded-xl shadow-2xl text-center backdrop-blur-md">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">正確答案 (Correct Answer)</p>
              <h2 className="text-2xl font-bold text-slate-900 mb-1">{card.toneLabel}</h2>
              <p className="text-slate-500 text-sm mb-3">{card.toneName} - {card.hueName}</p>
              
              <div key={tipKey}>
                <AIContextButton toneName={card.toneName} hueName={card.hueName} />
              </div>

              <button 
                onClick={nextCard}
                className="mt-4 w-full py-3 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                下一個顏色 <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {!showAnswer && (
        <>
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-slate-800">辨識色調 (Identify the Tone)</h2>
            <p className="text-slate-500 text-sm">選擇最符合此顏色的類別。</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => onGuess(opt.id)}
                className="p-4 rounded-xl border-2 text-left transition-all duration-200 bg-white border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-700 shadow-sm hover:shadow-md"
              >
                <span className="text-lg font-semibold block">{opt.label}</span>
                <span className="text-xs opacity-70">{opt.desc}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const QuizView = () => {
  const [deck, setDeck] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    setDeck(generateFullDeck().sort(() => 0.5 - Math.random()));
  }, []);

  const handleGuess = (toneId) => {
    const currentCard = deck[currentCardIndex];
    const isCorrect = toneId === currentCard.toneId;
    setSelectedOption(toneId);
    setShowAnswer(true);

    if (isCorrect) {
      setScore(s => s + 10);
      setStreak(s => {
        const newStreak = s + 1;
        setBestStreak(b => Math.max(b, newStreak));
        return newStreak;
      });
      setHistory(h => [...h.slice(-4), true]);
    } else {
      setStreak(0);
      setHistory(h => [...h.slice(-4), false]);
    }
  };

  const nextCard = () => {
    setShowAnswer(false);
    setSelectedOption(null);
    setCurrentCardIndex(prev => (prev + 1) % deck.length);
  };

  if (deck.length === 0) return <div className="p-12 text-center text-slate-500">正在載入 PCCS 引擎...</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6 bg-slate-900 text-white p-4 rounded-xl shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-800 rounded-lg">
            <Trophy className="text-yellow-400" size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase font-bold">分數 (Score)</p>
            <p className="font-mono text-xl font-bold">{score}</p>
          </div>
        </div>
        <div className="flex gap-1">
          {history.map((res, i) => (
            <div key={i} className={`w-2 h-8 rounded-full ${res ? 'bg-emerald-500' : 'bg-red-500'}`} />
          ))}
        </div>
        <div className="text-right">
           <p className="text-xs text-slate-400 uppercase font-bold">連勝 (Streak)</p>
           <p className="font-mono text-xl font-bold text-emerald-400 flex items-center justify-end gap-1">
             {streak} <span className="text-xs text-slate-500 font-normal">/ 最佳: {bestStreak}</span>
           </p>
        </div>
      </div>

      <Flashcard 
        card={deck[currentCardIndex]} 
        onGuess={handleGuess}
        showAnswer={showAnswer}
        isCorrect={selectedOption === deck[currentCardIndex].toneId}
        selectedOption={selectedOption}
        nextCard={nextCard}
      />
    </div>
  );
};

export default function App() {
  const [currentTab, setTab] = useState('learn');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-12">
      <Header 
        currentTab={currentTab} 
        setTab={setTab} 
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
      
      <main className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        {currentTab === 'learn' && <ReferenceView />}
        {currentTab === 'quiz' && <QuizView />}
        {currentTab === 'ai' && <AILabView />}
      </main>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </div>
  );
}

