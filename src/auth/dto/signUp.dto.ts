import { IsBoolean, IsDate, IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString, MinLength } from "class-validator";

export class SignUpDto {

    @IsNotEmpty()
    @IsString()
    fullName: string;

    @IsNotEmpty()
    @IsEmail({}, { message: "Please enter the correct email form."})
    email: string;

    @IsNotEmpty()
    @IsString()
    @MinLength(6)
    password: string;

    @IsOptional()
    @IsDate()
    birthday?: Date

    @IsOptional()
    @IsBoolean()
    gender?: boolean

    @IsOptional()
    @IsNumber()
    phone?: number

    @IsOptional()
    @IsNumber()
    profileCompleted?: boolean


}