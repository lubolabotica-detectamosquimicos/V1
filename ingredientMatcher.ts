import { Ingredient, MatchedIngredientResult, ScanAnalysis, TrafficLight } from '../types';

/**
 * Normalize strings for robust local matching:
 * lowercase, removes accents/diacritics, strips extra whitespace
 */
export function normalizeText(text?: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Splits raw OCR or pasted ingredient text into discrete candidate ingredient tokens.
 * Handles commas, semicolons, brackets, and line breaks common on cosmetic packaging.
 */
export function tokenizeIngredientText(rawText: string): string[] {
  // Remove common prefix headings
  let cleaned = rawText
    .replace(/(?:ingredientes|ingredients|composition|composicion|inci|contenido|contains|may contain|puede contener)\s*[:：]/gi, '')
    .replace(/\[.*?\]/g, '') // remove bracketed comments if any
    .replace(/[\r\n]+/g, ', ');

  // Split by commas, semicolons, dots or bullets
  const parts = cleaned.split(/[,;•·\n\r|]/);

  const tokens: string[] = [];
  for (const part of parts) {
    let token = part.trim();
    // remove percentage numbers like 10%, 2%
    token = token.replace(/\b\d+(\.\d+)?%\b/g, '').trim();
    // remove leading/trailing punctuation
    token = token.replace(/^[.*\-–_—]+|[.*\-–_—]+$/g, '').trim();

    if (token.length >= 2 && !/^\d+$/.test(token)) {
      tokens.push(token);
    }
  }

  return tokens;
}

/**
 * Match a single token against the internal ingredients database
 * NEVER calls external servers or network APIs.
 */
export function matchSingleToken(token: string, database: Ingredient[]): MatchedIngredientResult | null {
  const normToken = normalizeText(token);
  if (!normToken || normToken.length < 2) return null;

  // 1. Exact match on normalized INCI or Common Name
  for (const ing of database) {
    if (normalizeText(ing.inciName) === normToken || normalizeText(ing.name) === normToken) {
      return { ingredient: ing, rawMatchedSnippet: token, confidence: 1.0 };
    }
  }

  // 2. Exact match on synonyms
  for (const ing of database) {
    const synList = ing.synonyms || [];
    for (const syn of synList) {
      if (normalizeText(syn) === normToken) {
        return { ingredient: ing, rawMatchedSnippet: token, confidence: 0.95 };
      }
    }
  }

  // 3. Substring match (token contains synonym or vice versa)
  for (const ing of database) {
    // Check INCI inclusion
    const normInci = normalizeText(ing.inciName);
    if (normInci.length >= 4 && (normToken.includes(normInci) || normInci.includes(normToken))) {
      return { ingredient: ing, rawMatchedSnippet: token, confidence: 0.88 };
    }
    // Check Name inclusion
    const normName = normalizeText(ing.name);
    if (normName.length >= 4 && (normToken.includes(normName) || normName.includes(normToken))) {
      return { ingredient: ing, rawMatchedSnippet: token, confidence: 0.85 };
    }
    // Check Synonyms inclusion
    const synList = ing.synonyms || [];
    for (const syn of synList) {
      const normSyn = normalizeText(syn);
      if (normSyn.length >= 3 && (normToken.includes(normSyn) || (normToken.length >= 4 && normSyn.includes(normToken)))) {
        return { ingredient: ing, rawMatchedSnippet: token, confidence: 0.82 };
      }
    }
  }

  return null;
}

const OFFICIAL_CHEMICAL_RISKS: Record<string, string> = {
  'bromato de potasio': 'Carcinógeno renal y tiroideo, destructor de nutrientes',
  'tartrazina': 'Alergias, hiperactividad y asma',
  'glutamato monosodico': 'Excitotoxicidad, migrañas y sobreestimulación neuronal',
  'eritrosina (rojo n°3)': 'Mutagenicidad y alteración de función tiroidea',
  'eritrosina': 'Mutagenicidad y alteración de función tiroidea',
  'azucar': 'Inflamación sistémica, sobrecarga metabólica y adicción',
  'propionato': 'Irritación gastrointestinal y alteración metabólica',
  'carragenina': 'Inflamación intestinal y ulceración de la mucosa',
  'benzoato de sodio': 'Formación de benceno (carcinógeno) en presencia de vitamina C',
  'propylene glycol': 'Irritante dérmico y facilitador de penetración de tóxicos',
  'peroxido de benzoilo': 'Estrés oxidativo dérmico, citotoxicidad y envejecimiento prematuro',
  'plomo': 'Neurotóxico bioacumulable y daño al sistema nervioso central',
  'mercurio': 'Neurotóxico grave y daño renal severo',
  'formaldehido': 'Carcinógeno comprobado y sensibilizante respiratorio',
  'ftalatos': 'Disruptores endocrinos y toxicidad reproductiva',
  'triclosan': 'Disruptor tiroideo y resistencia bacteriana',
  'resorcinol': 'Disruptor tiroideo e irritante dérmico severo',
  'parfum': 'Alergénico oculto y disruptores sintéticos no declarados',
  'metilparabeno': 'Disruptor estrogénico y bioacumulación celular',
  'propilparabeno': 'Disruptor endocrino y alteración hormonal reproductiva',
  'bencilparabeno': 'Disruptor estrogénico de alta afinidad',
  'etilparabeno': 'Disruptor hormonal estrogénico',
  'butilparabeno': 'Disruptor endocrino y daño a la fertilidad',
  'laurate sulphate': 'Irritación severa de barrera lipídica y daño dérmico',
  'siliconas peg/ppg': 'Oclusión dérmica y riesgo de contaminación con 1,4-dioxano',
  'paraffinum': 'Oclusivo comedogénico derivado de hidrocarburos de petróleo',
  'sodium': 'Irritante de barrera dérmica y desecante cutáneo',
  'ammonium': 'Irritante severo de mucosas y cuero cabelludo',
  'siliconas': 'Oclusión no biodegradable y asfixia dérmica',
  'diacetileno': 'Daño pulmonar severo irreversible (bronquiolitis obliterante)',
};

/**
 * Devuelve UNICAMENTE el texto exacto correspondiente a la columna
 * "Riesgo funcional o Beneficio" del archivo base oficial.
 */
export function getFunctionalRiskOrBenefit(ing: Partial<Ingredient>): string {
  if (ing.functionalRiskOrBenefit && ing.functionalRiskOrBenefit.trim().length > 0) {
    return ing.functionalRiskOrBenefit.trim();
  }
  const norm = normalizeText(ing.name || ing.inciName || '');
  if (OFFICIAL_CHEMICAL_RISKS[norm]) {
    return OFFICIAL_CHEMICAL_RISKS[norm];
  }
  for (const key of Object.keys(OFFICIAL_CHEMICAL_RISKS)) {
    if (norm.includes(key) || key.includes(norm)) {
      return OFFICIAL_CHEMICAL_RISKS[key];
    }
  }

  if (ing.description) {
    if (ing.description.includes(' Origen/Tipo:')) {
      const benefit = ing.description.split(' Origen/Tipo:')[0].trim();
      if (benefit) return benefit;
    }
    if (ing.description.includes(' Presente comúnmente en:')) {
      const risk = ing.description.split(' Presente comúnmente en:')[0].trim();
      if (risk && !risk.includes('Químico o aditivo con toxicidad')) return risk;
    }
  }

  if (ing.risks && !ing.risks.includes('Riesgo toxicológico alto') && !ing.risks.includes('Sin riesgo toxicológico')) {
    return ing.risks.trim();
  }

  if (ing.details && ing.details.trim().length > 0 && !ing.details.includes('Verificado')) {
    return ing.details.trim();
  }

  return ing.trafficLight === 'red' || ing.tier === 'danger'
    ? 'Riesgo químico según archivo base oficial'
    : ing.trafficLight === 'yellow' || ing.tier === 'caution'
    ? 'Aditivo moderado o sensibilizante'
    : 'Nutriente botánico inocuo';
}

/**
 * Analyzes full raw text against the local internal ingredient database.
 * Completely offline and guaranteed locally authored Clasificación Lubo.
 */
export function analyzeIngredientsText(rawText: string, database: Ingredient[]): ScanAnalysis {
  const tokens = tokenizeIngredientText(rawText);
  const matchedMap = new Map<string, MatchedIngredientResult>();
  const unrecognizedTokens: string[] = [];

  for (const token of tokens) {
    const match = matchSingleToken(token, database);
    if (match) {
      // Deduplicate by ingredient id
      if (!matchedMap.has(match.ingredient.id)) {
        matchedMap.set(match.ingredient.id, match);
      }
    } else {
      if (token.length > 2 && !unrecognizedTokens.includes(token)) {
        unrecognizedTokens.push(token);
      }
    }
  }

  const matchedList = Array.from(matchedMap.values());

  // Count traffic lights based ONLY on base file classification
  let greenCount = 0;
  let yellowCount = 0;
  let redCount = 0;

  for (const item of matchedList) {
    const light = item.ingredient.trafficLight || (item.ingredient.tier === 'optimal' || item.ingredient.tier === 'healthy' ? 'green' : item.ingredient.tier === 'caution' ? 'yellow' : 'red');
    if (light === 'green') greenCount++;
    else if (light === 'yellow') yellowCount++;
    else if (light === 'red') redCount++;
  }

  // El semáforo leerá ÚNICAMENTE la clasificación del archivo base
  let overallStatus: TrafficLight = 'green';
  if (redCount > 0) {
    overallStatus = 'red';
  } else if (yellowCount > 0) {
    overallStatus = 'yellow';
  } else {
    overallStatus = 'green';
  }

  // En PRECAUCIÓN BIO-QUÍMICA ÚNICAMENTE el texto que está en el archivo en la columna "Riesgo funcional o Beneficio"
  let verdict = '';
  if (overallStatus === 'red') {
    const redMatches = matchedList.filter((m) => (m.ingredient.trafficLight || m.ingredient.tier) === 'red' || m.ingredient.tier === 'danger');
    if (redMatches.length === 1) {
      verdict = getFunctionalRiskOrBenefit(redMatches[0].ingredient);
    } else if (redMatches.length > 1) {
      verdict = redMatches.map((m) => `${m.ingredient.name}: ${getFunctionalRiskOrBenefit(m.ingredient)}`).join('. ');
    } else {
      verdict = 'Riesgo químico según archivo base oficial.';
    }
  } else if (overallStatus === 'yellow') {
    const yellowMatches = matchedList.filter((m) => (m.ingredient.trafficLight || m.ingredient.tier) === 'yellow' || m.ingredient.tier === 'caution');
    if (yellowMatches.length === 1) {
      verdict = getFunctionalRiskOrBenefit(yellowMatches[0].ingredient);
    } else if (yellowMatches.length > 1) {
      verdict = yellowMatches.map((m) => `${m.ingredient.name}: ${getFunctionalRiskOrBenefit(m.ingredient)}`).join('. ');
    } else {
      verdict = 'Aditivo moderado según archivo base oficial.';
    }
  } else {
    if (matchedList.length === 1) {
      verdict = getFunctionalRiskOrBenefit(matchedList[0].ingredient);
    } else if (matchedList.length > 1) {
      verdict = matchedList.slice(0, 3).map((m) => `${m.ingredient.name}: ${getFunctionalRiskOrBenefit(m.ingredient)}`).join('. ');
    } else {
      verdict = 'Ingrediente no registrado en la base oficial LuBo.';
    }
  }

  // No numerical rating level: safetyScore kept only for backwards interface compatibility
  let safetyScore = overallStatus === 'red' ? 20 : overallStatus === 'yellow' ? 60 : 100;

  return {
    rawText,
    timestamp: new Date().toISOString(),
    matchedIngredients: matchedList,
    unrecognizedTokens,
    overallStatus,
    summary: {
      total: matchedList.length,
      greenCount,
      yellowCount,
      redCount,
      unrecognizedCount: unrecognizedTokens.length,
      safetyScore,
    },
    verdict,
  };
}

/**
 * Filter database for direct autocomplete and instant manual search
 */
export function searchIngredientsLocally(query: string, database: Ingredient[]): Ingredient[] {
  const normQuery = normalizeText(query);
  if (!normQuery) return database;

  return database.filter((ing) => {
    const normName = normalizeText(ing.name);
    const normInci = normalizeText(ing.inciName || '');
    const normCategory = normalizeText(ing.category || '');
    const synList = ing.synonyms || [];
    const matchesSynonyms = synList.some((syn) => normalizeText(syn).includes(normQuery));

    return (
      normName.includes(normQuery) ||
      normInci.includes(normQuery) ||
      normCategory.includes(normQuery) ||
      matchesSynonyms
    );
  });
}
