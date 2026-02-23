/**
 * Formatação centralizada de tempo para todo o sistema
 * Formato: mm:ss (se < 60min) ou hh:mm:ss (se >= 60min)
 */

/**
 * Formata duração em segundos para string legível
 * @param seconds - Duração em segundos
 * @returns String no formato "mm:ss" ou "hh:mm:ss"
 */
export function formatDurationFromSeconds(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || isNaN(seconds)) return '--:--';
  
  const totalSeconds = Math.floor(Math.max(0, seconds));
  
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  
  const pad = (n: number) => n.toString().padStart(2, '0');
  
  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
  }
  
  return `${pad(minutes)}:${pad(secs)}min`;
}

/**
 * Formata duração em minutos para string legível
 * @param minutes - Duração em minutos (pode ter decimais)
 * @returns String no formato "mm:ss" ou "hh:mm:ss"
 */
export function formatDurationFromMinutes(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined || isNaN(minutes)) return '--:--';
  
  const totalSeconds = Math.floor(Math.max(0, minutes * 60));
  return formatDurationFromSeconds(totalSeconds);
}

/**
 * Formata duração em milissegundos para string legível
 * @param ms - Duração em milissegundos
 * @returns String no formato "mm:ss" ou "hh:mm:ss"
 */
export function formatDurationFromMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || isNaN(ms)) return '--:--';
  
  return formatDurationFromSeconds(Math.floor(ms / 1000));
}

/**
 * Calcula e formata a diferença entre duas datas
 * @param start - Data de início
 * @param end - Data de fim (default: agora)
 * @returns String no formato "mm:ss" ou "hh:mm:ss"
 */
export function formatElapsedTime(start: Date | string | null | undefined, end?: Date | string | null): string {
  if (!start) return '--:--';
  
  const startDate = typeof start === 'string' ? new Date(start) : start;
  const endDate = end ? (typeof end === 'string' ? new Date(end) : end) : new Date();
  
  const diffMs = endDate.getTime() - startDate.getTime();
  return formatDurationFromMs(diffMs);
}

/**
 * Formata para exibição simples em relatórios (ex: "16min", "1h23min")
 * @param minutes - Duração em minutos
 * @returns String no formato "Xmin" ou "XhYmin"
 */
export function formatMinutesShort(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined || isNaN(minutes)) return '-';
  
  const totalMinutes = Math.round(Math.max(0, minutes));
  
  if (totalMinutes < 60) {
    return `${totalMinutes}min`;
  }
  
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  
  if (mins === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h${mins}min`;
}
