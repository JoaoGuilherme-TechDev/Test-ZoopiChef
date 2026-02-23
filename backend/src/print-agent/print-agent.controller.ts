import { Controller, Get, Post, Body, Res, HttpStatus, UseGuards } from '@nestjs/common';
import { PrintAgentService } from './print-agent.service';
import { Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';

@Controller('print-agent')
export class PrintAgentController {
  constructor(private readonly printAgentService: PrintAgentService) {}

  @Get('health')
  health(@Res() res: Response) {
    res.json({
      status: 'ok',
      version: '3.0.0',
      timestamp: new Date().toISOString(),
      service: 'zoopi-print-agent-nest',
    });
  }

  @UseGuards(AuthGuard)
  @Get('printers')
  getPrinters(@Res() res: Response) {
    const printers = this.printAgentService.getPrinters();
    res.json({
      success: true,
      printers: printers.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        category: p.category,
      })),
    });
  }

  @UseGuards(AuthGuard)
  @Get('system-printers')
  async getSystemPrinters(@Res() res: Response) {
    try {
      const printers = await this.printAgentService.getSystemPrinters();
      res.json({ success: true, printers });
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, error: error.message });
    }
  }

  @UseGuards(AuthGuard)
  @Post('print')
  async print(
    @Body()
    body: {
      printerId?: string;
      printerCategory?: string;
      ticketData?: any;
      rawEscPos?: string;
    },
    @Res() res: Response,
  ) {
    try {
      const { printerId, ticketData, rawEscPos } = body;

      if (!printerId && !body.printerCategory) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          error: 'printerId ou printerCategory é obrigatório',
        });
      }

      // Busca impressora configurada
      const printers = this.printAgentService.getPrinters();
      let printer;

      if (printerId) {
        printer = printers.find((p) => p.id === printerId);
      } else if (body.printerCategory) {
        // Busca por categoria (ex: 'cozinha', 'bar', 'principal')
        printer = printers.find((p) => p.category === body.printerCategory);
      }

      if (!printer) {
        return res.status(HttpStatus.NOT_FOUND).json({
          success: false,
          error: `Impressora não encontrada: ${printerId || body.printerCategory}`,
        });
      }

      // Se já temos ESC/POS pronto, envia direto
      if (rawEscPos) {
        const buffer = Buffer.from(rawEscPos, 'base64');
        if (printer.type === 'network') {
          await this.printAgentService.sendToNetworkPrinter(
            printer.host,
            printer.port || 9100,
            buffer,
          );
        } else {
          await this.printAgentService.sendToUSBPrinter(printer.name, buffer);
        }
      } else if (ticketData) {
        // Formata e imprime o ticket
        await this.printAgentService.printTicket(printer, ticketData);
      } else {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          error: 'ticketData ou rawEscPos é obrigatório',
        });
      }

      res.json({
        success: true,
        message: 'Impressão enviada com sucesso',
        printer: printer.name,
      });
    } catch (error) {
      console.error('[Server] Print error:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: error.message,
      });
    }
  }

  @Post('test-print')
  async testPrint(@Body() body: { printerId: string }, @Res() res: Response) {
    try {
      const { printerId } = body;
      const printers = this.printAgentService.getPrinters();
      const printer = printers.find((p) => p.id === printerId);

      if (!printer) {
        return res.status(HttpStatus.NOT_FOUND).json({
          success: false,
          error: 'Impressora não encontrada',
        });
      }

      const result = await this.printAgentService.testPrint(printer);
      res.json(result);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: error.message,
      });
    }
  }
}
