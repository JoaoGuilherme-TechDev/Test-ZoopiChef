/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Controller,
  Post,
  Body,
  Get,
  Patch,
  Param,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UpdateEmailDto } from './dto/update-email.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { GetCompanyId } from '../auth/decorators/get-company-id.decorator';
import { StorageService } from '../shared/storage.service';

@Controller('profiles')
export class ProfilesController {
  constructor(
    private readonly profilesService: ProfilesService,
    private readonly storageService: StorageService,
  ) {}

  @Post()
  create(@Body() createProfileDto: CreateProfileDto) {
    return this.profilesService.create(createProfileDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@Request() req) {
    return this.profilesService.findByUserId(req.user.userId);
  }

  @Get('user/:userId')
  findOne(@Param('userId') userId: string) {
    return this.profilesService.findByUserId(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateMe(
    @Request() req,
    @GetCompanyId() companyId: string,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.profilesService.update(
      req.user.userId,
      companyId,
      updateProfileDto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Patch('me/password')
  updatePassword(@Request() req, @Body() dto: UpdatePasswordDto) {
    return this.profilesService.updatePassword(req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Patch('me/email')
  updateEmail(@Request() req, @Body() dto: UpdateEmailDto) {
    return this.profilesService.updateEmail(req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('avatar')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @Request() req,
    @GetCompanyId() companyId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado');
    }

    const fileUrl = await this.storageService.uploadFile(file, 'avatars');

    await this.profilesService.update(req.user.userId, companyId, {
      avatar_url: fileUrl,
    });

    return {
      message: 'Avatar atualizado com sucesso',
      avatar_url: fileUrl,
    };
  }
}
