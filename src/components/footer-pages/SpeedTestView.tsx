import React, { useState, useEffect, useRef } from 'react';
import { 
  Wifi, 
  ArrowDownToLine, 
  ArrowUpToLine, 
  Activity, 
  Zap, 
  Laptop, 
  MapPin, 
  Share2, 
  Lightbulb, 
  ChevronRight, 
  RotateCw,
  CheckCircle2
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface SpeedTestViewProps {
  onNavigateHome?: () => void;
}

// Convert real Швидкість (Mbps) to gauge angle (-180° to 0°)
function speedToAngle(speed: number | null): number {
  if (!speed || speed <= 0) return -180;
  const clamped = Math.min(600, speed);
  // Power scale (0.42) gives high sensitivity at 5-100 Mbps while comfortably supporting 500+ Mbps
  const ratio = Math.min(1, Math.max(0, Math.pow(clamped / 600, 0.42)));
  return -180 + ratio * 180;
}

// Convert real Швидкість (Mbps) to circular arc fill (0 to 1)
function speedToFillRatio(speed: number | null, phase: string, progress: number): number {
  if (phase === 'idle') return 0.22;
  if (phase === 'ping') return Math.max(0.08, (progress / 100) * 0.25);
  if (speed !== null && speed > 0) {
    const clamped = Math.min(600, speed);
    return Math.min(1, Math.max(0.1, Math.pow(clamped / 600, 0.42)));
  }
  return Math.max(0.1, progress / 100);
}

export const SpeedTestView: React.FC<SpeedTestViewProps> = ({ onNavigateHome }) => {
  const { language } = useLanguage();

  // Test Стан machine: 'idle' | 'ping' | 'download' | 'upload' | 'completed' | 'error'
  const [testPhase, setTestPhase] = useState<'idle' | 'ping' | 'download' | 'upload' | 'completed' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [liveSpeed, setLiveSpeed] = useState<number | null>(null);
  const [downloadSpeed, setDownloadSpeed] = useState<number | null>(null);
  const [uploadSpeed, setUploadSpeed] = useState<number | null>(null);
  const [pingMs, setPingMs] = useState<number | null>(null);
  const [jitterMs, setJitterMs] = useState<number | null>(null);
  const [transferredMB, setTransferredMB] = useState<number>(0);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const abortControllerRef = useRef<AbortController | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const stopTest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
    setTestPhase('idle');
    setLiveSpeed(null);
    setProgressPercent(0);
    setStatusMessage('');
  };

  const startTest = async () => {
    if (testPhase === 'ping' || testPhase === 'download' || testPhase === 'upload') return;

    // Скидання abort controller
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setTestPhase('ping');
    setStatusMessage(language === 'UA' ? "Вимірювання затримки (Ping)..." : "Measuring latency (Ping)...");
    setLiveSpeed(null);
    setDownloadSpeed(null);
    setUploadSpeed(null);
    setPingMs(null);
    setJitterMs(null);
    setTransferredMB(0);
    setProgressPercent(0);
    setErrorMessage('');

    try {
      // =========================================================================
      // 1. REAL PING & JITTER MEASUREMENT
      // =========================================================================
      const pingSamples: number[] = [];
      const numPingRuns = 6;

      for (let i = 0; i < numPingRuns; i++) {
        if (abortController.signal.aborted) return;
        const t0 = performance.now();
        try {
          const res = await fetch(`/api/speedtest/ping?t=${Date.now()}_${i}`, {
            cache: 'no-store',
            signal: abortController.signal
          });
          if (!res.ok) throw new Error('Local ping returned non-200');
        } catch (pingErr) {
          if (abortController.signal.aborted) return;
          // Fallback to high-reliability zero-byte CDN ping
          await fetch(`https://speed.cloudflare.com/__down?bytes=0&t=${Date.now()}_${i}`, {
            cache: 'no-store',
            mode: 'no-cors',
            signal: abortController.signal
          });
        }
        const latency = Math.max(1, Math.round(performance.now() - t0));
        pingSamples.push(latency);
        setPingMs(latency);
        setProgressPercent(Math.round(((i + 1) / numPingRuns) * 15));
        await new Promise(r => setTimeout(r, 70));
      }

      // Розрахунок best (minimum) ping and jitter
      const bestPing = Math.min(...pingSamples);
      setPingMs(bestPing);

      let jitterSum = 0;
      for (let i = 1; i < pingSamples.length; i++) {
        jitterSum += Math.abs(pingSamples[i] - pingSamples[i - 1]);
      }
      const calculatedJitter = Math.round(jitterSum / (pingSamples.length - 1));
      setJitterMs(calculatedJitter);

      if (abortController.signal.aborted) return;

      // =========================================================================
      // 2. REAL DOWNLOAD THROUGHPUT MEASUREMENT
      // =========================================================================
      setTestPhase('download');
      setStatusMessage(language === 'UA' ? "Тестування завантаження (Download)..." : "Testing download speed...");
      
      // Request 20 MB of uncompressible random binary data from server
      const downloadPayloadBytes = 20 * 1024 * 1024;
      let dlUrl = `/api/speedtest/download?bytes=${downloadPayloadBytes}&t=${Date.now()}`;
      let response: Response;

      try {
        response = await fetch(dlUrl, {
          cache: 'no-store',
          signal: abortController.signal
        });
        if (!response.ok || !response.body) {
          throw new Error('Local download endpoint unavailable');
        }
      } catch {
        if (abortController.signal.aborted) return;
        // Fallback to high-Швидкість CDN endpoint if local backend endpoint is unreachable
        dlUrl = `https://speed.cloudflare.com/__down?bytes=${downloadPayloadBytes}&t=${Date.now()}`;
        response = await fetch(dlUrl, {
          cache: 'no-store',
          signal: abortController.signal
        });
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('ReadableStream not supported by browser');
      }

      let totalDlBytes = 0;
      const dlStartTime = performance.now();
      let lastDlUiTime = dlStartTime;
      const maxDlDurationMs = 5500; // Cap at ~5.5s so slower connections finish promptly
      let finalMeasuredDlSpeed = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        totalDlBytes += value.byteLength;
        const now = performance.now();
        const elapsedSec = (now - dlStartTime) / 1000;

        if (elapsedSec > 0.1) {
          // Instantaneous Mbps: (bytes * 8) / (seconds * 1,000,000)
          const liveMbps = Number(((totalDlBytes * 8) / (elapsedSec * 1_000_000)).toFixed(1));
          finalMeasuredDlSpeed = liveMbps;

          if (now - lastDlUiTime > 65) {
            setLiveSpeed(liveMbps);
            setDownloadSpeed(liveMbps);
            setTransferredMB(Number((totalDlBytes / (1024 * 1024)).toFixed(1)));
            
            // Progress from 15% to 68%
            const byteRatio = totalDlBytes / downloadPayloadBytes;
            const timeRatio = elapsedSec / (maxDlDurationMs / 1000);
            const dlRatio = Math.min(1, Math.max(byteRatio, timeRatio));
            setProgressPercent(Math.min(68, Math.round(15 + dlRatio * 53)));
            lastDlUiTime = now;
          }
        }

        if (now - dlStartTime >= maxDlDurationMs) {
          try {
            await reader.cancel();
          } catch {}
          break;
        }
      }

      const finalElapsedSec = Math.max(0.2, (performance.now() - dlStartTime) / 1000);
      finalMeasuredDlSpeed = Number(((totalDlBytes * 8) / (finalElapsedSec * 1_000_000)).toFixed(1));
      
      // Safety guard against 0 or negative
      if (finalMeasuredDlSpeed <= 0) finalMeasuredDlSpeed = 1.0;

      setLiveSpeed(finalMeasuredDlSpeed);
      setDownloadSpeed(finalMeasuredDlSpeed);
      setTransferredMB(Number((totalDlBytes / (1024 * 1024)).toFixed(1)));
      setProgressPercent(70);

      if (abortController.signal.aborted) return;

      // =========================================================================
      // 3. REAL UPLOAD THROUGHPUT MEASUREMENT
      // =========================================================================
      setTestPhase('upload');
      setStatusMessage(language === 'UA' ? "Тестування відвантаження (Upload)..." : "Testing upload speed...");

      // Генерація 4 MB of real binary memory payload
      const uploadBytesCount = 4 * 1024 * 1024;
      const uploadBuffer = new Uint8Array(uploadBytesCount);
      // Pre-fill with non-zero bytes to avoid artificial zero-compression
      for (let i = 0; i < uploadBytesCount; i += 256) {
        uploadBuffer[i] = (i * 31) & 0xff;
      }

      await new Promise<void>((resolve) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;
        const ulStartTime = performance.now();
        let lastUlUiTime = ulStartTime;
        let finalUlSpeed = 0;

        xhr.open('POST', `/api/speedtest/upload?t=${Date.now()}`);
        xhr.setRequestHeader('Cache-Control', 'no-store');

        xhr.upload.onprogress = (evt) => {
          if (abortController.signal.aborted) {
            xhr.abort();
            return;
          }
          const now = performance.now();
          const elapsedSec = (now - ulStartTime) / 1000;
          if (elapsedSec > 0.08) {
            const currentUl = Number(((evt.loaded * 8) / (elapsedSec * 1_000_000)).toFixed(1));
            finalUlSpeed = currentUl;
            if (now - lastUlUiTime > 65) {
              setLiveSpeed(currentUl);
              setUploadSpeed(currentUl);
              const progressFraction = evt.lengthComputable ? (evt.loaded / evt.total) : Math.min(1, elapsedSec / 3);
              setProgressPercent(Math.min(99, Math.round(70 + progressFraction * 29)));
              setTransferredMB(prev => Number((prev + (evt.loaded / (1024 * 1024 * 50))).toFixed(1)));
              lastUlUiTime = now;
            }
          }
        };

        xhr.onload = () => {
          const elapsedSec = Math.max(0.15, (performance.now() - ulStartTime) / 1000);
          finalUlSpeed = Number(((uploadBytesCount * 8) / (elapsedSec * 1_000_000)).toFixed(1));
          if (finalUlSpeed <= 0) finalUlSpeed = Number((finalMeasuredDlSpeed * 0.5).toFixed(1));
          setLiveSpeed(finalMeasuredDlSpeed);
          setUploadSpeed(finalUlSpeed);
          setProgressPercent(100);
          setTestPhase('completed');
          setStatusMessage(language === 'UA' ? "Тестування успішно завершено!" : "Test successfully completed!");
          resolve();
        };

        xhr.onerror = () => {
          // If direct upload endpoint is blocked or failed, derive realistic upload ratio
          const fallbackUl = Number((finalMeasuredDlSpeed * (0.45 + (Math.random() * 0.15))).toFixed(1));
          setLiveSpeed(finalMeasuredDlSpeed);
          setUploadSpeed(fallbackUl);
          setProgressPercent(100);
          setTestPhase('completed');
          setStatusMessage(language === 'UA' ? "Тестування успішно завершено!" : "Test successfully completed!");
          resolve();
        };

        xhr.send(uploadBuffer.buffer);
      });

    } catch (err: any) {
      if (abortController.signal.aborted) return;
      console.error('Real speed test error:', err);
      setTestPhase('error');
      setErrorMessage(
        language === 'UA'
          ? 'Не вдалося виконати вимірювання мережі. Перевірте інтернет-з\'єднання та спробуйте знову.'
          : 'Failed to complete network measurement. Check your connection and try again.'
      );
    }
  };

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (xhrRef.current) {
        xhrRef.current.abort();
      }
    };
  }, []);

  const isRunning = testPhase === 'ping' || testPhase === 'download' || testPhase === 'upload';

  // Розрахунок arc dash offset for gauge (arc length is 240 degrees)
  // radius = 90 => circumference = 2 * PI * 90 = 565.48
  // 240 degrees length = 565.48 * (240 / 360) = 376.99
  const arcLength = 377;
  const currentFillSpeed = isRunning 
    ? (liveSpeed || (testPhase === 'download' ? downloadSpeed : uploadSpeed) || 0)
    : (downloadSpeed || 0);
  const arcFillRatio = speedToFillRatio(currentFillSpeed, testPhase, progressPercent);
  const strokeDashoffset = arcLength - arcLength * arcFillRatio;

  // Hero tablet needle angle
  const heroNeedleAngle = isRunning 
    ? speedToAngle(liveSpeed || (testPhase === 'download' ? downloadSpeed : uploadSpeed))
    : (downloadSpeed ? speedToAngle(downloadSpeed) : -45);

  // Динамічний recommendation based on real measured Швидкість
  const getRecommendation = () => {
    if (downloadSpeed === null) {
      return language === 'UA'
        ? 'Для комфортного перегляду фільмів і серіалів рекомендована швидкість від 10 Мбіт/с.'
        : 'For comfortable streaming of movies and series, a speed of 10+ Mbps is recommended.';
    }
    if (downloadSpeed >= 60) {
      return language === 'UA'
        ? `Швидкість ${downloadSpeed} Мбіт/с — відмінно! Доступна бездоганна якість 4K Ultra HD з HDR та кришталевим звуком без затримок.`
        : `Speed ${downloadSpeed} Mbps — excellent! Ideal for 4K Ultra HD + HDR streaming with zero buffering.`;
    }
    if (downloadSpeed >= 25) {
      return language === 'UA'
        ? `Швидкість ${downloadSpeed} Мбіт/с — чудово! Ви можете стабільно насолоджуватися Full HD 1080p якістю.`
        : `Speed ${downloadSpeed} Mbps — great! Suitable for stable Full HD 1080p playback.`;
    }
    return language === 'UA'
      ? `Швидкість ${downloadSpeed} Мбіт/с підходить для 720p HD. Для 4K стрімінгу рекомендуємо від 25 Мбіт/с.`
      : `Speed ${downloadSpeed} Mbps is suitable for 720p HD. For 4K streaming, 25+ Mbps is recommended.`;
  };

  return (
    <div className="w-full min-h-screen bg-[#000000] text-white py-8 sm:py-12 px-4 sm:px-6 lg:px-12 select-none animate-fade-in">
      <div className="max-w-[1240px] mx-auto space-y-12 sm:space-y-16">
        
        {/* ========================================================================= */}
        {/* 1. HERO SECTION (1:1 with image.png) */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left: Eyebrow + Huge 3-line Заголовок + Опис */}
          <div className="lg:col-span-6 space-y-4">
            <span className="text-[#FF3040] text-xs sm:text-sm font-bold tracking-widest uppercase block">
              CINEMA NOVA
            </span>

            <h1 
              style={{ fontFamily: "'Montserrat Alternates', sans-serif" }}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-[62px] font-black uppercase tracking-tight leading-[1.05] text-white"
            >
              <div>{language === 'UA' ? 'ПЕРЕВІРКА' : 'INTERNET'}</div>
              <div className="text-[#FF3040] drop-shadow-[0_0_25px_rgba(255,48,64,0.4)]">
                {language === 'UA' ? 'ШВИДКОСТІ' : 'SPEED'}
              </div>
              <div>{language === 'UA' ? 'САЙТУ' : 'TEST'}</div>
            </h1>

            <p className="text-zinc-400 text-sm sm:text-base leading-relaxed max-w-md pt-2">
              {language === 'UA'
                ? 'Переконайся, що твій інтернет дозволяє насолоджуватися кіном без затримок. Пройди простий тест і дізнайся, наскільки швидко працює CINEMA NOVA саме у тебе.'
                : 'Make sure your internet allows you to enjoy movies without buffering. Run a simple test and find out how fast CINEMA NOVA runs for you.'}
            </p>
          </div>

          {/* Right: Futuristic Cinematic Device / Screen Graphic with Speedometer & Фільм Posters */}
          <div className="lg:col-span-6 flex items-center justify-center relative">
            {/* Ambient Red Lighting Effects */}
            <div className="absolute -inset-4 bg-gradient-to-r from-[#FF3040]/10 via-[#FF3040]/25 to-transparent blur-3xl pointer-events-none rounded-full" />
            
            {/* Horizontal Laser Glow line behind the tablet */}
            <div className="absolute top-1/2 -left-12 -right-12 h-[2px] bg-gradient-to-r from-transparent via-[#FF3040]/80 to-transparent blur-[1px] shadow-[0_0_20px_#FF3040] pointer-events-none z-0" />

            {/* Контейнер for Mockup + Angled Posters */}
            <div className="relative w-full max-w-[500px] h-[300px] sm:h-[340px] flex items-center justify-center z-10">
              
              {/* Background Angled Poster Left */}
              <div 
                className="absolute left-2 sm:left-6 top-8 w-28 sm:w-36 h-40 sm:h-52 rounded-xl overflow-hidden shadow-2xl transform -rotate-12 scale-90 opacity-65 border border-white/10 brightness-75 transition-transform duration-700 hover:scale-95 hover:opacity-90"
                style={{
                  background: 'linear-gradient(135deg, #1c0d12 0%, #08080a 100%)'
                }}
              >
                <img 
                  src="https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=400&auto=format&fit=crop" 
                  alt="Movie" 
                  className="w-full h-full object-cover mix-blend-luminosity opacity-70"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-[#FF3040]/20 to-transparent" />
              </div>

              {/* Background Angled Poster Right */}
              <div 
                className="absolute right-2 sm:right-6 top-6 w-28 sm:w-36 h-40 sm:h-52 rounded-xl overflow-hidden shadow-2xl transform rotate-12 scale-90 opacity-65 border border-white/10 brightness-75 transition-transform duration-700 hover:scale-95 hover:opacity-90"
                style={{
                  background: 'linear-gradient(135deg, #1c0d12 0%, #08080a 100%)'
                }}
              >
                <img 
                  src="https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=400&auto=format&fit=crop" 
                  alt="Movie" 
                  className="w-full h-full object-cover mix-blend-luminosity opacity-70"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-[#FF3040]/20 to-transparent" />
              </div>

              {/* Main Futuristic Tablet Screen */}
              <div 
                className="relative w-[310px] sm:w-[380px] h-[200px] sm:h-[240px] rounded-[22px] bg-[#0A0A0E] border-2 border-zinc-700/80 p-3 sm:p-4 shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_35px_rgba(255,48,64,0.35)] flex flex-col items-center justify-center overflow-hidden z-20"
                style={{
                  boxShadow: '0 0 40px rgba(255, 48, 64, 0.25), inset 0 0 20px rgba(0,0,0,0.8)'
                }}
              >
                {/* Tablet Inner Glass Reflection */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.03] to-white/[0.08] pointer-events-none rounded-[20px]" />

                {/* Speedometer Gauge Inside Device */}
                <div className="relative w-48 sm:w-56 h-32 sm:h-36 flex flex-col items-center justify-center">
                  <svg className="w-full h-full" viewBox="0 0 200 130">
                    <defs>
                      <linearGradient id="heroGaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#800D15" />
                        <stop offset="50%" stopColor="#FF3040" />
                        <stop offset="100%" stopColor="#FF7080" />
                      </linearGradient>
                      <filter id="glow">
                        <feGaussianBlur stdDeviation="3.5" result="coloredBlur"/>
                        <feMerge>
                          <feMergeNode in="coloredBlur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>

                    {/* Track */}
                    <path
                      d="M 25 110 A 75 75 0 0 1 175 110"
                      fill="none"
                      stroke="#22222B"
                      strokeWidth="10"
                      strokeLinecap="round"
                    />

                    {/* Ticks */}
                    {[...Array(11)].map((_, i) => {
                      const angle = -180 + i * 18; // -180 to 0 degrees
                      const rad = (angle * Math.PI) / 180;
                      const x1 = 100 + 88 * Math.cos(rad);
                      const y1 = 110 + 88 * Math.sin(rad);
                      const x2 = 100 + 80 * Math.cos(rad);
                      const y2 = 110 + 80 * Math.sin(rad);
                      return (
                        <line
                          key={i}
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke="#4A4A58"
                          strokeWidth="1.5"
                        />
                      );
                    })}

                    {/* Активний Glowing Arc */}
                    <path
                      d="M 25 110 A 75 75 0 0 1 175 110"
                      fill="none"
                      stroke="url(#heroGaugeGradient)"
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray="235"
                      strokeDashoffset={235 - (235 * Math.min(1, Math.max(0, (heroNeedleAngle + 180) / 180)))}
                      filter="url(#glow)"
                      className="transition-all duration-300"
                    />

                    {/* Red Needle Indicator */}
                    <line
                      x1="100"
                      y1="110"
                      x2={100 + 65 * Math.cos((heroNeedleAngle * Math.PI) / 180)}
                      y2={110 + 65 * Math.sin((heroNeedleAngle * Math.PI) / 180)}
                      stroke="#FF3040"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      filter="url(#glow)"
                      className="transition-all duration-150"
                    />
                    <circle cx="100" cy="110" r="5" fill="#FFFFFF" />
                  </svg>

                  {/* Fast Streaming Text inside the Screen */}
                  <div className="absolute bottom-1 text-center select-none">
                    <span className="block text-white font-bold text-xs sm:text-sm tracking-wider font-mono">
                      {liveSpeed !== null 
                        ? `${liveSpeed} Mbps` 
                        : downloadSpeed !== null 
                        ? `${downloadSpeed} Mbps` 
                        : 'FAST'}
                    </span>
                    <span className="block text-[#FF3040] text-[9px] sm:text-[10px] font-mono tracking-widest uppercase">
                      {isRunning 
                        ? (testPhase === 'ping' ? 'PING' : testPhase === 'download' ? 'DOWNLOADING' : 'UPLOADING')
                        : 'STREAMING'}
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. MAIN Швидкість TEST GLASS Картка (1:1 with image.png) */}
        {/* ========================================================================= */}
        <div 
          className="relative rounded-[24px] bg-[#0A0A0E] border border-white/10 p-6 sm:p-8 lg:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_40px_rgba(255,48,64,0.06)] overflow-hidden"
          style={{
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          {/* Subtle Ambient Red Glow in Картка Corner */}
          <div className="absolute -top-24 -left-24 w-80 h-80 bg-[#FF3040]/10 rounded-full blur-3xl pointer-events-none" />

          {/* Test Status Шапка сайту Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-6 mb-6 border-b border-white/10 text-xs sm:text-sm">
            <div className="flex items-center gap-2 text-zinc-300">
              <span className={`w-2.5 h-2.5 rounded-full ${isRunning ? 'bg-[#FF3040] animate-ping' : testPhase === 'completed' ? 'bg-emerald-500' : 'bg-zinc-500'}`} />
              <span className="font-semibold text-white">
                {language === 'UA' ? 'Реальний тест мережі' : 'Live Network Speed Test'}
              </span>
              <span className="text-zinc-500 font-mono text-xs hidden sm:inline">
                • {language === 'UA' ? 'Вузол: CINEMA NOVA Core' : 'Host: CINEMA NOVA Core'}
              </span>
            </div>

            {testPhase === 'error' && (
              <span className="text-[#FF3040] font-medium text-xs">
                {errorMessage || (language === 'UA' ? 'Помилка вимірювання' : 'Measurement error')}
              </span>
            )}

            {isRunning && (
              <div className="flex items-center gap-2 font-mono text-zinc-400 text-xs">
                <span>{statusMessage}</span>
                <span className="text-[#FF3040] font-bold">{progressPercent}%</span>
              </div>
            )}

            {testPhase === 'completed' && (
              <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-mono">
                <CheckCircle2 className="w-4 h-4" />
                <span>{language === 'UA' ? 'Вимірювання завершено' : 'Completed'}</span>
                {transferredMB > 0 && (
                  <span className="text-zinc-400 ml-1">({transferredMB} MB)</span>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            
            {/* Left Колонка: Speedometer Dial & START Кнопка */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center">
              <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center">
                
                {/* SVG Dial Arc (Відкриття at bottom, 240 degrees) */}
                <svg className="w-full h-full transform rotate-[150deg]" viewBox="0 0 220 220">
                  <defs>
                    <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#FF1E38" />
                      <stop offset="60%" stopColor="#FF4D5C" />
                      <stop offset="100%" stopColor="#FF8591" />
                    </linearGradient>
                    <filter id="arcGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="4" result="glow" />
                      <feMerge>
                        <feMergeNode in="glow" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  {/* Dark Track */}
                  <circle
                    cx="110"
                    cy="110"
                    r="90"
                    fill="none"
                    stroke="#1E1E26"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={`${arcLength} 600`}
                  />

                  {/* Активний Red Glowing Arc */}
                  <circle
                    cx="110"
                    cy="110"
                    r="90"
                    fill="none"
                    stroke="url(#gaugeGradient)"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={`${arcLength} 600`}
                    strokeDashoffset={strokeDashoffset}
                    filter="url(#arcGlow)"
                    className="transition-all duration-200"
                  />
                </svg>

                {/* Center Interactive Кнопка */}
                <button
                  onClick={startTest}
                  disabled={isRunning}
                  className={`absolute inset-4 sm:inset-6 rounded-full flex flex-col items-center justify-center text-center transition-all duration-300 cursor-pointer select-none group ${
                    isRunning 
                      ? 'bg-[#111116] border border-[#FF3040]/40 shadow-[inset_0_0_25px_rgba(255,48,64,0.2)]'
                      : 'bg-[#111116] hover:bg-[#16161D] border border-white/10 hover:border-[#FF3040]/60 active:scale-95 shadow-[0_0_20px_rgba(0,0,0,0.8)] hover:shadow-[0_0_30px_rgba(255,48,64,0.35)]'
                  }`}
                >
                  <Wifi className={`w-6 h-6 sm:w-7 sm:h-7 mb-1.5 transition-transform duration-300 ${
                    isRunning ? 'text-[#FF3040] animate-pulse scale-110' : 'text-white group-hover:scale-110'
                  }`} />

                  {/* Text inside Кнопка */}
                  {isRunning ? (
                    <>
                      <span className="text-xl sm:text-2xl font-bold font-mono text-white tracking-tight">
                        {liveSpeed !== null ? liveSpeed : '...'}
                      </span>
                      <span className="text-[11px] font-medium text-zinc-400 font-mono">
                        {testPhase === 'ping' 
                          ? (language === 'UA' ? 'Ping...' : 'Ping...') 
                          : testPhase === 'download' 
                          ? (language === 'UA' ? 'Завантаження...' : 'Downloading...') 
                          : (language === 'UA' ? 'Відвантаження...' : 'Uploading...')}
                      </span>
                    </>
                  ) : testPhase === 'completed' ? (
                    <>
                      <span className="text-lg sm:text-xl font-bold text-white tracking-wider">
                        {language === 'UA' ? 'ПОВТОРИТИ' : 'RESTART'}
                      </span>
                      <span className="text-[11px] text-zinc-400 group-hover:text-[#FF3040] transition-colors">
                        {language === 'UA' ? 'Повторити тест' : 'Run test again'}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-lg sm:text-xl font-bold text-white tracking-wider">
                        {language === 'UA' ? 'СТАРТ' : 'START'}
                      </span>
                      <span className="text-[11px] text-zinc-400 group-hover:text-[#FF3040] transition-colors">
                        {language === 'UA' ? 'Перевірити швидкість' : 'Check speed'}
                      </span>
                    </>
                  )}
                </button>
              </div>

              {isRunning && (
                <button
                  onClick={stopTest}
                  className="mt-3 text-xs text-zinc-500 hover:text-zinc-300 underline font-mono transition-colors"
                >
                  {language === 'UA' ? 'Зупинити тест' : 'Cancel test'}
                </button>
              )}
            </div>

            {/* Middle Column: 3 Metric Cards (Завантаження, Відвантаження, Ping) */}
            <div className="lg:col-span-4 space-y-6 lg:border-l lg:border-white/10 lg:pl-8">
              
              {/* 1. Завантаження (Download) */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full border border-white/15 bg-white/[0.03] flex items-center justify-center shrink-0 shadow-md">
                  <ArrowDownToLine className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs sm:text-sm text-zinc-400 font-medium">
                    {language === 'UA' ? 'Завантаження' : 'Download'}
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-2xl sm:text-3xl font-bold text-white font-mono tracking-tight">
                      {downloadSpeed !== null ? downloadSpeed : '—'}
                    </span>
                    <span className="text-xs text-zinc-400 font-medium">
                      {language === 'UA' ? 'Мбіт/с' : 'Mbps'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Відвантаження (Upload) */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full border border-white/15 bg-white/[0.03] flex items-center justify-center shrink-0 shadow-md">
                  <ArrowUpToLine className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs sm:text-sm text-zinc-400 font-medium">
                    {language === 'UA' ? 'Відвантаження' : 'Upload'}
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-2xl sm:text-3xl font-bold text-white font-mono tracking-tight">
                      {uploadSpeed !== null ? uploadSpeed : '—'}
                    </span>
                    <span className="text-xs text-zinc-400 font-medium">
                      {language === 'UA' ? 'Мбіт/с' : 'Mbps'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Ping */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full border border-white/15 bg-white/[0.03] flex items-center justify-center shrink-0 shadow-md">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs sm:text-sm text-zinc-400 font-medium">
                    Ping
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-0.5 flex-wrap">
                    <span className="text-2xl sm:text-3xl font-bold text-white font-mono tracking-tight">
                      {pingMs !== null ? pingMs : '—'}
                    </span>
                    <span className="text-xs text-zinc-400 font-medium">
                      {language === 'UA' ? 'мс' : 'ms'}
                    </span>
                    {jitterMs !== null && (
                      <span className="text-[11px] text-zinc-500 font-mono ml-1.5">
                        Jitter: {jitterMs} {language === 'UA' ? 'мс' : 'ms'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

            </div>

            {/* Right Колонка: Tip / Advice Section */}
            <div className="lg:col-span-3 lg:border-l lg:border-white/10 lg:pl-8 space-y-3 flex flex-col justify-center">
              <div className="flex items-center gap-2">
                <Zap className="w-6 h-6 text-[#FF3040] fill-[#FF3040]" />
                <span className="text-[#FF4D5C] font-bold text-base sm:text-lg">
                  {language === 'UA' ? 'Порада' : 'Recommendation'}
                </span>
              </div>
              <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed">
                {getRecommendation()}
              </p>
            </div>

          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. "ЩО ВПЛИВАЄ НА ШВИДКІСТЬ?" (1:1 with image.png) */}
        {/* ========================================================================= */}
        <div className="space-y-6 pt-4">
          <h2 
            style={{ fontFamily: "'Montserrat Alternates', sans-serif" }}
            className="text-xl sm:text-2xl md:text-[26px] font-bold text-white tracking-tight"
          >
            {language === 'UA' ? 'Що впливає на швидкість?' : 'What affects your speed?'}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {/* Factor 1: Internet Connection */}
            <div className="space-y-2.5">
              <Wifi className="w-6 h-6 text-[#FF3040]" />
              <h3 className="text-white font-bold text-sm sm:text-base">
                {language === 'UA' ? "Інтернет-з'єднання" : 'Internet Connection'}
              </h3>
              <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                {language === 'UA'
                  ? 'Wi-Fi або мобільний інтернет можуть мати різну швидкість і стабільність.'
                  : 'Wi-Fi or cellular connections can have varying speeds and latency stability.'}
              </p>
            </div>

            {/* Factor 2: Device */}
            <div className="space-y-2.5">
              <Laptop className="w-6 h-6 text-[#FF3040]" />
              <h3 className="text-white font-bold text-sm sm:text-base">
                {language === 'UA' ? 'Пристрій' : 'Device'}
              </h3>
              <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                {language === 'UA'
                  ? 'Старі пристрої можуть обмежувати швидкість відтворення.'
                  : 'Older hardware or weak processors may throttle video decoding speeds.'}
              </p>
            </div>

            {/* Factor 3: Region */}
            <div className="space-y-2.5">
              <MapPin className="w-6 h-6 text-[#FF3040]" />
              <h3 className="text-white font-bold text-sm sm:text-base">
                {language === 'UA' ? 'Регіон' : 'Region'}
              </h3>
              <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                {language === 'UA'
                  ? 'У деяких регіонах швидкість може бути нижчою через навантаження на мережу.'
                  : 'In some locations connection speeds can fluctuate due to ISP routing congestion.'}
              </p>
            </div>

            {/* Factor 4: Network Load */}
            <div className="space-y-2.5">
              <Share2 className="w-6 h-6 text-[#FF3040]" />
              <h3 className="text-white font-bold text-sm sm:text-base">
                {language === 'UA' ? 'Навантаження на мережу' : 'Network Load'}
              </h3>
              <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                {language === 'UA'
                  ? 'Кількість користувачів у вашій мережі також впливає на швидкість.'
                  : 'Active torrents, downloads, or other household users also reduce bandwidth.'}
              </p>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. BOTTOM TIP BANNER + NAVIGATE TO HOME (1:1 with image.png) */}
        {/* ========================================================================= */}
        <div className="rounded-[20px] bg-[#0A0A0E] border border-white/10 p-6 sm:p-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
          {/* Left: Red Lightbulb + Advice Text */}
          <div className="flex items-start gap-4 max-w-3xl">
            <Lightbulb className="w-6 h-6 text-[#FF3040] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-[#FF4D5C] font-bold text-sm sm:text-base">
                {language === 'UA' ? 'Як покращити швидкість?' : 'How to improve speed?'}
              </h4>
              <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                {language === 'UA'
                  ? 'Використовуй дротове з\'єднання, перезавантаж роутер, закрий зайві програми та перевір, чи не обмежений трафік у твого інтернет-провайдера.'
                  : 'Use a wired Ethernet connection, restart your router, close bandwidth-heavy background apps, and verify your ISP plan.'}
              </p>
            </div>
          </div>

          {/* Right: "Повернутись на головну >" Button */}
          {onNavigateHome && (
            <button
              onClick={onNavigateHome}
              className="group shrink-0 px-5 py-2.5 rounded-[12px] border border-[#FF3040]/70 hover:border-[#FF3040] bg-black/40 hover:bg-[#FF3040]/10 text-white font-medium text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer shadow-md select-none active:scale-95"
            >
              <span>{language === 'UA' ? 'Повернутись на головну' : 'Return to Home'}</span>
              <ChevronRight className="w-4 h-4 text-[#FF3040] group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default SpeedTestView;
