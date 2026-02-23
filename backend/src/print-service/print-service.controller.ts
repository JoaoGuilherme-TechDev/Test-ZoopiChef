import { Controller, Get, Post, Body, Res, HttpStatus } from '@nestjs/common';
import { PrintServiceService } from './print-service.service';
import { Response } from 'express';

// Controller for print service operations

@Controller('print-service')
export class PrintServiceController {
  constructor(private readonly printService: PrintServiceService) {}

  @Get('health')
  health(@Res() res: Response) {
    res.json({
      status: 'online',
      service: 'zoopi-print-service-nest',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  }

  @Post('test-connection')
  async testConnection(@Body() body: { host: string; port?: number }, @Res() res: Response) {
    const { host, port = 9100 } = body;

    if (!host) {
      return res.status(HttpStatus.BAD_REQUEST).json({ success: false, error: 'Host é obrigatório' });
    }

    try {
      const result = await this.printService.testPrinterConnection(host, port);
      res.json(result);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, error: error.message });
    }
  }

  @Post('print')
  async print(
    @Body()
    body: {
      host: string;
      port?: number;
      content: string;
      copies?: number;
      cut?: boolean;
      beep?: boolean;
      encoding?: string;
    },
    @Res() res: Response,
  ) {
    const {
      host,
      port = 9100,
      content,
      copies = 1,
      cut = true,
      beep = false,
      encoding = 'cp860',
    } = body;

    if (!host) {
      return res.status(HttpStatus.BAD_REQUEST).json({ success: false, error: 'Host é obrigatório' });
    }

    if (!content) {
      return res.status(HttpStatus.BAD_REQUEST).json({ success: false, error: 'Conteúdo é obrigatório' });
    }

    try {
      console.log(`[Print] Imprimindo em ${host}:${port} (${copies} cópia(s))`);

      for (let i = 0; i < copies; i++) {
        await this.printService.printToNetworkPrinter(host, port, content, { cut, beep, encoding });

        // Pequeno delay entre cópias
        if (i < copies - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      console.log(`[Print] Sucesso: ${copies} cópia(s) impressa(s)`);
      res.json({
        success: true,
        message: `Impresso com sucesso (${copies} cópia${copies > 1 ? 's' : ''})`,
        printedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`[Print] Erro:`, error.message);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, error: error.message });
    }
  }

  @Post('print-ticket')
  async printTicket(
    @Body()
    body: {
      host: string;
      port?: number;
      ticket: any;
      copies?: number;
      beep?: boolean;
    },
    @Res() res: Response,
  ) {
    const { host, port = 9100, ticket, copies = 1, beep = true } = body;

    if (!host || !ticket) {
      return res.status(HttpStatus.BAD_REQUEST).json({ success: false, error: 'Host e ticket são obrigatórios' });
    }

    try {
      const formattedContent = this.printService.formatTicket(ticket);

      for (let i = 0; i < copies; i++) {
        await this.printService.printToNetworkPrinter(host, port, formattedContent, {
          cut: true,
          beep,
          encoding: 'cp860',
        });
        if (i < copies - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      res.json({
        success: true,
        message: `Ticket impresso com sucesso`,
        printedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`[Print Ticket] Erro:`, error.message);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, error: error.message });
    }
  }

  @Get('printers')
  getPrinters(@Res() res: Response) {
    res.json({ printers: [] });
  }
}
