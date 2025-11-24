import React, { useState, useRef } from 'react';
import { Upload, Camera, Sparkles, Palette, Shirt, Info, AlertCircle, X, Check, Loader2 } from 'lucide-react';

// Import shared settings helper
const getSettings = () => {
  const envApiKey = import.meta.env.VITE_API_KEY || '';
  const envBaseUrl = import.meta.env.VITE_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai/';
  const envModel = import.meta.env.VITE_MODEL || 'gemini-1.5-flash';

  const saved = localStorage.getItem('pccs_app_settings');
  
  if (saved) {
    const parsed = JSON.parse(saved);
    return {
      baseUrl: parsed.baseUrl || envBaseUrl,
      apiKey: parsed.apiKey || envApiKey,
      model: parsed.model || envModel
    };
  }
  
  return {
    baseUrl: envBaseUrl,
    apiKey: envApiKey,
    model: envModel
  };
};

const SYSTEM_PROMPT = `
You are a professional Color Analyst and Personal Stylist with expertise in Seasonal Color Analysis. 

Your task is to analyze the image of the person provided and determine their Seasonal Color Analysis based on the 12-season flow system.

Use the following specific methodology to determine the season:

PART 1: EYE PATTERN ANALYSIS (The Specific Indicator)

Look closely at the iris pattern and rim:

1. WINTER EYES: Look for "Wheel" or "Spokes" (lines radiating from pupil) and a distinct dark rim (limbal ring). Whites are very bright.

2. SPRING EYES: Look for a "Sunburst" (golden/yellow starburst near pupil). Rim is distinct but separate from inner color. Eyes look "sparkling".

3. SUMMER EYES: Look for "Cracked Glass" or "Floral Petals" (soft, cloudy texture). Rim is soft/blended/grayish. Eyes look "dreamy".

4. AUTUMN EYES: Look for "Aztec Sun" or "Leopard Spots" (random rust/gold freckles). Pattern is irregular/earthy. Rim is warm.

PART 2: FEATURE CONTRAST & SHAPE

1. EYEBROWS: 
   - Thick/Dark/Defined = High Contrast (Winter/Autumn/Bright Spring).
   - Soft/Light/Ashy = Low Contrast (Summer/Light Spring/Soft Autumn).

2. LIPS:
   - High Pigment (Natural Red/Berry) = Cool (Winter/Summer).
   - Low Pigment (Peachy/Salmon/Nude) = Warm (Spring/Autumn).

3. FACE SHAPE:
   - Sharp/Angular = Winter/Autumn.
   - Round/Soft = Spring/Summer.

Based on these features, categorize the person into one of the 12 seasons:
- Winter: Cool Winter, Deep Winter, Clear Winter
- Summer: Cool Summer, Soft Summer, Light Summer
- Autumn: Warm Autumn, Soft Autumn, Deep Autumn
- Spring: Warm Spring, Light Spring, Clear Spring

Return ONLY a valid JSON object. Do not include markdown formatting like \`\`\`json.

IMPORTANT: The "reasoning" and "fashion_advice" fields MUST be written in Traditional Chinese (繁體中文). Write in a professional, expert tone as a color analyst. Use proper terminology and provide detailed, insightful analysis.

Structure:
{
  "season": "One of the 12 seasons listed above",
  "confidence": "High/Medium/Low",
  "reasoning": "專業分析：請以繁體中文詳細說明判斷依據，包括觀察到的眼部特徵（例如：是否看到輪輻狀或太陽爆裂狀）、對比度層級、唇色特徵等。使用專業色彩分析師的語調，提供深入且具洞察力的分析。",
  "characteristics": {
    "undertone": "Cool/Warm/Neutral",
    "contrast": "High/Medium/Low",
    "primary_feature": "e.g., Deep, Soft, Clear, Warm, Cool"
  },
  "palette": [
    {"name": "Color Name", "hex": "#HEXCODE", "reason": "Why this fits (in Traditional Chinese)"},
    {"name": "Color Name", "hex": "#HEXCODE", "reason": "Why this fits (in Traditional Chinese)"},
    {"name": "Color Name", "hex": "#HEXCODE", "reason": "Why this fits (in Traditional Chinese)"},
    {"name": "Color Name", "hex": "#HEXCODE", "reason": "Why this fits (in Traditional Chinese)"},
    {"name": "Color Name", "hex": "#HEXCODE", "reason": "Why this fits (in Traditional Chinese)"},
    {"name": "Color Name", "hex": "#HEXCODE", "reason": "Why this fits (in Traditional Chinese)"}
  ],
  "worst_colors": [
    {"name": "Color Name", "hex": "#HEXCODE"},
    {"name": "Color Name", "hex": "#HEXCODE"},
    {"name": "Color Name", "hex": "#HEXCODE"}
  ],
  "fashion_advice": "請以繁體中文提供專業的造型建議，包括根據對比度層級推薦的服裝風格、適合的飾品材質（銀飾或金飾）、以及化妝建議。使用專業色彩分析師的語調，提供具體且實用的建議。"
}
`;

export default function SeasonalColorAnalysis() {
  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) {
        setError("檔案太大。請使用 4MB 以下的圖片。");
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setImage(base64String);
        setPreviewUrl(reader.result);
        setResult(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async () => {
    const { baseUrl, apiKey, model } = getSettings();

    if (!apiKey) {
      setError("請先在設定中配置您的 API Key。");
      return;
    }
    if (!image) {
      setError("請先上傳一張圖片。");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      const endpoint = cleanBaseUrl.includes('chat/completions') 
        ? cleanBaseUrl 
        : `${cleanBaseUrl}/chat/completions`;

      const payload = {
        model: model,
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this person's seasonal color palette based on the system prompt." },
              {
                type: "image_url",
                image_url: {
                  url: image
                }
              }
            ]
          }
        ],
        temperature: 0.4,
        max_tokens: 1000
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP Error: ${response.status}`);
      }

      const data = await response.json();
      
      let content = data.choices?.[0]?.message?.content;
      
      if (!content) {
        throw new Error("Received empty response from API.");
      }

      const cleanJson = content.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedResult = JSON.parse(cleanJson);
      
      setResult(parsedResult);
    } catch (err) {
      console.error(err);
      setError(`分析失敗：${err.message}。請檢查您的設定和 API Key。`);
    } finally {
      setLoading(false);
    }
  };

  const resetApp = () => {
    setImage(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    if(fileInputRef.current) fileInputRef.current.value = "";
  };

  const ColorSwatch = ({ hex, name, reason }) => (
    <div className="flex flex-col group cursor-pointer">
      <div 
        className="h-20 w-full rounded-xl shadow-sm border border-gray-100 relative overflow-hidden transition-transform transform group-hover:scale-105"
        style={{ backgroundColor: hex }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all" />
      </div>
      <div className="mt-2 text-center">
        <p className="text-xs font-bold text-gray-800">{name}</p>
        <p className="text-[10px] text-gray-500 uppercase tracking-wide">{hex}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-50 text-slate-900 font-sans selection:bg-rose-100">
      
      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-12">

        {/* Hero & Upload Area */}
        {!result && (
          <div className="text-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">
                發現您的 <span className="text-rose-500">真實色彩</span>
              </h1>
              <p className="text-lg text-slate-600 max-w-xl mx-auto leading-relaxed">
                上傳一張自拍照，讓我們的 AI 造型師分析您的膚色、頭髮和眼睛，找出您完美的季節色彩調色板。
              </p>
            </div>

            <div className="relative max-w-md mx-auto">
              {/* Preview or Upload Box */}
              <div 
                className={`
                  relative aspect-[4/5] rounded-3xl overflow-hidden bg-white shadow-xl border-2 border-dashed transition-all
                  ${previewUrl ? 'border-rose-500' : 'border-stone-300 hover:border-rose-400 hover:bg-stone-50'}
                `}
              >
                {previewUrl ? (
                  <img src={previewUrl} alt="上傳預覽" className="w-full h-full object-cover" />
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer group">
                    <div className="p-6 bg-rose-50 rounded-full mb-4 group-hover:bg-rose-100 transition-colors">
                      <Camera className="w-10 h-10 text-rose-500" />
                    </div>
                    <span className="text-lg font-medium text-slate-700">上傳您的照片</span>
                    <span className="text-sm text-slate-400 mt-2">建議：自然光線，無化妝</span>
                    <input 
                      ref={fileInputRef}
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleImageUpload} 
                    />
                  </label>
                )}

                {previewUrl && (
                  <button 
                    onClick={resetApp}
                    className="absolute top-4 right-4 bg-white/90 p-2 rounded-full text-slate-600 hover:text-red-500 shadow-lg backdrop-blur-sm"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Action Button */}
              {previewUrl && !loading && (
                <button
                  onClick={analyzeImage}
                  className="mt-6 w-full bg-slate-900 hover:bg-slate-800 text-white py-4 px-8 rounded-xl font-semibold shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-1"
                >
                  <Sparkles className="w-5 h-5" />
                  分析我的色彩
                </button>
              )}
              
              {loading && (
                <div className="mt-6 w-full bg-slate-100 text-slate-500 py-4 px-8 rounded-xl font-medium flex items-center justify-center gap-2 animate-pulse">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  正在使用 AI 分析中...
                </div>
              )}

              {error && (
                <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-start gap-2 text-left">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">錯誤：</span> {error}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Results Section */}
        {result && (
          <div className="animate-in fade-in zoom-in-95 duration-500">
            {/* Header Result */}
            <div className="text-center mb-12">
              <span className="inline-block py-1 px-3 rounded-full bg-rose-100 text-rose-700 text-xs font-bold uppercase tracking-wider mb-3">
                分析完成
              </span>
              <h2 className="text-5xl font-bold text-slate-900 mb-4">{result.season}</h2>
              <p className="text-slate-600 max-w-2xl mx-auto text-lg leading-relaxed">
                {result.reasoning}
              </p>
            </div>

            <div className="grid md:grid-cols-12 gap-8">
              
              {/* Left Column: Image & Stats */}
              <div className="md:col-span-4 space-y-6">
                <div className="rounded-3xl overflow-hidden shadow-xl aspect-[3/4] relative">
                   <img src={previewUrl} alt="已分析的使用者" className="w-full h-full object-cover" />
                   <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-6 pt-20">
                      <div className="text-white">
                        <p className="text-xs opacity-80 uppercase tracking-widest">信心度</p>
                        <p className="font-semibold">{result.confidence}</p>
                      </div>
                   </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Info className="w-4 h-4 text-rose-500" />
                    關鍵特徵
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-stone-100">
                      <span className="text-slate-500 text-sm">基調</span>
                      <span className="font-medium text-slate-800">{result.characteristics.undertone}</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-stone-100">
                      <span className="text-slate-500 text-sm">對比度</span>
                      <span className="font-medium text-slate-800">{result.characteristics.contrast}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 text-sm">主導特質</span>
                      <span className="font-medium text-slate-800">{result.characteristics.primary_feature}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Palette & Advice */}
              <div className="md:col-span-8 space-y-8">
                
                {/* Best Colors */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-200">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                      <Palette className="w-6 h-6 text-rose-500" />
                      您的專屬調色板
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {result.palette.map((color, idx) => (
                      <ColorSwatch key={idx} {...color} />
                    ))}
                  </div>
                  <div className="mt-6 p-4 bg-stone-50 rounded-xl text-sm text-stone-600 italic">
                    這些色彩與您的自然特徵和諧，讓您的肌膚看起來更清透，眼睛更明亮。
                  </div>
                </div>

                {/* Fashion & Style */}
                <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl">
                  <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <Shirt className="w-6 h-6 text-rose-400" />
                    風格指南
                  </h3>
                  <p className="text-slate-300 leading-relaxed text-lg mb-6">
                    {result.fashion_advice}
                  </p>
                  
                  {result.worst_colors && (
                    <div className="border-t border-slate-700 pt-6">
                      <h4 className="text-sm font-semibold uppercase tracking-wider text-rose-400 mb-4">應避免的顏色</h4>
                      <div className="flex gap-3">
                        {result.worst_colors.map((color, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-slate-800 pr-3 rounded-full">
                            <div className="w-8 h-8 rounded-full border border-slate-600" style={{ backgroundColor: color.hex }}></div>
                            <span className="text-xs text-slate-300">{color.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button 
                  onClick={resetApp}
                  className="w-full py-4 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold hover:border-rose-500 hover:text-rose-600 transition-colors"
                >
                  分析另一張照片
                </button>

              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

