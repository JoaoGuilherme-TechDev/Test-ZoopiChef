import { useState } from 'react';
import { Play, Clock, CheckCircle, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface VideoTutorial {
  id: string;
  title: string;
  description: string;
  duration: string; // "5:30" format
  thumbnail?: string;
  videoUrl: string;
  category: string;
  watched?: boolean;
}

interface VideoTutorialsProps {
  tutorials?: VideoTutorial[];
  onWatched?: (tutorialId: string) => void;
  className?: string;
}

const DEFAULT_TUTORIALS: VideoTutorial[] = [
  {
    id: '1',
    title: 'Como criar seu primeiro pedido',
    description: 'Aprenda a registrar pedidos de forma rápida e eficiente no sistema.',
    duration: '3:45',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    category: 'Primeiros Passos',
    watched: false,
  },
  {
    id: '2',
    title: 'Gerenciando o caixa diário',
    description: 'Tutorial completo sobre abertura, fechamento e movimentações do caixa.',
    duration: '5:20',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    category: 'Financeiro',
    watched: false,
  },
  {
    id: '3',
    title: 'Cadastrando produtos e categorias',
    description: 'Saiba como adicionar e organizar seus produtos no cardápio.',
    duration: '4:15',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    category: 'Produtos',
    watched: false,
  },
  {
    id: '4',
    title: 'Configurando impressoras',
    description: 'Configure suas impressoras para emitir comandas e recibos automaticamente.',
    duration: '6:00',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    category: 'Configurações',
    watched: false,
  },
  {
    id: '5',
    title: 'Relatórios e análises',
    description: 'Explore os relatórios disponíveis para entender melhor seu negócio.',
    duration: '7:30',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    category: 'Financeiro',
    watched: false,
  },
];

export function VideoTutorials({ tutorials = DEFAULT_TUTORIALS, onWatched, className }: VideoTutorialsProps) {
  const [selectedVideo, setSelectedVideo] = useState<VideoTutorial | null>(null);

  const watchedCount = tutorials.filter(t => t.watched).length;
  const progress = tutorials.length > 0 ? (watchedCount / tutorials.length) * 100 : 0;

  const groupedTutorials = tutorials.reduce((acc, tutorial) => {
    if (!acc[tutorial.category]) {
      acc[tutorial.category] = [];
    }
    acc[tutorial.category].push(tutorial);
    return acc;
  }, {} as Record<string, VideoTutorial[]>);

  const handlePlay = (tutorial: VideoTutorial) => {
    setSelectedVideo(tutorial);
    if (!tutorial.watched) {
      onWatched?.(tutorial.id);
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Progress Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <span className="font-medium">Seu progresso</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {watchedCount}/{tutorials.length} tutoriais
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </CardContent>
      </Card>

      {/* Tutorial List */}
      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-6">
          {Object.entries(groupedTutorials).map(([category, categoryTutorials]) => (
            <div key={category}>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                {category}
              </h3>
              <div className="space-y-3">
                {categoryTutorials.map((tutorial) => (
                  <Card 
                    key={tutorial.id}
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-md",
                      tutorial.watched && "bg-muted/30"
                    )}
                    onClick={() => handlePlay(tutorial)}
                  >
                    <CardContent className="p-3">
                      <div className="flex gap-3">
                        {/* Thumbnail */}
                        <div className="relative w-24 h-16 rounded-md bg-muted overflow-hidden shrink-0">
                          {tutorial.thumbnail ? (
                            <img 
                              src={tutorial.thumbnail} 
                              alt={tutorial.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/40">
                              <Play className="w-6 h-6 text-primary" />
                            </div>
                          )}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity">
                            <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center">
                              <Play className="w-4 h-4 text-primary fill-primary" />
                            </div>
                          </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-medium line-clamp-1">
                              {tutorial.title}
                            </h4>
                            {tutorial.watched && (
                              <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                            {tutorial.description}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="text-xs">
                              <Clock className="w-3 h-3 mr-1" />
                              {tutorial.duration}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Video Player Dialog */}
      <Dialog open={!!selectedVideo} onOpenChange={() => setSelectedVideo(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedVideo?.title}</DialogTitle>
          </DialogHeader>
          {selectedVideo && (
            <div className="space-y-4">
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <iframe
                  src={selectedVideo.videoUrl}
                  title={selectedVideo.title}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {selectedVideo.description}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
