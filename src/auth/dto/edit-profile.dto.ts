import { IsBoolean, IsDate, IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString, MinLength } from "class-validator";

export class EditProfileDto {

    @IsOptional()
    @IsString()
    newName: string;

    @IsOptional()
    @IsEmail()
    newEmail: string;

    @IsOptional()
    @IsDate()
    newBirthday: Date;

    @IsOptional()
    @IsBoolean()
    newGender: boolean;
}