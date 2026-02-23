import { useState, useCallback, useEffect, useRef } from "react";
import { getProtocolForModel } from "./useScaleProtocol";
import { toast } from "sonner";
import type { ScaleConfig } from "./useScaleConfig";

// Type definition for Web Serial API
declare global {
  interface Navigator {
    serial?: {
      requestPort(options?: { filters?: Array<{ usbVendorId?: number; usbProductId?: number }> }): Promise<any>;
      getPorts(): Promise<any[]>;
    };
  }
}

interface ScaleConnectionState {
  isConnected: boolean;
  weight: number;
  stable: boolean;
  error: string | null;
  port: any;
}

interface ScaleConnectionOptions {
  model?: string;
  config?: ScaleConfig | null;
}

export function useScaleConnection(options: ScaleConnectionOptions = {}) {
  const { model = "generic", config } = options;
  
  const [state, setState] = useState<ScaleConnectionState>({
    isConnected: false,
    weight: 0,
    stable: false,
    error: null,
    port: null,
  });

  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const readingRef = useRef(false);

  // Use config model if available, otherwise use passed model
  const effectiveModel = config?.model || model;
  const protocol = getProtocolForModel(effectiveModel);

  // Get connection settings from config or use defaults
  const getConnectionSettings = useCallback(() => {
    if (config) {
      return {
        baudRate: config.baud_rate || 9600,
        dataBits: config.data_bits || 8,
        stopBits: config.stop_bits || 1,
        parity: (config.parity || "none") as ParityType,
      };
    }
    // Default settings
    return {
      baudRate: 9600,
      dataBits: 8,
      stopBits: 1,
      parity: "none" as ParityType,
    };
  }, [config]);

  const connect = useCallback(async () => {
    // Check if Web Serial API is available
    if (!("serial" in navigator)) {
      toast.error("Seu navegador não suporta conexão com balança. Use Chrome ou Edge.");
      setState(prev => ({ ...prev, error: "Web Serial API not supported" }));
      return;
    }

    try {
      // Get connection settings from config
      const settings = getConnectionSettings();
      
      console.log("Connecting with settings:", settings);

      // Request port access
      // Note: Web Serial API requires user to select the port from browser dialog
      const port = await navigator.serial!.requestPort();
      
      // Open with configured settings
      await port.open(settings);

      setState(prev => ({
        ...prev,
        isConnected: true,
        port,
        error: null,
      }));

      toast.success(`Balança conectada! (${settings.baudRate} baud)`);

      // Start reading
      readingRef.current = true;
      startReading(port);
    } catch (error) {
      console.error("Error connecting to scale:", error);
      const message = error instanceof Error ? error.message : "Erro ao conectar";
      toast.error(`Erro ao conectar balança: ${message}`);
      setState(prev => ({ ...prev, error: message }));
    }
  }, [config, getConnectionSettings]);

  const startReading = async (port: any) => {
    if (!port.readable) return;

    const reader = port.readable.getReader();
    readerRef.current = reader;

    try {
      while (readingRef.current) {
        const { value, done } = await reader.read();
        
        if (done) break;
        if (!value) continue;

        const reading = protocol.parseResponse(value);
        if (reading && !reading.error) {
          setState(prev => ({
            ...prev,
            weight: reading.weight,
            stable: reading.stable,
          }));
        }
      }
    } catch (error) {
      console.error("Error reading from scale:", error);
    } finally {
      reader.releaseLock();
    }
  };

  const disconnect = useCallback(async () => {
    readingRef.current = false;

    if (readerRef.current) {
      try {
        await readerRef.current.cancel();
      } catch (e) {
        console.error("Error canceling reader:", e);
      }
      readerRef.current = null;
    }

    if (state.port) {
      try {
        await state.port.close();
      } catch (e) {
        console.error("Error closing port:", e);
      }
    }

    setState({
      isConnected: false,
      weight: 0,
      stable: false,
      error: null,
      port: null,
    });

    toast.info("Balança desconectada");
  }, [state.port]);

  const requestWeight = useCallback(async () => {
    if (!state.port?.writable || !protocol.requestWeightCommand) return;

    try {
      const writer = state.port.writable.getWriter();
      await writer.write(protocol.requestWeightCommand);
      writer.releaseLock();
    } catch (error) {
      console.error("Error requesting weight:", error);
    }
  }, [state.port, protocol]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      readingRef.current = false;
      if (readerRef.current) {
        readerRef.current.cancel().catch(() => {});
      }
    };
  }, []);

  return {
    ...state,
    connect,
    disconnect,
    requestWeight,
    config, // Expose current config
  };
}

// Type for parity
type ParityType = "none" | "even" | "odd" | "mark" | "space";
