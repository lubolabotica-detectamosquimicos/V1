import { Ingredient, TrafficLight } from '../types';
import { OFFICIAL_ONEDRIVE_FILE_URL, OFFICIAL_ONEDRIVE_FILENAME } from '../data/initialIngredients';

export { OFFICIAL_ONEDRIVE_FILE_URL, OFFICIAL_ONEDRIVE_FILENAME };

/**
 * Parses CSV lines considering quotes and commas/semicolons
 */
function parseCsvLine(line: string, delimiter: string = ','): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += char;
    }
  }
  result.push(cur.trim());
  return result;
}

/**
 * Translates localized traffic light string to typed TrafficLight
 */
function mapTrafficLight(value: string): TrafficLight {
  const clean = value.toLowerCase().trim();
  if (clean === 'verde' || clean === 'green' || clean === 'seguro' || clean === 'safe') return 'green';
  if (clean === 'amarillo' || clean === 'yellow' || clean === 'precaucion' || clean === 'caution' || clean === 'moderado') return 'yellow';
  return 'red';
}

export const OneDriveSyncService = {
  OFFICIAL_URL: OFFICIAL_ONEDRIVE_FILE_URL,
  OFFICIAL_FILENAME: OFFICIAL_ONEDRIVE_FILENAME,

  /**
   * Generates a standard CSV string suitable for Microsoft OneDrive / Excel
   * using the official format matching INGREDIENTESnaturales y quimicos_Lubo_unificado.xlsx
   */
  generateCsvFromIngredients(ingredients: Ingredient[]): string {
    const headers = [
      'Categoria_Color',
      'Químico',
      'Uso principal',
      'Riesgo funcional o Beneficio',
      'Nivel de toxisidad (%)',
      'Producto donde se usa más',
    ];

    const rows = ingredients.map((item) => {
      const escape = (val: string | number | undefined) => `"${String(val ?? '').replace(/"/g, '""')}"`;
      const catColor = item.trafficLight === 'red' ? 'Rojo' : item.trafficLight === 'yellow' ? 'Amarillo' : 'Verde';
      const uso = item.category || item.mainUse || 'Ambos';
      const riesgo = item.functionalRiskOrBenefit || item.risks || item.description || '';
      const tox = item.toxicityPercentage ?? (item.trafficLight === 'red' ? 80 : 0);
      const prod = item.foundIn || '';

      return [
        escape(catColor),
        escape(item.name),
        escape(uso),
        escape(riesgo),
        escape(tox),
        escape(prod),
      ].join(';');
    });

    return [headers.join(';'), ...rows].join('\r\n');
  },

  /**
   * Downloads the CSV file for direct editing in OneDrive / Excel
   */
  downloadOneDriveTemplate(ingredients: Ingredient[]): void {
    const csvContent = '\uFEFF' + this.generateCsvFromIngredients(ingredients); // UTF-8 BOM
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${OFFICIAL_ONEDRIVE_FILENAME.replace('.xlsx', '')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  /**
   * Parses a CSV file exported from OneDrive / Excel and transforms into Ingredient objects.
   * Supports BOTH the official 6-column sheet schema ('Categoria_Color', 'Químico', ...)
   * and the detailed 11-column LuBo format.
   */
  parseOneDriveCsv(csvText: string): { success: boolean; ingredients: Ingredient[]; errors: string[] } {
    const errors: string[] = [];
    const ingredients: Ingredient[] = [];

    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      return { success: false, ingredients: [], errors: ['El archivo CSV de OneDrive está vacío o no tiene encabezados.'] };
    }

    const headerLine = lines[0];
    const delimiter = headerLine.includes(';') ? ';' : ',';
    const headerCols = parseCsvLine(headerLine, delimiter).map((c) => c.replace(/^"|"$/g, '').trim().toLowerCase());

    const isOfficialSchema = headerCols.some((c) => c.includes('categoria') || c.includes('quimico') || c.includes('químico'));

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      try {
        const cols = parseCsvLine(line, delimiter).map((c) => c.replace(/^"|"$/g, '').trim());
        if (cols.length < 2) continue;

        if (isOfficialSchema) {
          // Columns: Categoria_Color; Químico; Uso principal; Riesgo funcional o Beneficio; Nivel de toxisidad (%); Producto donde se usa más
          const [catColorRaw, name, usoRaw, riesgoRaw, toxRaw, productoRaw] = cols;
          if (!name) continue;

          const trafficLight = mapTrafficLight(catColorRaw || 'green');
          const isRed = trafficLight === 'red';
          const toxVal = toxRaw && !isNaN(parseFloat(toxRaw)) ? parseFloat(toxRaw) : (isRed ? 80 : 0);
          const score = roundScore(isRed ? Math.max(1, 10 - toxVal / 10) : Math.max(8.5, 10 - toxVal / 20));

          const syns = [name.toLowerCase()];
          const cleanParen = name.match(/\((.*?)\)/);
          if (cleanParen) {
            cleanParen[1].split(/[,/]/).forEach((s) => {
              if (s.trim().length > 1) syns.push(s.trim().toLowerCase());
            });
          }

          ingredients.push({
            id: `lubo-od-${Date.now()}-${i}`,
            name,
            inciName: name,
            synonyms: Array.from(new Set(syns)),
            trafficLight,
            tier: isRed ? 'danger' : trafficLight === 'yellow' ? 'caution' : 'optimal',
            category: usoRaw || 'General',
            mainUse: usoRaw || 'General',
            functionalRiskOrBenefit: riesgoRaw || (isRed ? 'Riesgo químico según base oficial' : 'Nutriente botánico seguro'),
            description: riesgoRaw || (isRed ? `Químico tóxico (${toxVal}%)` : 'Ingrediente natural seguro.'),
            risks: isRed ? (riesgoRaw || `Toxicidad alta (${toxVal}%)`) : (riesgoRaw || 'Inocuo y seguro.'),
            details: riesgoRaw || (productoRaw ? `Usado en: ${productoRaw}` : 'Verificado en archivo OneDrive.'),
            recommendedAlternative: isRed ? 'Buscar alternativa botánica limpia LuBo.' : 'Aprobado según estándar LuBo.',
            origin: isRed ? 'sintético' : 'natural',
            score,
            toxicityPercentage: toxVal,
            foundIn: productoRaw || '',
            updatedAt: new Date().toISOString().split('T')[0],
          });
        } else {
          // 11-column format
          const [
            id,
            name,
            inciName,
            semaforoRaw,
            category,
            description,
            risks,
            recommendedAlternative,
            synonymsRaw,
            originRaw,
            scoreRaw,
          ] = cols;

          if (!name && !inciName) continue;

          const trafficLight = mapTrafficLight(semaforoRaw || 'yellow');
          const synonyms = synonymsRaw ? synonymsRaw.split('|').map((s) => s.trim()).filter(Boolean) : [];
          const score = scoreRaw ? Math.min(10, Math.max(1, parseFloat(scoreRaw) || 5)) : trafficLight === 'green' ? 9.5 : trafficLight === 'yellow' ? 6 : 2;

          ingredients.push({
            id: id || `lubo-od-${Date.now()}-${i}`,
            name: name || inciName,
            inciName: inciName || name,
            synonyms,
            trafficLight,
            category: category || 'General',
            description: description || 'Sin descripción.',
            risks: risks || 'Sin riesgos descritos.',
            details: description || 'Componente verificado desde OneDrive.',
            tier: trafficLight === 'green' ? 'optimal' : trafficLight === 'yellow' ? 'caution' : 'danger',
            recommendedAlternative: recommendedAlternative || '',
            origin: (originRaw === 'natural' || originRaw === 'sintético' || originRaw === 'mixto') ? originRaw : 'mixto',
            score,
            updatedAt: new Date().toISOString().split('T')[0],
          });
        }
      } catch (err: any) {
        errors.push(`Fila ${i + 1}: Error (${err.message}).`);
      }
    }

    return {
      success: ingredients.length > 0,
      ingredients,
      errors,
    };
  },
};

function roundScore(val: number): number {
  return Math.round(val * 10) / 10;
}
