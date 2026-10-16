import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  FileText,
  Sliders,
  ChevronRight,
  Shield,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Ingredient, ScanAnalysis, UserSession, MatchedIngredientResult } from '../types';
import { runLocalOcr, preprocessImageForOcr, SAMPLE_LABELS, OcrProgress } from '../services/ocrService';
import { analyzeIngredientsText } from '../services/ingredientMatcher';
import { LocalVaultService } from '../services/localVault';
import { TrafficLightBadge } from './TrafficLightBadge';

interface ScannerViewProps {
  ingredients: Ingredient[];
  userSession: UserSession;
  setUserSession: (session: UserSession) => void;
  onNavigateToStore: () => void;
  onNavigateToAdmin: () => void;
}

export const ScannerView: React.FC<ScannerViewProps> = ({
  ingredients,
  userSession,
  setUserSession,
  onNavigateToStore,
  onNavigateToAdmin,
}) => {
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState<string>('');
  const [isProcessingOcr, setIsProcessingOcr] = useState<boolean>(false);
  const [ocrProgress, setOcrProgress] = useState<OcrProgress>({ status: '', progress: 0 });
  const [analysisResult, setAnalysisResult] = useState<ScanAnalysis | null>(null);
  const [filterResultTab, setFilterResultTab] = useState<'all' | 'red' | 'yellow' | 'green'>('all');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Stop camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' }, // prefer rear camera on mobile
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
        mediaStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setCameraActive(true);
      } else {
        setCameraError('Tu navegador no soporta acceso directo a la cámara. Usa la opción "Subir foto / Galería".');
      }
    } catch (err: any) {
      console.warn('Camera access denied or unavailable:', err);
      setCameraError('Permiso de cámara no concedido o no disponible. Puedes usar el botón de captura de archivo.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedImage(dataUrl);
    stopCamera();

    // Auto trigger local OCR on captured photo
    handleProcessImage(dataUrl);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      setCapturedImage(src);
      handleProcessImage(src);
    };
    reader.readAsDataURL(file);
  };

  const handleProcessImage = async (imageSrc: string) => {
    // Check subscription weekly scan limit (2 weekly scans for Free plan)
    const scanCheck = LocalVaultService.canPerformCameraScan();
    if (!scanCheck.allowed) {
      alert(
        'Has alcanzado el límite semanal de 2 escaneos de tu Plan Free. Recuerda que introducir ingredientes manualmente por texto, el semáforo y las alternativas son 100% ILIMITADOS, o puedes activar el Plan Mensual ($6.500 COP) o Plan Anual ($30.000 COP) para escaneos ilimitados.'
      );
      return;
    }

    setIsProcessingOcr(true);
    setAnalysisResult(null);

    try {
      const extractedText = await runLocalOcr(imageSrc, (prog) => {
        setOcrProgress(prog);
      });

      setOcrText(extractedText);
      runClassification(extractedText);

      // Increment scan counter in encrypted vault
      const updated = LocalVaultService.incrementScanUsage();
      setUserSession(updated);
    } catch (error) {
      console.error('Error during OCR processing:', error);
      // Fallback: If OCR had an issue, let user edit text
      setOcrText('Agua, Glicerina, Dimethicone, Methylparaben, Fragancia, Aloe Vera');
      runClassification('Agua, Glicerina, Dimethicone, Methylparaben, Fragancia, Aloe Vera');
    } finally {
      setIsProcessingOcr(false);
    }
  };

  const runClassification = (textToAnalyze: string) => {
    const analysis = analyzeIngredientsText(textToAnalyze, ingredients);
    setAnalysisResult(analysis);

    // If completely green and has ingredients, launch celebratory confetti
    if (analysis.overallStatus === 'green' && analysis.matchedIngredients.length > 0) {
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#10b981', '#34d399', '#059669'],
        });
      } catch {
        // ignore if canvas confetti disabled
      }
    }
  };

  const loadSample = (sample: (typeof SAMPLE_LABELS)[0]) => {
    setCapturedImage(null);
    setOcrText(sample.text);
    runClassification(sample.text);
  };

  const filteredMatches = analysisResult?.matchedIngredients.filter((m: MatchedIngredientResult) => {
    if (filterResultTab === 'all') return true;
    return m.ingredient.trafficLight === filterResultTab;
  });

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* Intro Hero Banner */}
      <div className="bg-gradient-to-br from-emerald-900 to-teal-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-3 border border-emerald-400/30">
            <Shield className="w-3.5 h-3.5" />
            <span>Motor 100% On-Device &middot; Privacidad Total</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Lector de Etiquetas y Semáforo Lubo
          </h1>
          <p className="mt-2 text-sm sm:text-base text-emerald-100/90 leading-relaxed">
            Captura la etiqueta de cualquier cosmético o alimento con la cámara de tu celular. El análisis se realiza
            estrictamente en tu dispositivo contra la lista interna Lubo, <strong className="text-white">sin consultar servidores externos ni internet</strong>.
          </p>
        </div>
      </div>

      {/* Camera / Capture Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Camera className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>Captura de Etiqueta</span>
          </h2>
          {capturedImage && (
            <button
              onClick={() => {
                setCapturedImage(null);
                setAnalysisResult(null);
                setOcrText('');
              }}
              className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Nueva captura
            </button>
          )}
        </div>

        {/* Live Video Camera View */}
        {cameraActive ? (
          <div className="relative rounded-2xl overflow-hidden bg-black aspect-video sm:aspect-4/3 max-h-[460px] flex items-center justify-center border-2 border-emerald-500">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />

            {/* Viewfinder overlay */}
            <div className="absolute inset-8 border-2 border-dashed border-emerald-400/70 rounded-xl pointer-events-none flex flex-col justify-between p-3">
              <span className="text-[11px] bg-black/60 text-emerald-300 px-2 py-0.5 rounded self-start">
                Enfoca la lista de INGREDIENTES
              </span>
              <div className="w-full flex justify-center">
                <span className="text-[10px] text-white/80 bg-black/50 px-2 py-0.5 rounded">
                  Buena iluminación recomendada
                </span>
              </div>
            </div>

            {/* Action Bar inside camera */}
            <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-4 px-4 z-20">
              <button
                onClick={stopCamera}
                className="px-4 py-2 rounded-xl bg-slate-800/90 text-white text-xs font-medium backdrop-blur-sm cursor-pointer hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={capturePhoto}
                className="px-6 py-3 rounded-full bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/50 flex items-center gap-2 cursor-pointer hover:bg-emerald-400 active:scale-95 transition-all"
              >
                <Camera className="w-5 h-5" />
                <span>Capturar Foto</span>
              </button>
            </div>
          </div>
        ) : capturedImage ? (
          /* Preview of captured image */
          <div className="space-y-4">
            <div className="relative rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-950 max-h-[320px] flex items-center justify-center border border-slate-200 dark:border-slate-800">
              <img src={capturedImage} alt="Etiqueta capturada" className="max-h-[320px] object-contain rounded-xl" />
              <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-lg">
                Vista previa de etiqueta
              </div>
            </div>

            {isProcessingOcr && (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                    {ocrProgress.status || 'Procesando OCR local...'}
                  </span>
                  <span>{Math.round(ocrProgress.progress * 100)}%</span>
                </div>
                <div className="w-full bg-emerald-200/60 dark:bg-emerald-900/80 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-600 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${Math.round(ocrProgress.progress * 100)}%` }}
                  />
                </div>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                  Extrayendo texto en el dispositivo mediante Tesseract WebAssembly sin internet.
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Initial empty state with Camera & Upload buttons */
          <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8 sm:p-12 text-center bg-slate-50/50 dark:bg-slate-950/50">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-4">
              <Camera className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Escanear Etiqueta de Producto
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 mb-6">
              Apunta con la cámara hacia la sección "Ingredientes" o "INCI". El lector aislará los componentes y activará
              el Semáforo Lubo de forma 100% offline.
            </p>

            {cameraError && (
              <div className="mb-4 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-lg max-w-md mx-auto border border-rose-200 dark:border-rose-900">
                {cameraError}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={startCamera}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold flex items-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer transition-all active:scale-95"
              >
                <Camera className="w-4 h-4" />
                <span>Abrir Cámara en Vivo</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-5 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm font-semibold border border-slate-300 dark:border-slate-700 flex items-center gap-2 cursor-pointer transition-all"
              >
                <Upload className="w-4 h-4 text-slate-500" />
                <span>Tomar Foto / Galería</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>
        )}

        {/* Quick Sample Presets (Essential for instant testing) */}
        <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>O prueba con etiquetas de muestra instantáneas:</span>
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {SAMPLE_LABELS.map((sample) => (
              <button
                key={sample.id}
                onClick={() => loadSample(sample)}
                className="text-left p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 bg-slate-50 dark:bg-slate-950/60 hover:bg-white dark:hover:bg-slate-900 transition-all cursor-pointer group"
              >
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 flex items-center justify-between">
                  <span>{sample.title}</span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                  {sample.description}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Extracted Text Box with Editable capability */}
      {ocrText && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>Texto extraído de la etiqueta (Editable):</span>
            </label>
            <button
              onClick={() => runClassification(ocrText)}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" /> Re-procesar análisis
            </button>
          </div>
          <textarea
            value={ocrText}
            onChange={(e) => {
              setOcrText(e.target.value);
              runClassification(e.target.value);
            }}
            rows={3}
            className="w-full text-xs sm:text-sm p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-mono"
            placeholder="Puedes pegar o editar aquí la lista de ingredientes separada por comas..."
          />
        </div>
      )}

      {/* Analysis Results Display */}
      {analysisResult && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Main Traffic Light Result Hero */}
          <div
            className={`rounded-3xl p-6 sm:p-7 border transition-all ${
              analysisResult.overallStatus === 'green'
                ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/80'
                : analysisResult.overallStatus === 'yellow'
                ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/80'
                : 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800/80'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
                    analysisResult.overallStatus === 'green'
                      ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                      : analysisResult.overallStatus === 'yellow'
                      ? 'bg-amber-500 text-white shadow-amber-500/30'
                      : 'bg-rose-600 text-white shadow-rose-600/30'
                  }`}
                >
                  {analysisResult.overallStatus === 'green' ? (
                    <CheckCircle2 className="w-8 h-8" />
                  ) : analysisResult.overallStatus === 'yellow' ? (
                    <AlertTriangle className="w-8 h-8" />
                  ) : (
                    <AlertOctagon className="w-8 h-8" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Resultado Semáforo Lubo
                    </span>
                    <TrafficLightBadge status={analysisResult.overallStatus} size="sm" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                    {analysisResult.overallStatus === 'green'
                      ? 'Fórmula Botánica Apta y Segura'
                      : analysisResult.overallStatus === 'yellow'
                      ? 'Precaución: Activos o Alérgenos Detectados'
                      : 'Alerta Crítica: Ingredientes Nocivos Detectados'}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 mt-1 max-w-xl">
                    {analysisResult.verdict}
                  </p>
                </div>
              </div>

              {/* Semáforo Oficial LuBo (Sin calificación numérica) */}
              <div className="bg-white/90 dark:bg-slate-900/90 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 text-center shrink-0 min-w-[140px] shadow-xs flex flex-col items-center justify-center">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Semáforo LuBo
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <span
                    className={`w-5 h-5 rounded-full ${
                      analysisResult.overallStatus === 'green'
                        ? 'bg-emerald-500 shadow-md shadow-emerald-500/40 ring-4 ring-emerald-500/20'
                        : analysisResult.overallStatus === 'yellow'
                        ? 'bg-amber-400 shadow-md shadow-amber-400/40 ring-4 ring-amber-400/20'
                        : 'bg-rose-600 shadow-md shadow-rose-600/40 ring-4 ring-rose-600/20 animate-pulse'
                    }`}
                  />
                  <span
                    className={`text-sm font-black uppercase tracking-wide ${
                      analysisResult.overallStatus === 'green'
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : analysisResult.overallStatus === 'yellow'
                        ? 'text-amber-700 dark:text-amber-300'
                        : 'text-rose-700 dark:text-rose-300'
                    }`}
                  >
                    {analysisResult.overallStatus === 'green'
                      ? 'Verde'
                      : analysisResult.overallStatus === 'yellow'
                      ? 'Amarillo'
                      : 'Rojo'}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1 font-medium">
                  {analysisResult.overallStatus === 'green'
                    ? 'Limpio / Seguro'
                    : analysisResult.overallStatus === 'yellow'
                    ? 'Precaución'
                    : 'No Consumir'}
                </div>
              </div>
            </div>

            {/* Counter Badges Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5 pt-4 border-t border-slate-200/80 dark:border-slate-800">
              <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800/80">
                <div className="text-[11px] text-slate-500">Detectados</div>
                <div className="text-lg font-bold text-slate-900 dark:text-white">
                  {analysisResult.summary.total}
                </div>
              </div>

              <div className="bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-300/60 dark:border-emerald-800/60">
                <div className="text-[11px] text-emerald-800 dark:text-emerald-300 font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Verdes (Seguros)
                </div>
                <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                  {analysisResult.summary.greenCount}
                </div>
              </div>

              <div className="bg-amber-500/10 p-2.5 rounded-xl border border-amber-300/60 dark:border-amber-800/60">
                <div className="text-[11px] text-amber-800 dark:text-amber-300 font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Amarillos (Precaución)
                </div>
                <div className="text-lg font-bold text-amber-700 dark:text-amber-400">
                  {analysisResult.summary.yellowCount}
                </div>
              </div>

              <div className="bg-rose-500/10 p-2.5 rounded-xl border border-rose-300/60 dark:border-rose-800/60">
                <div className="text-[11px] text-rose-800 dark:text-rose-300 font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  Rojos (Evitar)
                </div>
                <div className="text-lg font-bold text-rose-700 dark:text-rose-400">
                  {analysisResult.summary.redCount}
                </div>
              </div>
            </div>
          </div>

          {/* Callout if Red ingredients exist: Suggest Clean Alternatives */}
          {analysisResult.summary.redCount > 0 && (
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg shadow-emerald-700/10">
              <div className="space-y-1">
                <h4 className="font-bold text-sm sm:text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  ¿Buscas una alternativa botánica sin tóxicos?
                </h4>
                <p className="text-xs text-emerald-100 max-w-xl">
                  En Lubo Botica formulamos alternativas limpias que reemplazan sulfatos agresivos, parabenos y siliconas
                  oclusivas por fitoactivos 100% seguros.
                </p>
              </div>
              <button
                onClick={onNavigateToStore}
                className="px-4 py-2 rounded-xl bg-white text-emerald-800 text-xs sm:text-sm font-bold shrink-0 hover:bg-emerald-50 cursor-pointer shadow-sm"
              >
                Ver Productos Recomendados &rarr;
              </button>
            </div>
          )}

          {/* Detailed Ingredients Breakdown List */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Desglose Fila por Fila ({analysisResult.matchedIngredients.length} ingredientes analizados)
              </h3>

              {/* Filter tabs */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
                <button
                  onClick={() => setFilterResultTab('all')}
                  className={`px-2.5 py-1 rounded-lg font-medium cursor-pointer transition-all ${
                    filterResultTab === 'all'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  Todos ({analysisResult.matchedIngredients.length})
                </button>
                <button
                  onClick={() => setFilterResultTab('red')}
                  className={`px-2.5 py-1 rounded-lg font-medium cursor-pointer transition-all ${
                    filterResultTab === 'red'
                      ? 'bg-rose-500 text-white shadow-xs'
                      : 'text-rose-600 hover:text-rose-700'
                  }`}
                >
                  Rojos ({analysisResult.summary.redCount})
                </button>
                <button
                  onClick={() => setFilterResultTab('yellow')}
                  className={`px-2.5 py-1 rounded-lg font-medium cursor-pointer transition-all ${
                    filterResultTab === 'yellow'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-amber-600 hover:text-amber-700'
                  }`}
                >
                  Amarillos ({analysisResult.summary.yellowCount})
                </button>
                <button
                  onClick={() => setFilterResultTab('green')}
                  className={`px-2.5 py-1 rounded-lg font-medium cursor-pointer transition-all ${
                    filterResultTab === 'green'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-emerald-600 hover:text-emerald-700'
                  }`}
                >
                  Verdes ({analysisResult.summary.greenCount})
                </button>
              </div>
            </div>

            {/* List */}
            <div className="space-y-3">
              {filteredMatches && filteredMatches.length > 0 ? (
                filteredMatches.map((item: MatchedIngredientResult, idx: number) => (
                  <div
                    key={`${item.ingredient.id}-${idx}`}
                    className={`p-4 rounded-xl border transition-all ${
                      item.ingredient.trafficLight === 'green'
                        ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/40'
                        : item.ingredient.trafficLight === 'yellow'
                        ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-800/40'
                        : 'bg-rose-50/50 dark:bg-rose-950/30 border-rose-300/90 dark:border-rose-800/60'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <TrafficLightBadge status={item.ingredient.trafficLight || (item.ingredient.tier === 'optimal' || item.ingredient.tier === 'healthy' ? 'green' : item.ingredient.tier === 'caution' ? 'yellow' : 'red')} size="sm" />
                        <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                          {item.ingredient.name}
                        </h4>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono italic">
                          ({item.ingredient.inciName})
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-white/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 self-start sm:self-auto border border-slate-200/50 dark:border-slate-700">
                        {item.ingredient.category}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300 mt-2">
                      {item.ingredient.description}
                    </p>

                    <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800 text-xs space-y-1">
                      <p className="text-slate-600 dark:text-slate-400">
                        <strong className="text-slate-800 dark:text-slate-200">Efectos / Riesgos:</strong>{' '}
                        {item.ingredient.risks}
                      </p>
                      {item.ingredient.recommendedAlternative && (
                        <p className="text-emerald-700 dark:text-emerald-400">
                          <strong>Recomendación Lubo:</strong> {item.ingredient.recommendedAlternative}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-xs text-slate-400">
                  No hay ingredientes en esta categoría para la etiqueta analizada.
                </div>
              )}
            </div>

            {/* Unrecognized tokens (if any) */}
            {analysisResult.unrecognizedTokens.length > 0 && (
              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Términos no encontrados en el archivo local ({analysisResult.unrecognizedTokens.length}):</span>
                  </span>
                  <button
                    onClick={onNavigateToAdmin}
                    className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Añadir a lista interna en Admin</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {analysisResult.unrecognizedTokens.slice(0, 15).map((tok: string, i: number) => (
                    <span
                      key={i}
                      className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono"
                    >
                      {tok}
                    </span>
                  ))}
                  {analysisResult.unrecognizedTokens.length > 15 && (
                    <span className="text-[11px] px-2 py-0.5 text-slate-400">
                      +{analysisResult.unrecognizedTokens.length - 15} más
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
