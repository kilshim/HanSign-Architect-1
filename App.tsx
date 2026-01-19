import React, { useState, useRef, useMemo, useEffect } from 'react';
import SignaturePad, { SignaturePadHandle } from './components/SignaturePad';
import Controls from './components/Controls';
import { DrawingOptions, DrawingMode } from './types';
import { Info, Settings2, Shuffle } from 'lucide-react';

interface FontDef {
    name: string;
    family: string;
    lang: 'ko' | 'en';
}

// Extended list with English Cursive fonts
const SIGNATURE_FONTS: FontDef[] = [
  // English Cursive (High Priority for English inputs)
  { name: 'Herr Von Muellerhoff', family: '"Herr Von Muellerhoff", cursive', lang: 'en' },
  { name: 'Great Vibes', family: '"Great Vibes", cursive', lang: 'en' },
  { name: 'Mrs Saint Delafield', family: '"Mrs Saint Delafield", cursive', lang: 'en' },
  { name: 'Alex Brush', family: '"Alex Brush", cursive', lang: 'en' },
  { name: 'Pinyon Script', family: '"Pinyon Script", cursive', lang: 'en' },
  { name: 'Sacramento', family: '"Sacramento", cursive', lang: 'en' },

  // Korean Fonts
  { name: 'Nanum Pen Script', family: '"Nanum Pen Script", cursive', lang: 'ko' },
  { name: 'Nanum Brush Script', family: '"Nanum Brush Script", cursive', lang: 'ko' },
  { name: 'Gowun Batang', family: '"Gowun Batang", serif', lang: 'ko' },
  { name: 'Yeon Sung', family: '"Yeon Sung", cursive', lang: 'ko' },
  { name: 'East Sea Dokdo', family: '"East Sea Dokdo", cursive', lang: 'ko' },
  { name: 'Dokdo', family: '"Dokdo", cursive', lang: 'ko' },
  { name: 'Hi Melody', family: '"Hi Melody", cursive', lang: 'ko' },
  { name: 'Gaegu', family: '"Gaegu", cursive', lang: 'ko' },
  { name: 'Gamja Flower', family: '"Gamja Flower", cursive', lang: 'ko' },
  { name: 'Single Day', family: '"Single Day", cursive', lang: 'ko' },
  { name: 'Cute Font', family: '"Cute Font", cursive', lang: 'ko' },
  { name: 'Poor Story', family: '"Poor Story", cursive', lang: 'ko' },
  { name: 'Sunflower', family: '"Sunflower", sans-serif', lang: 'ko' },
  { name: 'Black And White Picture', family: '"Black And White Picture", sans-serif', lang: 'ko' },
  { name: 'Jua', family: '"Jua", sans-serif', lang: 'ko' },
  
  // New Additions
  { name: 'Kirang Haerang', family: '"Kirang Haerang", display', lang: 'ko' },
  { name: 'Song Myung', family: '"Song Myung", serif', lang: 'ko' },
  { name: 'Stylish', family: '"Stylish", sans-serif', lang: 'ko' },
  { name: 'Dongle', family: '"Dongle", sans-serif', lang: 'ko' },
  { name: 'Gugi', family: '"Gugi", display', lang: 'ko' },
  { name: 'Do Hyeon', family: '"Do Hyeon", sans-serif', lang: 'ko' },
  { name: 'Gowun Dodum', family: '"Gowun Dodum", sans-serif', lang: 'ko' },
  { name: 'Hahmlet', family: '"Hahmlet", serif', lang: 'ko' },
  { name: 'Diphylleia', family: '"Diphylleia", serif', lang: 'ko' },
  { name: 'Moirai One', family: '"Moirai One", display', lang: 'ko' },
];

const App: React.FC = () => {
  const padRef = useRef<SignaturePadHandle>(null);
  const [mode, setMode] = useState<DrawingMode>('draw');
  const [textSignature, setTextSignature] = useState('');
  const [currentFontIndex, setCurrentFontIndex] = useState(0);
  const [showMobileControls, setShowMobileControls] = useState(false);
  
  const [options, setOptions] = useState<DrawingOptions>({
    color: '#000000',
    minWidth: 1.5,
    maxWidth: 2.5, // Default thickness for text
    smoothing: 0.5,
    streamline: 0.6,
    tool: 'pen'
  });

  // Detect if the input contains Korean characters
  const isKorean = useMemo(() => /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(textSignature), [textSignature]);

  // Filter fonts based on input language
  const availableFonts = useMemo(() => {
      if (textSignature.length === 0) return SIGNATURE_FONTS; // Show all by default
      if (isKorean) {
          return SIGNATURE_FONTS.filter(f => f.lang === 'ko');
      } else {
          // For English, show English fonts first
          return SIGNATURE_FONTS; 
      }
  }, [isKorean, textSignature]);

  // Reset font index if it goes out of bounds when list changes
  useEffect(() => {
      setCurrentFontIndex(0);
  }, [isKorean]);

  const currentFont = availableFonts[currentFontIndex] || availableFonts[0];

  const handleClear = () => {
    if (mode === 'draw') {
        padRef.current?.clear();
    } else {
        setTextSignature('');
    }
  };

  const handleReplay = () => {
    if (mode === 'draw') padRef.current?.replay();
  };

  const handleRegenerateStyle = () => {
    setCurrentFontIndex((prev) => (prev + 1) % availableFonts.length);
  };

  const handleDownload = () => {
    if (mode === 'draw') {
        padRef.current?.download('png');
    } else {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
            canvas.width = 1200; 
            canvas.height = 600;
            
            ctx.fillStyle = options.color;
            ctx.strokeStyle = options.color;
            // Scale stroke width relative to the download canvas size (roughly 2x logic)
            // options.maxWidth is visually calibrated for screen, so we boost it slightly for hi-res export
            ctx.lineWidth = Math.max(0, options.maxWidth - 1); 
            ctx.lineJoin = 'round';
            ctx.miterLimit = 2;
            
            // Dynamic sizing logic
            let fontSize = 180;
            const extraLargeFonts = [
                'Nanum Brush Script', 
                'Black And White Picture', 
                'East Sea Dokdo', 
                'Mrs Saint Delafield', 
                'Herr Von Muellerhoff',
                'Kirang Haerang' // New: Brush style needs size
            ];
            
            const largeFonts = [
                'Cute Font', 
                'Gaegu', 
                'Great Vibes', 
                'Alex Brush',
                'Dongle', // New: Very small naturally
                'Stylish' // New
            ];
            
            const mediumFonts = ['Jua', 'Sunflower', 'Do Hyeon', 'Gugi'];

            if (extraLargeFonts.includes(currentFont.name)) {
                fontSize = 250; 
            } else if (largeFonts.includes(currentFont.name)) {
                fontSize = 200;
            } else if (mediumFonts.includes(currentFont.name)) {
                fontSize = 150;
            }

            ctx.font = `${fontSize}px ${currentFont.family}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Render
            ctx.save();
            ctx.translate(canvas.width / 2, canvas.height / 2);
            // Slight tilt only for handwriting styles
            if (currentFont.lang === 'ko' || currentFont.name.includes('Brush') || currentFont.name.includes('Vibes') || currentFont.name === 'Kirang Haerang') {
                ctx.rotate(-4 * Math.PI / 180); 
            }
            
            // Draw fill then stroke to simulate weight
            ctx.fillText(textSignature || 'Signature', 0, 0);
            if (options.maxWidth > 1.0) {
                ctx.strokeText(textSignature || 'Signature', 0, 0);
            }
            
            ctx.restore();
            
            const link = document.createElement('a');
            link.download = `signature_${currentFont.name.replace(/\s/g, '_')}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        }
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50 text-gray-900 font-sans overflow-hidden">
      {/* Header */}
      <header className="flex-none h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between z-10 shadow-sm md:shadow-none">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-brand-500/20 shadow-lg">
            서
          </div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">HanSign <span className="text-gray-400 font-normal">Architect</span></h1>
        </div>
        <div className="hidden md:flex items-center gap-4 text-sm text-gray-500">
           <span>Korean Digital Signature Studio</span>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col md:flex-row relative overflow-hidden">
        
        {/* Canvas Area - Always Visible */}
        <div className="flex-1 relative bg-slate-100 flex items-center justify-center p-4 md:p-8 overflow-hidden">
            
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                 style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
            </div>

            <div className="relative w-full max-w-4xl h-[400px] md:h-[500px] bg-white rounded-xl shadow-2xl shadow-gray-200/50 overflow-hidden ring-1 ring-gray-200">
                {mode === 'draw' ? (
                    <>
                        <SignaturePad 
                            ref={padRef} 
                            options={options} 
                        />
                        <div className="absolute bottom-4 left-4 pointer-events-none opacity-40">
                            <span className="font-handwriting text-2xl text-gray-400 select-none">Sign Here</span>
                        </div>
                    </>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-8">
                        <div style={{ position: 'relative' }}>
                            <input 
                                type="text" 
                                value={textSignature}
                                onChange={(e) => setTextSignature(e.target.value)}
                                placeholder="Type Name"
                                className="w-full max-w-2xl bg-transparent border-b-2 border-gray-200 text-center text-5xl md:text-7xl focus:border-brand-500 focus:outline-none placeholder-gray-300 transition-colors py-8 relative z-10"
                                style={{ 
                                    color: options.color,
                                    fontFamily: currentFont.family,
                                    lineHeight: 1.5,
                                    textShadow: options.maxWidth > 1.5 
                                        ? `0 0 ${options.maxWidth - 1}px ${options.color}` 
                                        : 'none'
                                }}
                            />
                        </div>

                         {/* Quick Actions (Mobile Friendly) */}
                         <button
                            onClick={handleRegenerateStyle}
                            className="mt-6 flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-full shadow-lg shadow-brand-500/20 transition-all active:scale-95"
                         >
                            <Shuffle size={18} />
                            <span className="font-medium">Next Style</span>
                         </button>

                         <div className="text-gray-400 text-xs flex items-center gap-1.5 mt-4 opacity-60">
                            <Info size={12} />
                            <span>{currentFont.name}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Mobile Settings Toggle FAB - Moved to Top Right */}
            <button
                onClick={() => setShowMobileControls(true)}
                className="md:hidden absolute top-4 right-4 z-20 w-12 h-12 bg-white text-gray-700 rounded-full shadow-lg flex items-center justify-center border border-gray-200 active:scale-95 transition-transform hover:text-brand-600"
                aria-label="Open Settings"
            >
                <Settings2 size={24} />
            </button>
        </div>

        {/* Backdrop for mobile */}
        {showMobileControls && (
            <div 
                className="fixed inset-0 bg-black/20 z-30 md:hidden backdrop-blur-[1px] transition-opacity"
                onClick={() => setShowMobileControls(false)}
            />
        )}

        {/* Sidebar Controls - Side Drawer on Mobile (from right), Sidebar on Desktop */}
        <div className={`
            fixed top-0 right-0 h-full z-40 bg-white shadow-2xl 
            transition-transform duration-300 ease-out border-l border-gray-100
            w-80 max-w-[85vw]
            md:static md:translate-x-0 md:shadow-xl
            ${showMobileControls ? 'translate-x-0' : 'translate-x-full'}
        `}>
             <Controls 
                options={options} 
                onChange={setOptions} 
                onClear={handleClear}
                onReplay={handleReplay}
                onDownload={handleDownload}
                onRegenerateStyle={handleRegenerateStyle}
                currentFontName={currentFont.name}
                mode={mode}
                setMode={setMode}
                onClose={() => setShowMobileControls(false)}
             />
        </div>
      </main>

      {/* Footer - Visible on all devices now */}
      <footer className="flex flex-none bg-white border-t border-gray-200 py-2 items-center justify-center z-10">
        <a 
            href="https://xn--design-hl6wo12cquiba7767a.com/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-gray-400 hover:text-brand-600 transition-colors font-medium"
        >
            떨림과울림Design.com
        </a>
      </footer>
    </div>
  );
};

export default App;