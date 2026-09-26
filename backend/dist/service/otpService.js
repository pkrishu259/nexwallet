"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyOtpCode = exports.generateOtp = void 0;
const db_1 = require("./db");
// Fixed OTP for demo phone number, random 6-digit for others
const generateOtp = async (phone) => {
    const otp = phone === '9876543210' ? '123456' : Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins expiry
    await db_1.prisma.otpSession.upsert({
        where: { phone },
        update: {
            otp,
            expiresAt,
            isVerified: false,
        },
        create: {
            phone,
            otp,
            expiresAt,
            isVerified: false,
        },
    });
    return otp;
};
exports.generateOtp = generateOtp;
const verifyOtpCode = async (phone, inputOtp) => {
    const session = await db_1.prisma.otpSession.findUnique({
        where: { phone },
    });
    if (!session)
        return false;
    // Accept test OTP '123456' or matching session OTP
    const isValid = (inputOtp === '123456') || (session.otp === inputOtp && session.expiresAt > new Date());
    if (isValid) {
        await db_1.prisma.otpSession.update({
            where: { phone },
            data: { isVerified: true },
        });
        return true;
    }
    return false;
};
exports.verifyOtpCode = verifyOtpCode;
