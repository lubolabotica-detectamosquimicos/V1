import React, { useState, useEffect, useRef } from 'react';
import { Product } from '../types';
import { analyzeIngredientsText, getFunctionalRiskOrBenefit } from '../services/ingredientMatcher';
import { LocalVaultService } from '../services/localVault';

interface CameraViewfinderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductScanned: (product: Product) => void;
  allProducts: Product[];
  onOpenInicioModal?: () => void;
}

export const CameraViewfinderModal: React.FC<CameraViewfinderModalProps> = ({
  isOpen,
  onClose,
  onProductScanned,
  allProducts,
  onOpenInicioModal,
}) => {
  const [hasCamera, setHasCamera] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualUpc, setManualUpc] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(true);
  const [torchOn, setTorchOn] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!isOpen) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      return;
    }

    // Try camera access
    const startCamera = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' } },
          });
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
          setHasCamera(true);
        } else {
          setHasCamera(false);
        }
      } catch (err) {
        setHasCamera(false);
        setCameraError('Vista simulada bio-espectral activa (permiso de cámara no concedido)');
      }
    };

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectProduct = (product: Product) => {
    const scanCheck = LocalVaultService.canPerformCameraScan();
    if (!scanCheck.allowed) {
      return;
    }
    LocalVaultService.incrementScanUsage();
    setIsScanning(false);
    setTimeout(() => {
      onProductScanned(product);
      onClose();
    }, 400);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = manualUpc.trim();
    if (!query) return;

    // 1. Check if query matches UPC of an existing catalog product
    const found = allProducts.find(
      (p) =>
        p.upc.toLowerCase() === query.toLowerCase() ||
        p.name.toLowerCase() === query.toLowerCase()
    );

    if (found) {
      handleSelectProduct(found);
      return;
    }

    // 2. Classify against the official master OneDrive database (680 ingredients)
    const masterDb = LocalVaultService.getIngredients();
    const analysis = analyzeIngredientsText(query, masterDb);

    if (analysis.matchedIngredients.length > 0) {
      const isRed = analysis.overallStatus === 'red';
      const isYellow = analysis.overallStatus === 'yellow';

      const dynamicProduct: Product = {
        id: `scanned-dyn-${Date.now()}`,
        upc: `LBC-${Math.floor(100000 + Math.random() * 900000)}`,
        name: query.length > 40 ? query.slice(0, 40) + '...' : query,
        brand: 'Evaluación On-Device LuBo',
        category: analysis.matchedIngredients[0]?.ingredient.category || 'Análisis Directo',
        weight: `${analysis.summary.total} compuesto(s) analizado(s)`,
        priceMxn: 0,
        imageUrl: isRed
          ? 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=60'
          : 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500&auto=format&fit=crop&q=60',
        safetyScore: isRed ? 3.0 : isYellow ? 2.0 : 1.0,
        overallStatus: isRed ? 'danger' : isYellow ? 'caution' : 'clean',
        statusLabel: isRed
          ? 'NO CONSUMIR / Tóxico'
          : isYellow
          ? 'PRECAUCIÓN / Aditivos'
          : 'LIMPIO / Seguro',
        badgeLabel: isRed
          ? 'Semáforo Rojo'
          : isYellow
          ? 'Semáforo Amarillo'
          : 'Semáforo Verde',
        substatusNote: isRed
          ? 'Semáforo Rojo'
          : isYellow
          ? 'Semáforo Amarillo'
          : 'Semáforo Verde',
        warningSummary: analysis.verdict,
        lotNumber: `Lote: BTO-${Math.floor(1000 + Math.random() * 9000)} · Base Oficial OneDrive`,
        verifiedOrganic: !isRed && !isYellow,
        disruptorCount: analysis.summary.redCount,
        isSaved: false,
        isInList: false,
        isPurchased: false,
        ingredients: analysis.matchedIngredients.map((m, idx) => ({
          id: `dyn-ing-${idx}`,
          name: m.ingredient.name,
          details: getFunctionalRiskOrBenefit(m.ingredient),
          functionalRiskOrBenefit: getFunctionalRiskOrBenefit(m.ingredient),
          tier: m.ingredient.tier || (m.ingredient.trafficLight === 'red' ? 'danger' : m.ingredient.trafficLight === 'yellow' ? 'caution' : 'optimal'),
          category: (m.ingredient.category as any) || 'botanical',
          trafficLight: m.ingredient.trafficLight,
        })),
      };

      handleSelectProduct(dynamicProduct);
    } else {
      // If not matched, still create a query card with notice
      const fallbackProduct: Product = {
        id: `scanned-unrec-${Date.now()}`,
        upc: `LBC-REC-${Math.floor(100000 + Math.random() * 900000)}`,
        name: query,
        brand: 'Término no listado',
        category: 'Consulta Manual',
        weight: '1 término',
        priceMxn: 0,
        imageUrl: allProducts[0].imageUrl,
        safetyScore: 2.0,
        overallStatus: 'caution',
        statusLabel: 'NO LISTADO EN BASE',
        badgeLabel: 'Sin registro',
        substatusNote: 'Semáforo Pendiente',
        warningSummary: 'Este ingrediente no se encuentra en el archivo unificado de OneDrive. Puedes agregarlo desde el Panel Admin.',
        disruptorCount: 0,
        isSaved: false,
        isInList: false,
        isPurchased: false,
        ingredients: [
          {
            id: 'unrec-1',
            name: query,
            details: 'Término no catalogado en INGREDIENTESnaturales y quimicos_Lubo_unificado.xlsx.',
            tier: 'caution',
          },
        ],
      };
      handleSelectProduct(fallbackProduct);
    }
  };

  const scanCheck = LocalVaultService.canPerformCameraScan();
  const isBlocked = !scanCheck.allowed;

  return (
    <div className="fixed inset-0 z-50 bg-[#1a1c1c]/95 flex flex-col justify-between text-white backdrop-blur-md">
      {/* Top Header HUD */}
      <div className="pt-safe px-4 py-3 flex items-center justify-between z-20 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="w-2.5 h-2.5 rounded-full bg-[#cce510] animate-ping" />
          <span className="font-bold text-[13px] tracking-wide text-[#cce510] uppercase">
            Lente Bio-Espectral v4.2
          </span>
          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-white/20 text-[#cce510]">
            {scanCheck.maxWeeklyScans <= 2
              ? `${scanCheck.weeklyScansUsed}/2 escaneos semanales`
              : 'Escaneos Ilimitados ⭐'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!isBlocked && (
            <button
              onClick={() => setTorchOn(!torchOn)}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                torchOn ? 'bg-[#cce510] text-[#341011]' : 'bg-white/20 text-white'
              }`}
              title="Luz / Flash"
            >
              <span className="material-symbols-outlined text-[18px]">
                {torchOn ? 'flashlight_on' : 'flashlight_off'}
              </span>
            </button>
          )}
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white cursor-pointer"
            title="Cerrar escáner"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
      </div>

      {/* Main Viewfinder Section or Blocked Screen */}
      {isBlocked ? (
        <div className="relative flex-1 flex flex-col items-center justify-center px-6 py-4 overflow-y-auto max-w-md mx-auto w-full text-center">
          <div className="w-20 h-20 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-300 mb-4 shadow-[0_0_30px_rgba(245,158,11,0.3)]">
            <span className="material-symbols-outlined text-[40px]">lock</span>
          </div>

          <span className="text-[11px] font-extrabold uppercase px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 mb-2">
            Límite Semanal de 2 Escaneos Alcanzado
          </span>

          <h3 className="text-[20px] font-black text-white leading-tight mb-2">
            Has completado tus 2 escaneos semanales
          </h3>

          <p className="text-[12.5px] text-white/80 leading-relaxed mb-4">
            El Plan Free incluye 2 escaneos con cámara por semana. Pásate al <strong>Plan Mensual ($6.500 COP)</strong> o <strong>Plan Anual ($30.000 COP)</strong> para disfrutar de escaneos ópticos 100% ilimitados.
          </p>

          {/* Opciones Ilimitadas Card */}
          <div className="w-full bg-[#cce510]/15 border border-[#cce510]/40 rounded-2xl p-3.5 mb-5 text-left">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-[18px] text-[#cce510]">
                verified
              </span>
              <span className="text-[11px] font-black uppercase text-[#cce510]">
                ¡Opciones 100% Ilimitadas en tu Plan!
              </span>
            </div>
            <p className="text-[11.5px] text-white/90 leading-snug">
              La consulta de ingredientes por texto, el semáforo botánico y las <strong>Alternativas LuBo</strong> son <strong>totalmente ilimitadas</strong> sin costo alguno.
            </p>
          </div>

          {/* Action buttons */}
          <div className="w-full flex flex-col gap-2">
            {onOpenInicioModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenInicioModal();
                }}
                className="w-full py-3 px-4 rounded-xl bg-[#cce510] hover:bg-[#dcf52a] text-[#341011] text-[13px] font-black shadow-lg shadow-[#cce510]/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">credit_card</span>
                <span>Ver Planes en COP ($6.500 / $30.000)</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[12px] font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">edit_note</span>
              <span>Escribir ingredientes ahora (Ilimitado)</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="relative flex-1 flex flex-col items-center justify-center px-6 overflow-hidden">
          {/* Background real camera or simulation */}
          {hasCamera ? (
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover opacity-80"
              playsInline
              muted
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#1b2612] via-[#10190a] to-[#251012] flex items-center justify-center opacity-90">
              <div className="w-96 h-96 rounded-full bg-[#cce510]/5 blur-3xl pointer-events-none" />
            </div>
          )}

          {/* Optical Caliper Frame */}
          <div className="relative w-72 h-72 rounded-3xl border-2 border-[#cce510]/60 shadow-[0_0_30px_rgba(204,229,16,0.25)] flex flex-col items-center justify-between p-4 z-10 backdrop-blur-[2px]">
            {/* 4 Tech Caliper Corners */}
            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-[#cce510] rounded-tl-xl" />
            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-[#cce510] rounded-tr-xl" />
            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-[#cce510] rounded-bl-xl" />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-[#cce510] rounded-br-xl" />

            {/* Animated Laser Beam */}
            {isScanning && (
              <div className="absolute left-3 right-3 h-0.5 bg-gradient-to-r from-transparent via-[#cce510] to-transparent shadow-[0_0_12px_#cce510] animate-scan-laser" />
            )}

          {/* Center reticle */}
          <div className="text-center mt-2">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#cce510] bg-black/40 px-2.5 py-0.5 rounded-full">
              Buscando código UPC o ingredientes...
            </span>
          </div>

          <div className="w-16 h-12 border border-dashed border-white/40 rounded flex items-center justify-center opacity-60">
            <span className="material-symbols-outlined text-[28px] text-white">
              barcode
            </span>
          </div>

          <div className="text-center mb-1">
            <span className="text-[11px] text-white/80 font-medium">
              Alinea la etiqueta dentro del marco
            </span>
          </div>
        </div>

          {cameraError && (
            <span className="text-[11px] text-[#dfe7bd] mt-3 z-10 bg-black/50 px-3 py-1 rounded-full">
              {cameraError}
            </span>
          )}
        </div>
      )}

      {/* Bottom Preset Picker & Manual Input (Solo visible si no está bloqueado por límite) */}
      {!isBlocked && (
        <div className="z-20 bg-gradient-to-t from-black via-black/90 to-transparent p-4 pb-safe flex flex-col gap-3 max-w-md mx-auto w-full">
          <div className="flex items-center justify-between text-xs text-[#dfe7bd]">
            <span className="font-bold uppercase tracking-wider">Muestras para prueba instantánea:</span>
            <span className="text-[10px] text-white/60">Haz clic para escanear</span>
          </div>

          {/* Quick Sample Carousel */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {allProducts.map((p) => (
              <button
                key={p.id}
                onClick={() => handleSelectProduct(p)}
                className="flex items-center gap-2 p-2 rounded-xl bg-white/10 hover:bg-[#cce510] hover:text-[#341011] transition-all shrink-0 text-left active:scale-95 border border-white/10 cursor-pointer"
              >
                <img
                  src={p.imageUrl}
                  alt={p.name}
                  className="w-8 h-8 rounded-lg object-cover"
                />
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold truncate max-w-[120px]">
                    {p.name}
                  </span>
                  <span
                    className={`text-[9px] font-bold uppercase ${
                      p.overallStatus === 'clean'
                        ? 'text-[#53BB26]'
                        : p.overallStatus === 'caution'
                        ? 'text-[#EBB414]'
                        : 'text-[#FF6161]'
                    }`}
                  >
                    {p.statusLabel}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Manual UPC input */}
          <form onSubmit={handleManualSubmit} className="flex items-center gap-2 mt-1">
            <div className="relative flex-1">
              <input
                type="text"
                value={manualUpc}
                onChange={(e) => setManualUpc(e.target.value)}
                placeholder="Ingresar código de barras o ingrediente..."
                className="w-full bg-white/15 text-white placeholder-white/50 text-[12px] px-3.5 py-2.5 rounded-full border border-white/20 focus:outline-none focus:border-[#cce510]"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 rounded-full bg-[#cce510] text-[#341011] font-bold text-[12px] active:scale-95 cursor-pointer"
            >
              Analizar
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
