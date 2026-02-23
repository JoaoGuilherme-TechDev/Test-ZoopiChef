import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useProfile } from './useProfile';
import { toast } from '@/hooks/use-toast';
import { createMenuSnapshot } from './useMenuVersions';
import type { AIRecommendation } from './useAIRecommendations';

interface ApplyResult {
  success: boolean;
  message: string;
  action?: string;
  versionId?: string | null;
}

export function useApplyRecommendation() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async (recommendation: AIRecommendation): Promise<ApplyResult> => {
      if (!profile?.company_id || !profile?.id) {
        throw new Error('Empresa não encontrada');
      }

      const payload = recommendation.action_payload_json || {};
      let result: ApplyResult = { success: false, message: 'Ação não implementada', versionId: null };
      let affectedProductIds: string[] = [];

      // Extract product IDs that will be affected
      switch (recommendation.action_type) {
        case 'highlight_product': {
          const products = payload.not_on_tv as Array<{ id: string }> || [];
          affectedProductIds = products.map(p => p.id);
          break;
        }
        case 'auto_tv_promo': {
          const products = payload.products as Array<{ id: string }> || 
                          payload.suggested_products as Array<{ id: string }> || [];
          affectedProductIds = products.map(p => p.id);
          break;
        }
        case 'auto_tv_rotation': {
          const topSellers = payload.top_sellers as Array<{ id: string }> || [];
          const needHighlight = payload.need_highlight as Array<{ id: string }> || [];
          const quickItems = payload.quick_items as Array<{ id: string }> || [];
          affectedProductIds = [...topSellers, ...needHighlight, ...quickItems].map(p => p.id);
          break;
        }
        case 'suggest_promo': {
          const products = payload.products as Array<{ id: string }> || [];
          affectedProductIds = products.map(p => p.id);
          break;
        }
        case 'menu':
        case 'price':
        case 'combo':
        case 'promo':
        case 'remove':
        case 'tv': {
          // New explainable AI format - extract from suggested_action
          const suggestedAction = payload.suggested_action as { details?: { product_ids?: string[] } } | undefined;
          if (suggestedAction?.details?.product_ids) {
            affectedProductIds = suggestedAction.details.product_ids;
          }
          break;
        }
      }

      // Create snapshot BEFORE applying changes
      let versionId: string | null = null;
      if (affectedProductIds.length > 0) {
        versionId = await createMenuSnapshot(
          profile.company_id,
          profile.id,
          `Antes: ${recommendation.title}`,
          affectedProductIds
        );
      }

      switch (recommendation.action_type) {
        // highlight_product → marcar aparece_tv=true
        case 'highlight_product': {
          const products = payload.not_on_tv as Array<{ id: string; name: string }> || [];
          if (products.length > 0) {
            const productIds = products.map(p => p.id);
            const { error } = await supabase
              .from('products')
              .update({ aparece_tv: true })
              .in('id', productIds);

            if (error) throw error;
            
            result = {
              success: true,
              message: `${products.length} produto(s) agora aparecem na TV`,
              action: 'products_updated',
              versionId
            };
          }
          break;
        }

        // create_tv_banner → ativar banner ou criar novo
        case 'create_tv_banner': {
          const topProductName = payload.top_product_name as string;
          if (topProductName) {
            const { error } = await supabase
              .from('banners')
              .insert({
                company_id: profile.company_id,
                title: `🔥 ${topProductName} - Mais Vendido!`,
                image_url: 'https://placehold.co/1920x1080/e74c3c/ffffff?text=' + encodeURIComponent(topProductName),
                active: true,
                display_order: 0
              });

            if (error) throw error;

            result = {
              success: true,
              message: `Banner criado para "${topProductName}"`,
              action: 'banner_created',
              versionId
            };
          } else {
            result = {
              success: true,
              message: 'Acesse a página de Banners para criar um banner promocional',
              action: 'redirect_banners',
              versionId
            };
          }
          break;
        }

        // auto_tv_promo → destacar produtos na TV
        case 'auto_tv_promo': {
          const products = payload.products as Array<{ id: string; name: string }> || 
                          payload.suggested_products as Array<{ id: string; name: string }> || [];
          if (products.length > 0) {
            const productIds = products.map(p => p.id);
            const { error } = await supabase
              .from('products')
              .update({ aparece_tv: true })
              .in('id', productIds);

            if (error) throw error;

            const firstName = products[0]?.name;
            if (firstName) {
              await supabase
                .from('banners')
                .insert({
                  company_id: profile.company_id,
                  title: `📢 Promoção: ${firstName}`,
                  image_url: 'https://placehold.co/1920x1080/27ae60/ffffff?text=' + encodeURIComponent(`Promoção ${firstName}`),
                  active: true,
                  display_order: 0
                });
            }

            result = {
              success: true,
              message: `${products.length} produto(s) destacados na TV com banner promocional`,
              action: 'promo_activated',
              versionId
            };
          }
          break;
        }

        // auto_tv_rotation → ativar rotação de produtos na TV
        case 'auto_tv_rotation': {
          const topSellers = payload.top_sellers as Array<{ id: string; name: string }> || [];
          const needHighlight = payload.need_highlight as Array<{ id: string; name: string }> || [];
          const quickItems = payload.quick_items as Array<{ id: string; name: string }> || [];

          const allProducts = [...topSellers, ...needHighlight, ...quickItems];
          if (allProducts.length > 0) {
            const productIds = allProducts.map(p => p.id);
            const { error } = await supabase
              .from('products')
              .update({ aparece_tv: true })
              .in('id', productIds);

            if (error) throw error;

            result = {
              success: true,
              message: `Rotação de ${allProducts.length} produtos ativada na TV`,
              action: 'rotation_activated',
              versionId
            };
          }
          break;
        }

        // suggest_promo → criar promoção (marcar produtos como destaque)
        case 'suggest_promo': {
          const products = payload.products as Array<{ id: string; name: string }> || [];
          if (products.length > 0) {
            const productIds = products.map(p => p.id);
            const { error } = await supabase
              .from('products')
              .update({ aparece_tv: true })
              .in('id', productIds);

            if (error) throw error;

            const productNames = products.slice(0, 2).map(p => p.name).join(' & ');
            await supabase
              .from('banners')
              .insert({
                company_id: profile.company_id,
                title: `🎉 Promoção Especial: ${productNames}`,
                image_url: 'https://placehold.co/1920x1080/9b59b6/ffffff?text=' + encodeURIComponent(`Promoção ${productNames}`),
                active: true,
                display_order: 0
              });

            result = {
              success: true,
              message: `Promoção criada para ${products.length} produto(s)`,
              action: 'promo_created',
              versionId
            };
          } else {
            result = {
              success: true,
              message: 'Configure a promoção manualmente na página de Produtos',
              action: 'manual_action',
              versionId
            };
          }
          break;
        }

        // create_combo → sugerir criação de combo
        case 'create_combo': {
          const items = payload.suggested_items as Array<{ name: string; count: number }> || [];
          if (items.length >= 2) {
            const comboName = items.slice(0, 2).map(i => i.name).join(' + ');
            
            await supabase
              .from('banners')
              .insert({
                company_id: profile.company_id,
                title: `🍔 Combo: ${comboName}`,
                image_url: 'https://placehold.co/1920x1080/f39c12/ffffff?text=' + encodeURIComponent(`Combo ${comboName}`),
                active: true,
                display_order: 0
              });

            result = {
              success: true,
              message: `Banner de combo criado: ${comboName}. Crie o produto combo manualmente.`,
              action: 'combo_banner_created',
              versionId
            };
          }
          break;
        }

        // New explainable AI types
        case 'menu':
        case 'tv': {
          const suggestedAction = payload.suggested_action as { details?: { product_ids?: string[] } } | undefined;
          const productIds = suggestedAction?.details?.product_ids || [];
          if (productIds.length > 0) {
            const { error } = await supabase
              .from('products')
              .update({ aparece_tv: true })
              .in('id', productIds);

            if (error) throw error;

            result = {
              success: true,
              message: `${productIds.length} produto(s) atualizados`,
              action: 'products_updated',
              versionId
            };
          } else {
            result = {
              success: true,
              message: 'Verifique os detalhes e aplique manualmente na página de Produtos',
              action: 'manual_action',
              versionId
            };
          }
          break;
        }

        case 'price':
        case 'promo':
        case 'combo':
        case 'remove': {
          result = {
            success: true,
            message: 'Verifique os detalhes e aplique manualmente na página de Produtos',
            action: 'manual_action',
            versionId
          };
          break;
        }

        // suggest_price_adjust → apenas notificar (requer ação manual)
        case 'suggest_price_adjust': {
          result = {
            success: true,
            message: 'Ajuste os preços manualmente na página de Produtos',
            action: 'manual_action',
            versionId
          };
          break;
        }

        // suggest_operational_adjust → apenas notificar
        case 'suggest_operational_adjust': {
          result = {
            success: true,
            message: 'Verifique a operação na página de Pedidos',
            action: 'manual_action',
            versionId
          };
          break;
        }

        // suggest_payment_method → apenas notificar
        case 'suggest_payment_method': {
          result = {
            success: true,
            message: 'Configure incentivos de pagamento nas configurações',
            action: 'manual_action',
            versionId
          };
          break;
        }

        // suggest_delivery_adjust → apenas notificar
        case 'suggest_delivery_adjust': {
          result = {
            success: true,
            message: 'Ajuste as configurações de entrega',
            action: 'manual_action',
            versionId
          };
          break;
        }

        default:
          result = {
            success: false,
            message: `Ação "${recommendation.action_type}" não implementada ainda`,
            action: 'not_implemented',
            versionId
          };
      }

      // Update recommendation status to applied with timestamp
      if (result.success) {
        const { error: updateError } = await supabase
          .from('ai_recommendations')
          .update({ 
            status: 'applied',
            applied_at: new Date().toISOString(),
          })
          .eq('id', recommendation.id);

        if (updateError) {
          console.error('Error updating recommendation status:', updateError);
        }
      }

      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['ai-recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['banners'] });
      queryClient.invalidateQueries({ queryKey: ['menu-versions'] });

      const message = result.versionId 
        ? `${result.message}. Você pode desfazer essa mudança.`
        : result.message;

      toast({
        title: result.success ? 'Ação aplicada' : 'Atenção',
        description: message,
        variant: result.success ? 'default' : 'destructive',
      });
    },
    onError: (error) => {
      console.error('Error applying recommendation:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível aplicar a recomendação',
        variant: 'destructive',
      });
    },
  });
}
