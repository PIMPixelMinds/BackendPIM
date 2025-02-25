import { Controller, Post, Body, Put, Param, Get, Delete, UseInterceptors, UploadedFile, Query, BadRequestException, UnauthorizedException, Req } from '@nestjs/common';
import { MedicationService } from './medication.service';
import { CreateMedicationDto } from './dto/create-medication.dto';
import { UpdateMedicationDto } from './dto/update-medication.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileUploadService } from 'src/auth/fileUpload.service'; // Adjust the import path if necessary
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard'; // Adjust the import path if necessary
import { Request } from 'express';
import { MedicationDocument } from './schema/medication.schema';

// Define a custom request type that includes the user property set by JwtAuthGuard
interface AuthRequest extends Request {
  user: {
    _id: string; // Matches your JWT payload structure (userId from guard)
    fullName: string;
    email: string;
    gender: string;
    birthday: Date;
    // Add other properties from your JWT payload if needed
  };
}

@Controller('medications')
@UseGuards(JwtAuthGuard) // Apply JWT guard to all endpoints in this controller
export class MedicationController {
  constructor(
    private readonly medicationService: MedicationService,
    private readonly fileUploadService: FileUploadService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('photo', FileUploadService.multerOptions))
  async create(
    @Req() req: AuthRequest, // Required parameter first
    @Body() createMedicationDto: CreateMedicationDto,
    @UploadedFile() photo?: Express.Multer.File, // Optional parameter last
  ) {
    try {
      let photoUrl: string | undefined;
      if (photo) {
        photoUrl = `/uploads/images/${photo.filename}`;
      }
      const userId = req.user._id; // Use _id as per your JwtAuthGuard payload
      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }
      return this.medicationService.create(createMedicationDto, userId);
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to create medication');
    }
  }

  @Put(':id')
  @UseInterceptors(FileInterceptor('photo', FileUploadService.multerOptions))
  async update(
    @Req() req: AuthRequest, // Required parameter first
    @Param('id') id: string,
    @Body() updateMedicationDto: UpdateMedicationDto,
    @UploadedFile() photo?: Express.Multer.File, // Optional parameter last
  ) {
    try {
      let photoUrl: string | undefined;
      if (photo) {
        photoUrl = `/uploads/images/${photo.filename}`;
      }
      const updatedMedication = await this.medicationService.update(id, { ...updateMedicationDto, photoUrl });
      if (!updatedMedication) {
        throw new BadRequestException('Medication not found');
      }
      if (updatedMedication.userId?.toString() !== req.user._id) {
        throw new UnauthorizedException('You are not authorized to update this medication');
      }
      return updatedMedication;
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to update medication');
    }
  }

  @Get()
  async findAll(
    @Req() req: AuthRequest, // Required parameter first
    @Query('userId') userId?: string, // Optional query parameter
  ): Promise<MedicationDocument[]> {
    try {
      const authenticatedUserId = userId || req.user._id;
      if (!authenticatedUserId) {
        throw new UnauthorizedException('User not authenticated');
      }
      return this.medicationService.findAll(authenticatedUserId);
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to retrieve medications');
    }
  }

  @Get(':id')
  async findOne(
    @Req() req: AuthRequest, // Required parameter first
    @Param('id') id: string,
  ): Promise<MedicationDocument> {
    try {
      const medication = await this.medicationService.findOne(id);
      if (!medication) {
        throw new BadRequestException('Medication not found');
      }
      if (medication.userId?.toString() !== req.user._id) {
        throw new UnauthorizedException('You are not authorized to access this medication');
      }
      return medication;
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to retrieve medication');
    }
  }

  @Delete(':id')
  async remove(
    @Req() req: AuthRequest, // Required parameter first
    @Param('id') id: string,
  ): Promise<void> {
    try {
      const medication = await this.medicationService.findOne(id);
      if (!medication) {
        throw new BadRequestException('Medication not found');
      }
      if (medication.userId?.toString() !== req.user._id) {
        throw new UnauthorizedException('You are not authorized to delete this medication');
      }
      return this.medicationService.remove(id);
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to delete medication');
    }
  }

  @Get('filter')
  async findByScheduleRange(
    @Req() req: AuthRequest, // Required parameter first
    @Query('filter') filter: 'today' | 'week' | 'month' = 'today', // Default to 'today'
  ): Promise<MedicationDocument[]> {
    try {
      const userId = req.user._id;
      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }
      if (!['today', 'week', 'month'].includes(filter)) {
        throw new BadRequestException('Invalid filter option. Use "today", "week", or "month"');
      }
      return this.medicationService.findByScheduleRange(userId, filter);
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to retrieve medications by schedule range');
    }
  }
}