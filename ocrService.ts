import { createWorker } from 'tesseract.js';

export interface OcrProgress {
  status: string;
  progress: number; // 0 to 1
}

/**
 * Preprocesses an image using HTML5 Canvas to optimize OCR readability:
 * Converts to grayscale, enhances contrast, and binarizes text.
 */
export async function preprocessImageForOcr(imageSrc: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(imageSrc);
        return;
      }

      // Max dimension constraint to ensure fast local processing
      const maxDim = 1600;
      let width = img.width;
      let height = img.height;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;

      // Grayscale and simple contrast stretch
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        // Luminance formula
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        
        // Contrast enhancement
        const contrast = 1.3;
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
        const finalColor = Math.min(255, Math.max(0, factor * (gray - 128) + 128));

        data[i] = finalColor;
        data[i + 1] = finalColor;
        data[i + 2] = finalColor;
      }

      ctx.putImageData(imgData, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };

    img.onerror = () => resolve(imageSrc);
    img.src = imageSrc;
  });
}

/**
 * Performs local optical character recognition on-device with Tesseract.js.
 * Strictly in-browser; zero data sent to external servers or cloud APIs.
 */
export async function runLocalOcr(
  imageSource: string,
  onProgress?: (progress: OcrProgress) => void
): Promise<string> {
  let worker: any = null;
  try {
    if (onProgress) onProgress({ status: 'Inicializando motor OCR local...', progress: 0.1 });
    
    // Preprocess image for crisp label recognition
    const processedImage = await preprocessImageForOcr(imageSource);
    
    if (onProgress) onProgress({ status: 'Cargando modelos lingüísticos...', progress: 0.25 });

    worker = await createWorker('spa+eng', 1, {
      logger: (m) => {
        if (onProgress && m.status === 'recognizing text') {
          onProgress({
            status: 'Leyendo texto de etiqueta en el dispositivo...',
            progress: 0.3 + m.progress * 0.65,
          });
        }
      },
    });

    if (onProgress) onProgress({ status: 'Extrayendo caracteres...', progress: 0.5 });
    const ret = await worker.recognize(processedImage);

    if (onProgress) onProgress({ status: 'Completado', progress: 1.0 });
    return ret.data.text || '';
  } catch (error) {
    console.error('OCR Processing error:', error);
    throw error;
  } finally {
    if (worker) {
      await worker.terminate();
    }
  }
}

/**
 * Pre-configured cosmetic label presets for instant local demonstration
 */
export const SAMPLE_LABELS = [
  {
    id: 'sample-clean',
    title: '🌿 Sérum Facial Botánico (100% Limpio)',
    description: 'Etiqueta con base botánica pura: Aloe Vera, Ácido Hialurónico, Glicerina Vegetal y Caléndula.',
    text: 'INGREDIENTES: Aqua, Aloe Barbadensis Leaf Juice, Glycerin, Sodium Hyaluronate, Calendula Officinalis Flower Extract, Tocopherol, Panthenol.',
    type: 'clean',
  },
  {
    id: 'sample-toxic',
    title: '⚠️ Loción Comercial con Parabenos y Sulfatos',
    description: 'Etiqueta industrial con Methylparaben, Dimethicone, SLES y BHT.',
    text: 'INGREDIENTS: Water (Aqua), Sodium Laureth Sulfate (SLES), Dimethicone, Methylparaben, Propylparaben, BHT, Parfum (Fragrance), Phenoxyethanol, PEG-100 Stearate.',
    type: 'alert',
  },
  {
    id: 'sample-caution',
    title: '🟡 Exfoliante con Activos Potentes (Precaución)',
    description: 'Etiqueta con Retinol, Ácido Salicílico y Alcohol Denat.',
    text: 'COMPOSICIÓN: Aqua, Alcohol Denat., Salicylic Acid (2%), Retinol, Niacinamide, Sodium Benzoate, Titanium Dioxide, Parfum.',
    type: 'caution',
  },
];
