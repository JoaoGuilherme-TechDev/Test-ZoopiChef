import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @UseGuards(AuthGuard)
  @Get('settings')
  getSettings(@Query('companyId') companyId: string) {
    return this.reservationsService.getSettings(companyId);
  }

  @UseGuards(AuthGuard)
  @Patch('settings')
  upsertSettings(@Query('companyId') companyId: string, @Body() settings: any) {
    return this.reservationsService.upsertSettings(companyId, settings);
  }

  @UseGuards(AuthGuard)
  @Get('waitlist')
  getWaitlist(@Query('companyId') companyId: string) {
    return this.reservationsService.getWaitlist(companyId);
  }

  @UseGuards(AuthGuard)
  @Post('waitlist')
  addToWaitlist(@Body() entry: any) {
    return this.reservationsService.addToWaitlist(entry);
  }

  @UseGuards(AuthGuard)
  @Delete('waitlist/:id')
  removeFromWaitlist(@Param('id') id: string) {
    return this.reservationsService.removeFromWaitlist(id);
  }

  @UseGuards(AuthGuard)
  @Patch('waitlist/:id/convert')
  convertWaitlistToReservation(@Param('id') id: string, @Body('reservationId') reservationId: string) {
    return this.reservationsService.convertWaitlistToReservation(id, reservationId);
  }

  @UseGuards(AuthGuard)
  @Get('blocks')
  getBlocks(
    @Query('companyId') companyId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reservationsService.getBlocks(companyId, startDate, endDate);
  }

  @UseGuards(AuthGuard)
  @Post('blocks')
  addBlock(@Body() block: any) {
    return this.reservationsService.addBlock(block);
  }

  @UseGuards(AuthGuard)
  @Delete('blocks/:id')
  removeBlock(@Param('id') id: string) {
    return this.reservationsService.removeBlock(id);
  }

  @UseGuards(AuthGuard)
  @Get()
  findAll(
    @Query('companyId') companyId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reservationsService.findAll(companyId, startDate, endDate);
  }

  @UseGuards(AuthGuard)
  @Post()
  create(@Body() createReservationDto: any) {
    return this.reservationsService.create(createReservationDto);
  }

  @UseGuards(AuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateReservationDto: any) {
    return this.reservationsService.update(id, updateReservationDto);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.reservationsService.remove(id);
  }

  @UseGuards(AuthGuard)
  @Patch(':id/confirm')
  confirm(@Param('id') id: string) {
    return this.reservationsService.confirm(id);
  }

  @UseGuards(AuthGuard)
  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @Body('reason') reason: string) {
    return this.reservationsService.cancel(id, reason);
  }

  @UseGuards(AuthGuard)
  @Patch(':id/no-show')
  markNoShow(@Param('id') id: string) {
    return this.reservationsService.markNoShow(id);
  }

  @UseGuards(AuthGuard)
  @Patch(':id/complete')
  complete(@Param('id') id: string) {
    return this.reservationsService.complete(id);
  }

  // Smart Waitlist
  @UseGuards(AuthGuard)
  @Get('smart-waitlist')
  async getSmartWaitlist(@Query('companyId') companyId: string) {
    if (!companyId) throw new BadRequestException('Company ID is required');
    return this.reservationsService.getSmartWaitlist(companyId);
  }

  @UseGuards(AuthGuard)
  @Post('smart-waitlist')
  async addToSmartWaitlist(@Body() body: any) {
    return this.reservationsService.addToSmartWaitlist(body);
  }

  @UseGuards(AuthGuard)
  @Patch('smart-waitlist/:id')
  async updateSmartWaitlistEntry(@Param('id') id: string, @Body() body: any) {
    return this.reservationsService.updateSmartWaitlistEntry(id, body);
  }

  @UseGuards(AuthGuard)
  @Delete('smart-waitlist/:id')
  async removeFromSmartWaitlist(@Param('id') id: string) {
    return this.reservationsService.removeFromSmartWaitlist(id);
  }

  @UseGuards(AuthGuard)
  @Post('smart-waitlist/:id/seat')
  async seatSmartWaitlistEntry(
    @Param('id') id: string,
    @Body('tableId') tableId: string,
  ) {
    if (!tableId) throw new BadRequestException('Table ID is required');
    return this.reservationsService.seatSmartWaitlistEntry(id, tableId);
  }

  // Smart Waitlist Settings
  @UseGuards(AuthGuard)
  @Get('smart-waitlist/settings')
  getSmartWaitlistSettings(@Query('companyId') companyId: string) {
    return this.reservationsService.getSmartWaitlistSettings(companyId);
  }

  @UseGuards(AuthGuard)
  @Patch('smart-waitlist/settings')
  upsertSmartWaitlistSettings(@Query('companyId') companyId: string, @Body() settings: any) {
    return this.reservationsService.upsertSmartWaitlistSettings(companyId, settings);
  }
}
