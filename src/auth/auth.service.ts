import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { SignUpDto } from './dto/signUp.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './schema/user.schema';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt'
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { ResetCode } from './schema/reset-password.schema';
import { MailService } from 'src/service/mail.service';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { EditProfileDto } from './dto/edit-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class AuthService {

  constructor(
    @InjectModel(User.name)
    private userModel: Model<User>,
    private jwtService: JwtService,
    @InjectModel(ResetCode.name)
    private ResetCodeModel: Model<ResetCode>,
    private mailService: MailService,
  ) { }

  async signUp(signUpDto: SignUpDto): Promise<{ user }> {
    const { fullName, email, birthday, password, gender, profileCompleted } = signUpDto;

    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const initializedProfileCompleted = profileCompleted ?? false;
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.userModel.create({
      fullName,
      email,
      birthday,
      password: hashedPassword,
      gender: gender ? "male" : "female",
      profileCompleted: initializedProfileCompleted
    });


    return { user }

  }

  async login(loginDto: LoginDto): Promise<{ payload, token: string }> {
    const { email, password } = loginDto;

    const user = await this.userModel.findOne({ email });

    if (!user) {
      throw new UnauthorizedException('Warning : There is no user with this email.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Warning : Invalid password.');
    }

    const payload = {
      userId: user._id,
      fullName: user.fullName,
      email: user.email,
      gender: user.gender,
      birthday: user.birthday
    };

    const token = this.jwtService.sign(payload, { expiresIn: '5m' });

    return { payload, token };
  }

  async forgotPassword(email: string) {
    const user = await this.userModel.findOne({ email });
    if (!user) throw new UnauthorizedException("Invalid Email.");

    const resetCode = Math.floor(100000 + Math.random() * 900000);
    const expiryDate = new Date();
    expiryDate.setSeconds(expiryDate.getMinutes() + 100);

    await this.ResetCodeModel.create({
      codeNumber: resetCode,
      userId: user._id,
      expiryDate,
    });

    await this.mailService.sendPasswordResetEmail(email, resetCode);

    return { message: "Reset code sent to your email.", state: "success" };
  }

  async getResetCodeByEmail(email: string): Promise<ResetCode> {
    const user = await this.userModel.findOne({ email });
    if (!user) throw new NotFoundException('User not found');

    const resetCode = await this.ResetCodeModel.findOne({
      userId: user._id,
      expiryDate: { $gt: new Date() }
    });

    if (!resetCode) throw new NotFoundException('Code not found or expired');
    return resetCode;
  }

  async verifyResetCode(email: string, resetCode: string): Promise<boolean> {
    const user = await this.userModel.findOne({ email });
    if (!user) throw new NotFoundException('User not found');

    const codeRecord = await this.ResetCodeModel.findOne({
      userId: user._id,
      codeNumber: resetCode,
      expiryDate: { $gt: new Date() }
    });

    return !!codeRecord;
  }

  async changePassword(email: string, changePasswordDto: ResetPasswordDto): Promise<void> {
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);
    await this.userModel.updateOne({ email }, { password: hashedPassword });

  }

  async getProfile(user: any) {
    const foundUser = await this.userModel.findById(user.userId);
    if (!foundUser) {
      throw new NotFoundException('User not found');
    }

    const { password, ...safeUser } = foundUser.toObject();

    return safeUser;
  }

  async updateProfile(id: string, editProfileDto: EditProfileDto): Promise<{ user }> {
    const { newName, newEmail, newBirthday, newGender } = editProfileDto;

    const findUser = await this.userModel.findById(id);

    if (!findUser) {
      throw new NotFoundException('User not found');
    }

    if(newName == findUser.fullName) {
      throw new BadRequestException('That is already your Full Name');
    }

    if (newEmail && newEmail !== findUser.email) {
      const existingUser = await this.userModel.findOne({ email: newEmail });
      if (existingUser) {
        throw new BadRequestException('Email already exists');
      }
    }

    const updateData: any = {};
    if (newName) {
      updateData.fullName = newName;
    }
    if (newEmail) {
      updateData.email = newEmail;
    }
    if (newBirthday) {
      updateData.birthday = newBirthday;
    }
    if (newGender) {
      updateData.gender = newGender;
    }

    const updatedUser = await this.userModel.findOneAndUpdate(
      { _id: id },
      { $set: updateData },
      { new: true }
    );

    return { user: updatedUser };
  }

  async updatePassword(id: string, changePasswordDto: ChangePasswordDto): Promise<{ user }> {

    const { oldPassword, newPassword } = changePasswordDto;

    const findUser = await this.userModel.findById(id);
    if (!findUser) {
      throw new NotFoundException('User not found');
    }

    //Compare passwords
    const passwordMatch = await bcrypt.compare(oldPassword, findUser.password)
    if (!passwordMatch) {
      throw new NotFoundException('Check your current password');
    }

    //Create new password
    const newHashedPassword = await bcrypt.hash(newPassword, 10);
    findUser.password = newHashedPassword;

    await findUser.save()
    const userAfterPasswordUpdate = await this.userModel.findById(id)
    return { user: userAfterPasswordUpdate };

  }

}
