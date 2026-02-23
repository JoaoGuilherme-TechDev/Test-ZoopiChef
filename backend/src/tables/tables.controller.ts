import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { TablesService } from './tables.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('tables')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @UseGuards(AuthGuard)
  @Get()
  findAll(@Query('companyId') companyId: string) {
    return this.tablesService.findAll(companyId);
  }

  @UseGuards(AuthGuard)
  @Post()
  create(@Body() createTableDto: { companyId: string; number: number; name?: string }) {
    return this.tablesService.create(createTableDto);
  }

  @UseGuards(AuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTableDto: any) {
    return this.tablesService.update(id, updateTableDto);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tablesService.remove(id);
  }
}

@Controller('table-sessions')
export class TableSessionsController {
  constructor(private readonly tablesService: TablesService) {}

  @UseGuards(AuthGuard)
  @Get()
  findAll(@Query('companyId') companyId: string, @Query('active') active?: string) {
    if (active === 'true') {
      return this.tablesService.findActiveSessions(companyId);
    }
    return this.tablesService.findSessions(companyId);
  }

  @UseGuards(AuthGuard)
  @Post()
  create(@Body() createSessionDto: any) {
    return this.tablesService.createSession(createSessionDto);
  }

  @UseGuards(AuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSessionDto: any) {
    return this.tablesService.updateSession(id, updateSessionDto);
  }

  @UseGuards(AuthGuard)
  @Post('open')
  async openTable(@Body() body: { companyId: string; tableId: string; customerName?: string; customerPhone?: string; peopleCount?: number }) {
    // Check if session exists first
    const existingSession = await this.tablesService.getOrCreateSession(body.companyId, body.tableId);
    
    // Update with customer info if provided
    if (body.customerName || body.customerPhone || body.peopleCount) {
        return this.tablesService.updateSession(existingSession.id, {
            customerName: body.customerName,
            customerPhone: body.customerPhone,
            peopleCount: body.peopleCount
        });
    }

    return existingSession;
  }
}

@Controller('table-commands')
export class TableCommandsController {
  constructor(private readonly tablesService: TablesService) {}

  @UseGuards(AuthGuard)
  @Get()
  findAll(@Query('sessionId') sessionId: string) {
    return this.tablesService.findCommands(sessionId);
  }

  @UseGuards(AuthGuard)
  @Post()
  create(@Body() createCommandDto: any) {
    return this.tablesService.createCommand(createCommandDto);
  }

  @UseGuards(AuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCommandDto: any) {
    return this.tablesService.updateCommand(id, updateCommandDto);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tablesService.deleteCommand(id);
  }
}

@Controller('table-command-items')
export class TableCommandItemsController {
  constructor(private readonly tablesService: TablesService) {}

  @UseGuards(AuthGuard)
  @Get()
  findAll(@Query('sessionId') sessionId?: string, @Query('commandId') commandId?: string) {
    if (sessionId) {
        return this.tablesService.findSessionItems(sessionId);
    }
    if (commandId) {
        return this.tablesService.findCommandItems(commandId);
    }
    return [];
  }

  @UseGuards(AuthGuard)
  @Post()
  create(@Body() createItemDto: any) {
    return this.tablesService.createCommandItem(createItemDto);
  }

  @UseGuards(AuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateItemDto: any) {
    return this.tablesService.updateCommandItem(id, updateItemDto);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tablesService.deleteCommandItem(id);
  }

  @UseGuards(AuthGuard)
  @Post(':id/transfer')
  transfer(@Param('id') id: string, @Body() body: { targetCommandId: string; quantity?: number }) {
    return this.tablesService.transferCommandItem(id, body.targetCommandId, body.quantity);
  }
}

@Controller('table-events')
export class TableEventsController {
  constructor(private readonly tablesService: TablesService) {}

  @UseGuards(AuthGuard)
  @Get()
  findAll(@Query('companyId') companyId: string, @Query('status') status?: string) {
    return this.tablesService.findEvents(companyId, status);
  }

  @UseGuards(AuthGuard)
  @Post()
  create(@Body() createEventDto: { companyId: string; tableId: string; eventType: string; notes?: string }) {
    return this.tablesService.createEvent(createEventDto);
  }

  @UseGuards(AuthGuard)
  @Patch(':id/resolve')
  resolve(@Param('id') id: string) {
    return this.tablesService.resolveEvent(id);
  }
}
