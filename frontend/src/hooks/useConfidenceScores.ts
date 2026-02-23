import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@/lib/supabase-shim';
import { useProfile } from "./useProfile";

export type ConfidenceLevel = 'low' | 'medium' | 'high';
export type Module = 'gestora' | 'cardapio' | 'tv';

export interface ConfidenceScore {
  id: string;
  company_id: string;
  module: Module;
  suggestion_type: string;
  score: number;
  applied_count: number;
  ignored_count: number;
  positive_impact_count: number;
  negative_impact_count: number;
  updated_at: string;
}

// Map numeric score to confidence level
export const getConfidenceLevel = (score: number): ConfidenceLevel => {
  if (score >= 75) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
};

// Get label for confidence level
export const getConfidenceLevelLabel = (level: ConfidenceLevel): string => {
  switch (level) {
    case 'high': return 'Alta';
    case 'medium': return 'Média';
    case 'low': return 'Baixa';
  }
};

// Get color for confidence level
export const getConfidenceLevelColor = (level: ConfidenceLevel): string => {
  switch (level) {
    case 'high': return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
    case 'medium': return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30';
    case 'low': return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
  }
};

// Hook to fetch confidence scores for a company
export const useConfidenceScores = () => {
  const { data: profile } = useProfile();
  
  return useQuery({
    queryKey: ['confidence-scores', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      
      const { data, error } = await supabase
        .from('ai_confidence_scores')
        .select('*')
        .eq('company_id', profile.company_id);
      
      if (error) throw error;
      return data as ConfidenceScore[];
    },
    enabled: !!profile?.company_id
  });
};

// Get confidence for a specific module and suggestion type
export const useGetConfidence = () => {
  const { data: scores } = useConfidenceScores();
  
  return (module: Module, suggestionType: string): { score: number; level: ConfidenceLevel } => {
    const found = scores?.find(s => s.module === module && s.suggestion_type === suggestionType);
    const score = found?.score ?? 60; // Default score
    return { score, level: getConfidenceLevel(score) };
  };
};

// Hook to update confidence score based on user action
export const useUpdateConfidenceOnAction = () => {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      module, 
      suggestionType, 
      action 
    }: { 
      module: Module; 
      suggestionType: string; 
      action: 'applied' | 'dismissed'; 
    }) => {
      if (!profile?.company_id) throw new Error('No company');
      
      // First, get or create the score record
      const { data: existing } = await supabase
        .from('ai_confidence_scores')
        .select('*')
        .eq('company_id', profile.company_id)
        .eq('module', module)
        .eq('suggestion_type', suggestionType)
        .maybeSingle();
      
      if (existing) {
        // Update existing score
        const delta = action === 'dismissed' ? -1 : 0; // Ignored = -1, applied = wait for impact
        const newScore = Math.max(0, Math.min(100, existing.score + delta));
        const updates = action === 'dismissed' 
          ? { score: newScore, ignored_count: existing.ignored_count + 1 }
          : { applied_count: existing.applied_count + 1 };
        
        const { error } = await supabase
          .from('ai_confidence_scores')
          .update(updates)
          .eq('id', existing.id);
        
        if (error) throw error;
      } else {
        // Create new score record with initial score
        const initialScore = action === 'dismissed' ? 59 : 60;
        const { error } = await supabase
          .from('ai_confidence_scores')
          .insert({
            company_id: profile.company_id,
            module,
            suggestion_type: suggestionType,
            score: initialScore,
            applied_count: action === 'applied' ? 1 : 0,
            ignored_count: action === 'dismissed' ? 1 : 0
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['confidence-scores'] });
    }
  });
};

// Hook to update confidence based on impact result
export const useUpdateConfidenceOnImpact = () => {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      module, 
      suggestionType, 
      impactType 
    }: { 
      module: Module; 
      suggestionType: string; 
      impactType: 'positive' | 'neutral' | 'negative'; 
    }) => {
      if (!profile?.company_id) throw new Error('No company');
      
      const { data: existing } = await supabase
        .from('ai_confidence_scores')
        .select('*')
        .eq('company_id', profile.company_id)
        .eq('module', module)
        .eq('suggestion_type', suggestionType)
        .maybeSingle();
      
      if (!existing) return; // Nothing to update
      
      // Calculate score delta based on impact
      let delta = 0;
      if (impactType === 'positive') delta = 3;
      else if (impactType === 'negative') delta = -5;
      
      const newScore = Math.max(0, Math.min(100, existing.score + delta));
      
      const updates: Record<string, number> = { score: newScore };
      if (impactType === 'positive') {
        updates.positive_impact_count = existing.positive_impact_count + 1;
      } else if (impactType === 'negative') {
        updates.negative_impact_count = existing.negative_impact_count + 1;
      }
      
      const { error } = await supabase
        .from('ai_confidence_scores')
        .update(updates)
        .eq('id', existing.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['confidence-scores'] });
    }
  });
};

// Summary hook for dashboard
export const useConfidenceSummary = () => {
  const { data: scores, isLoading } = useConfidenceScores();
  
  const summary = {
    gestora: { avgScore: 60, count: 0 },
    cardapio: { avgScore: 60, count: 0 },
    tv: { avgScore: 60, count: 0 }
  };
  
  if (scores && scores.length > 0) {
    const modules: Module[] = ['gestora', 'cardapio', 'tv'];
    modules.forEach(module => {
      const moduleScores = scores.filter(s => s.module === module);
      if (moduleScores.length > 0) {
        const avg = moduleScores.reduce((sum, s) => sum + s.score, 0) / moduleScores.length;
        summary[module] = { avgScore: Math.round(avg), count: moduleScores.length };
      }
    });
  }
  
  return { summary, isLoading };
};
