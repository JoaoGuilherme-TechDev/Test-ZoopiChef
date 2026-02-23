import { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Bot,
  Send,
  Loader2,
  Image,
  Mic,
  MicOff,
  FileText,
  X,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/lib/supabase-shim';
import { toast } from 'sonner';
import { useTTS } from '@/hooks/useTTS';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  inputType?: 'text' | 'audio' | 'image' | 'pdf';
  analysis?: {
    what_was_analyzed: string;
    key_findings: string[];
    suggested_actions: string[];
  };
  attachment?: {
    type: 'image' | 'audio' | 'pdf';
    name: string;
  };
}

// Generate unique session ID per chat session
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function AIAssistantChat() {
  const { data: profile } = useProfile();
  
  // Session ID is stable for the lifetime of the component
  const sessionId = useMemo(() => generateSessionId(), []);
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Olá! Sou seu assistente de IA. Posso analisar textos, imagens, áudios e PDFs para ajudar você a tomar decisões no seu negócio. Como posso ajudar?',
      inputType: 'text',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<{
    type: 'image' | 'pdf';
    base64: string;
    name: string;
    mimeType?: string;
  } | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const tts = useTTS({
    onError: () => toast.error('Erro ao gerar áudio'),
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error('Arquivo muito grande. Máximo 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      const isImage = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf';

      if (!isImage && !isPdf) {
        toast.error('Formato não suportado. Use imagem ou PDF.');
        return;
      }

      setAttachment({
        type: isImage ? 'image' : 'pdf',
        base64,
        name: file.name,
        mimeType: file.type,
      });
    };
    reader.readAsDataURL(file);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          sendMessage(input, undefined, base64);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Não foi possível acessar o microfone.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendMessage = async (
    text: string,
    imageData?: { base64: string; mimeType: string },
    audioBase64?: string,
    pdfData?: { base64: string; name: string }
  ) => {
    if (!profile?.company_id) {
      toast.error('Empresa não identificada.');
      return;
    }

    // Determine input type
    const inputType: 'text' | 'audio' | 'image' | 'pdf' = imageData
      ? 'image'
      : audioBase64
      ? 'audio'
      : pdfData
      ? 'pdf'
      : 'text';

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text || (imageData ? 'Analisar imagem' : audioBase64 ? 'Mensagem de voz' : 'Analisar documento'),
      inputType,
      attachment: imageData
        ? { type: 'image', name: 'imagem' }
        : audioBase64
        ? { type: 'audio', name: 'áudio' }
        : pdfData
        ? { type: 'pdf', name: pdfData.name }
        : undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setAttachment(null);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          message: text,
          companyId: profile.company_id,
          sessionId,
          imageBase64: imageData?.base64,
          imageMimeType: imageData?.mimeType,
          audioBase64,
          pdfBase64: pdfData?.base64,
          pdfName: pdfData?.name,
        },
      });

      if (error) throw error;
      
      // Check if response contains an error message
      if (data?.error) {
        throw new Error(data.error);
      }

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data?.text_response || 'Não foi possível processar a resposta.',
        inputType: 'text',
        analysis: data?.analysis,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AI Assistant error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setMessages(prev => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: `Desculpe, ocorreu um erro: ${errorMessage}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayAudio = async (messageId: string, text: string) => {
    if (playingMessageId === messageId) {
      tts.stopAudio();
      setPlayingMessageId(null);
      return;
    }

    setPlayingMessageId(messageId);
    const success = await tts.generateAndPlay(text);
    if (!success) {
      setPlayingMessageId(null);
    } else {
      // Reset when audio ends
      const checkPlaying = setInterval(() => {
        if (!tts.isPlaying) {
          setPlayingMessageId(null);
          clearInterval(checkPlaying);
        }
      }, 500);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !attachment) || isLoading) return;

    if (attachment?.type === 'image') {
      sendMessage(input, { base64: attachment.base64, mimeType: attachment.mimeType! });
    } else if (attachment?.type === 'pdf') {
      sendMessage(input, undefined, undefined, { base64: attachment.base64, name: attachment.name });
    } else {
      sendMessage(input);
    }
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <div className="p-4 border-b bg-primary/5">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          <span className="font-semibold">Assistente IA Multimodal</span>
          <Badge variant="outline" className="text-xs">Beta</Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Texto, Imagem, Áudio e PDF
        </p>
      </div>

      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "flex",
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  "max-w-[90%] rounded-2xl px-4 py-3",
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-muted rounded-bl-sm'
                )}
              >
                {msg.attachment && (
                  <div className="flex items-center gap-2 text-xs opacity-80 mb-2">
                    {msg.attachment.type === 'image' && <Image className="w-3 h-3" />}
                    {msg.attachment.type === 'audio' && <Mic className="w-3 h-3" />}
                    {msg.attachment.type === 'pdf' && <FileText className="w-3 h-3" />}
                    <span>{msg.attachment.name}</span>
                  </div>
                )}
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>

                {/* TTS Button for assistant messages */}
                {msg.role === 'assistant' && msg.content && (
                  <div className="mt-2 pt-2 border-t border-border/30">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs gap-1"
                      onClick={() => handlePlayAudio(msg.id, msg.content)}
                      disabled={tts.isGenerating}
                    >
                      {tts.isGenerating && playingMessageId === msg.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : playingMessageId === msg.id && tts.isPlaying ? (
                        <VolumeX className="w-3 h-3" />
                      ) : (
                        <Volume2 className="w-3 h-3" />
                      )}
                      {playingMessageId === msg.id && tts.isPlaying ? 'Parar' : 'Ouvir'}
                    </Button>
                  </div>
                )}

                {msg.analysis && (msg.analysis.key_findings?.length > 0 || msg.analysis.suggested_actions?.length > 0) && (
                  <div className="mt-3 pt-3 border-t border-border/50 space-y-3">
                    {msg.analysis.key_findings?.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1 text-xs font-medium mb-1">
                          <Lightbulb className="w-3 h-3" />
                          Descobertas
                        </div>
                        <ul className="text-xs space-y-1">
                          {msg.analysis.key_findings.map((finding, j) => (
                            <li key={j} className="flex items-start gap-1">
                              <CheckCircle2 className="w-3 h-3 mt-0.5 text-green-500 shrink-0" />
                              <span>{finding}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {msg.analysis.suggested_actions?.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1 text-xs font-medium mb-1">
                          <AlertTriangle className="w-3 h-3" />
                          Ações Sugeridas
                        </div>
                        <ul className="text-xs space-y-1">
                          {msg.analysis.suggested_actions.map((action, j) => (
                            <li key={j} className="flex items-start gap-1">
                              <span className="text-primary font-medium">{j + 1}.</span>
                              <span>{action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Analisando...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {attachment && (
        <div className="px-4 py-2 border-t bg-muted/50">
          <div className="flex items-center gap-2 text-sm">
            {attachment.type === 'image' ? (
              <Image className="w-4 h-4 text-primary" />
            ) : (
              <FileText className="w-4 h-4 text-primary" />
            )}
            <span className="truncate flex-1">{attachment.name}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setAttachment(null)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <CardContent className="p-4 border-t">
        <form onSubmit={handleSubmit} className="space-y-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite sua pergunta ou envie um arquivo..."
            disabled={isLoading || isRecording}
            className="min-h-[60px] resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || isRecording}
                title="Enviar imagem ou PDF"
              >
                <Image className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant={isRecording ? 'destructive' : 'outline'}
                size="icon"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isLoading}
                title={isRecording ? 'Parar gravação' : 'Gravar áudio'}
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
            </div>
            <Button
              type="submit"
              disabled={isLoading || isRecording || (!input.trim() && !attachment)}
              className="gap-2"
            >
              <Send className="w-4 h-4" />
              Enviar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
