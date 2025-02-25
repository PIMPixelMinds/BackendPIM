import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { CreateMedicationDto } from './dto/create-medication.dto';
import { UpdateMedicationDto } from './dto/update-medication.dto';
import { addMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { Medication, MedicationDocument } from './schema/medication.schema';

@Injectable()
export class MedicationService {
  constructor(@InjectModel(Medication.name) private medicationModel: Model<MedicationDocument>) {}

  async create(createMedicationDto: CreateMedicationDto, userId: string): Promise<MedicationDocument> {
    const createdMedication = new this.medicationModel({
      ...createMedicationDto,
      userId: new Types.ObjectId(userId), // Ensure userId is converted to ObjectId
    });
    return createdMedication.save();
  }

  async update(id: string, updateMedicationDto: UpdateMedicationDto): Promise<MedicationDocument | null> {
    return this.medicationModel
      .findByIdAndUpdate(id, updateMedicationDto, { new: true, runValidators: true, lean: true }) // lean: true for performance
      .exec();
  }

  async findAll(userId: string): Promise<MedicationDocument[]> {
    return this.medicationModel
      .find({ userId: new Types.ObjectId(userId) })
      .lean() // Use lean() for better performance when only data is needed
      .exec() as unknown as MedicationDocument[]; // Cast to ensure type compatibility
  }

  async findByScheduleRange(userId: string, filter: 'today' | 'week' | 'month'): Promise<MedicationDocument[]> {
    const now = new Date();
    const userObjectId = new Types.ObjectId(userId);
    const medications = await this.medicationModel
      .find({ userId: userObjectId, isActive: true })
      .select('name amount unit duration capSize cause frequency schedule createdAt photoUrl userId isActive') // Select all fields
      .lean() // Use lean() for performance
      .exec();

    return (medications as MedicationDocument[]).filter(medication => {
      const { schedule, frequency, duration, createdAt } = medication;
      // Check if createdAt is undefined and handle it (e.g., skip the medication or log an error)
      if (!createdAt) {
        console.warn('Skipping medication due to missing createdAt:', medication);
        return false;
      }
      if (!this.isMedicationActive(now, duration, createdAt)) return false;

      const isDue = this.isMedicationDue(now, schedule, frequency);
      if (!isDue) return false;

      switch (filter) {
        case 'today':
          return this.isDueToday(now, schedule, frequency);
        case 'week':
          return this.isDueThisWeek(now, schedule, frequency);
        case 'month':
          return this.isDueThisMonth(now, schedule, frequency);
        default:
          throw new Error('Invalid filter option');
      }
    });
  }

  private isMedicationActive(now: Date, duration: string, createdAt: Date | undefined): boolean {
    // Handle undefined createdAt (e.g., return false or throw an error)
    if (!createdAt) {
      console.warn('createdAt is undefined for medication with duration:', duration);
      return false; // Skip medications without a createdAt
    }

    if (duration === 'Ongoing') return true;
    const durationMatch =duration.match(/(\d+)\s*(Month|Months)/);
    if (!durationMatch) return false;
    const months = parseInt(durationMatch[1]);
    const endDate = addMonths(new Date(createdAt), months);
    return now <= endDate;
  }

  private isMedicationDue(now: Date, schedule: string, frequency: string): boolean {
    const currentHour = now.getHours();
    const currentDay = now.getDay(); // 0 (Sunday) to 6 (Saturday)
    const currentDate = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    switch (frequency) {
      case 'Daily':
        return this.isScheduleMatch(now, schedule);
      case 'Weekly':
        // Assume weekly medications are due on a specific day (e.g., Sunday for simplicity)
        return this.isScheduleMatch(now, schedule) && currentDay === 0; // Adjust based on your schedule logic
      case 'Monthly':
        // Due on the same day of the month (e.g., 15th of each month)
        return this.isScheduleMatch(now, schedule) && currentDate === 15; // Adjust based on your schedule logic
      case 'As Needed':
        return false; // Default to false unless specified otherwise (user discretion)
      default:
        return false;
    }
  }

  private isScheduleMatch(now: Date, schedule: string): boolean {
    const currentHour = now.getHours();
    switch (schedule) {
      case 'Before Breakfast':
        return currentHour >= 6 && currentHour < 9; // 6 AM to 9 AM
      case 'After Breakfast':
        return currentHour >= 9 && currentHour < 12; // 9 AM to 12 PM
      case 'Before Lunch':
        return currentHour >= 11 && currentHour < 13; // 11 AM to 1 PM
      case 'After Lunch':
        return currentHour >= 13 && currentHour < 15; // 1 PM to 3 PM
      case 'Before Dinner':
        return currentHour >= 17 && currentHour < 19; // 5 PM to 7 PM
      case 'After Dinner':
        return currentHour >= 19 && currentHour < 22; // 7 PM to 10 PM
      case 'Before Meals':
        return currentHour >= 6 && currentHour < 19; // Any meal time (6 AM to 7 PM)
      case 'After Meals':
        return currentHour >= 9 && currentHour < 22; // After any meal (9 AM to 10 PM)
      default:
        return false;
    }
  }

  private isDueToday(now: Date, schedule: string, frequency: string): boolean {
    return this.isMedicationDue(now, schedule, frequency);
  }

  private isDueThisWeek(now: Date, schedule: string, frequency: string): boolean {
    const startOfWeekDate = startOfWeek(now);
    const endOfWeekDate = endOfWeek(now);
    return this.isMedicationDue(now, schedule, frequency) &&
           now >= startOfWeekDate && now <= endOfWeekDate;
  }

  private isDueThisMonth(now: Date, schedule: string, frequency: string): boolean {
    const startOfMonthDate = startOfMonth(now);
    const endOfMonthDate = endOfMonth(now);
    return this.isMedicationDue(now, schedule, frequency) &&
           now >= startOfMonthDate && now <= endOfMonthDate;
  }

  async findOne(id: string): Promise<MedicationDocument | null> {
    return this.medicationModel
      .findById(id)
      .lean() // Use lean() for performance
      .exec() as unknown as MedicationDocument | null; // Cast to ensure type compatibility
  }

  async remove(id: string): Promise<void> {
    await this.medicationModel.findByIdAndDelete(id).exec();
  }
}