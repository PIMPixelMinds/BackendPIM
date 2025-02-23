import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Types } from "mongoose";

@Schema({
    timestamps: true
})

export class User {

    @Prop()
    fullName: String

    @Prop({unique: [true, 'Duplicate email entered']})
    email: String

    @Prop()
    password: String

    @Prop()
    birthday: Date

    @Prop({ type: String, enum: ["male","female"] })
    gender: string

    @Prop()
    phone: number

    @Prop()
    careGiverEmail: String

    @Prop()
    diagnosis: String

    @Prop()
    type: boolean

    @Prop()
    medicalReport: String

    @Prop()
    profileCompleted: boolean

}

export const UserSchema = SchemaFactory.createForClass(User)