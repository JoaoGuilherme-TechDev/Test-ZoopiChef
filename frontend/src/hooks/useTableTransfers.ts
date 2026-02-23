import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';

// Helper function to recalculate and update session total
async function recalculateSessionTotal(sessionId: string) {
  // Get sum of all active items in this session
  const { data: items } = await supabase
    .from('table_command_items')
    .select('total_price_cents')
    .eq('session_id', sessionId)
    .neq('status', 'canceled');
  
  const totalCents = items?.reduce((sum, item) => sum + (item.total_price_cents || 0), 0) || 0;
  
  // Update session total
  await supabase
    .from('table_sessions')
    .update({ 
      total_amount_cents: totalCents,
      last_activity_at: new Date().toISOString()
    })
    .eq('id', sessionId);
  
  return totalCents;
}

export function useTableTransfers() {
  const queryClient = useQueryClient();

  // Transfer items from one command to another (same or different session)
  const transferItemsToCommand = useMutation({
    mutationFn: async ({ 
      itemIds, 
      targetCommandId,
      quantities // Map of itemId -> quantity to transfer (for partial transfers)
    }: { 
      itemIds: string[];
      targetCommandId: string;
      quantities?: Record<string, number>;
    }) => {
      // Get target command's session and table first
      const { data: targetCommand } = await supabase
        .from('table_commands')
        .select('session_id, table_id')
        .eq('id', targetCommandId)
        .single();

      if (!targetCommand) {
        throw new Error('Target command not found');
      }

      // Track source sessions to recalculate
      const sourceSessionIds = new Set<string>();

      for (const itemId of itemIds) {
        const { data: item } = await supabase
          .from('table_command_items')
          .select('*')
          .eq('id', itemId)
          .single();

        if (!item) continue;

        // Track source session for recalculation
        if (item.session_id) {
          sourceSessionIds.add(item.session_id);
        }

        const transferQty = quantities?.[itemId] || item.quantity;

        if (transferQty >= item.quantity) {
          // Transfer entire item - update command_id, session_id, and table_id
          await supabase
            .from('table_command_items')
            .update({ 
              command_id: targetCommandId,
              session_id: targetCommand.session_id,
              table_id: targetCommand.table_id
            })
            .eq('id', itemId);
        } else {
          // Partial transfer - reduce quantity on original item
          await supabase
            .from('table_command_items')
            .update({ 
              quantity: item.quantity - transferQty,
              total_price_cents: item.unit_price_cents * (item.quantity - transferQty)
            })
            .eq('id', itemId);

          // Create new item on target command with correct session and table
          await supabase
            .from('table_command_items')
            .insert([{
              company_id: item.company_id,
              command_id: targetCommandId,
              session_id: targetCommand.session_id,
              table_id: targetCommand.table_id,
              product_id: item.product_id,
              product_name: item.product_name,
              quantity: transferQty,
              unit_price_cents: item.unit_price_cents,
              total_price_cents: item.unit_price_cents * transferQty,
              notes: item.notes,
              status: item.status,
            }]);
        }
      }

      // Recalculate totals for all affected sessions
      for (const sessionId of sourceSessionIds) {
        await recalculateSessionTotal(sessionId);
      }
      
      // Also recalculate target session
      await recalculateSessionTotal(targetCommand.session_id);

      // Check if source sessions are now empty and should be closed
      for (const sessionId of sourceSessionIds) {
        if (sessionId === targetCommand.session_id) continue; // Don't close target session
        
        const { data: remainingItems } = await supabase
          .from('table_command_items')
          .select('id')
          .eq('session_id', sessionId)
          .neq('status', 'canceled')
          .limit(1);
        
        if (!remainingItems || remainingItems.length === 0) {
          // Session is empty, close it and free the table
          const { data: session } = await supabase
            .from('table_sessions')
            .select('table_id')
            .eq('id', sessionId)
            .single();
          
          if (session) {
            await supabase
              .from('table_sessions')
              .update({ 
                status: 'closed', 
                closed_at: new Date().toISOString(),
                total_amount_cents: 0
              })
              .eq('id', sessionId);
            
            await supabase
              .from('tables')
              .update({ status: 'available' })
              .eq('id', session.table_id);
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-command-items'] });
      queryClient.invalidateQueries({ queryKey: ['table-commands'] });
      queryClient.invalidateQueries({ queryKey: ['table-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['table-session-items'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
  });

  // Transfer entire session to a different table
  const transferSessionToTable = useMutation({
    mutationFn: async ({ 
      sessionId, 
      targetTableId 
    }: { 
      sessionId: string;
      targetTableId: string;
    }) => {
      // Get original session
      const { data: session } = await supabase
        .from('table_sessions')
        .select('table_id')
        .eq('id', sessionId)
        .single();

      if (!session) throw new Error('Session not found');

      const originalTableId = session.table_id;

      // Update session's table_id
      await supabase
        .from('table_sessions')
        .update({ table_id: targetTableId })
        .eq('id', sessionId);

      // Update all commands' table_id
      await supabase
        .from('table_commands')
        .update({ table_id: targetTableId })
        .eq('session_id', sessionId);

      // Update all items' table_id
      await supabase
        .from('table_command_items')
        .update({ table_id: targetTableId })
        .eq('session_id', sessionId);

      // Update all payments' table_id
      await supabase
        .from('table_payments')
        .update({ table_id: targetTableId })
        .eq('session_id', sessionId);

      // Update original table to available
      await supabase
        .from('tables')
        .update({ status: 'available' })
        .eq('id', originalTableId);

      // Update target table to occupied
      await supabase
        .from('tables')
        .update({ status: 'occupied' })
        .eq('id', targetTableId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['table-commands'] });
      queryClient.invalidateQueries({ queryKey: ['table-command-items'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
  });

  // Merge two sessions (transfer all from source to target, close source)
  const mergeSessions = useMutation({
    mutationFn: async ({ 
      sourceSessionId, 
      targetSessionId 
    }: { 
      sourceSessionId: string;
      targetSessionId: string;
    }) => {
      // Get source session
      const { data: sourceSession } = await supabase
        .from('table_sessions')
        .select('table_id')
        .eq('id', sourceSessionId)
        .single();

      if (!sourceSession) throw new Error('Source session not found');

      // Get target session table_id for updating items
      const { data: targetSession } = await supabase
        .from('table_sessions')
        .select('table_id')
        .eq('id', targetSessionId)
        .single();

      if (!targetSession) throw new Error('Target session not found');

      // Update all commands to target session and table
      await supabase
        .from('table_commands')
        .update({ 
          session_id: targetSessionId,
          table_id: targetSession.table_id
        })
        .eq('session_id', sourceSessionId);

      // Update all items to target session and table
      await supabase
        .from('table_command_items')
        .update({ 
          session_id: targetSessionId,
          table_id: targetSession.table_id
        })
        .eq('session_id', sourceSessionId);

      // Transfer payments to target session and table
      await supabase
        .from('table_payments')
        .update({ 
          session_id: targetSessionId,
          table_id: targetSession.table_id
        })
        .eq('session_id', sourceSessionId);

      // Recalculate target session total
      await recalculateSessionTotal(targetSessionId);

      // Close source session
      await supabase
        .from('table_sessions')
        .update({ 
          status: 'closed',
          closed_at: new Date().toISOString(),
          total_amount_cents: 0
        })
        .eq('id', sourceSessionId);

      // Update source table to available
      await supabase
        .from('tables')
        .update({ status: 'available' })
        .eq('id', sourceSession.table_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['table-commands'] });
      queryClient.invalidateQueries({ queryKey: ['table-command-items'] });
      queryClient.invalidateQueries({ queryKey: ['table-payments'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
  });

  return {
    transferItemsToCommand,
    transferSessionToTable,
    mergeSessions,
  };
}
