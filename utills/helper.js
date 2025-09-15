import otpGenerator from 'otp-generator';

export const generateOTP = () => {
    const otp = otpGenerator.generate(6,{
        digits: true,
        specialChars: false,
        lowerCaseAlphabets: false,
        upperCaseAlphabets: false
    })

    return otp;
}


export const generateOTPMessage = (name, otp) => {
  return{
    subject: "Buspass - Verify OTP",

    html: `
        <div style="max-width: 600px; margin: auto; padding: 20px; font-family: Arial, sans-serif; border: 1px solid #ddd; border-radius: 10px; background-color: #f9f9f9;">
            <h2 style="text-align: center; color: #1363DF;">🔐 Email Verification</h2>
            
            <p>Hi <strong>${name || 'User'}</strong>,</p>
            
            <p>Welcome to <strong>BussPass</strong>! Please use the following One Time Password (OTP) to verify your email address:</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <span style="display: inline-block; font-size: 32px; letter-spacing: 8px; font-weight: bold; color: #FF005C;">${otp}</span>
            </div>
            
            <p style="color: #555;">This OTP is valid for <strong>15 minutes</strong>. Please do not share it with anyone.</p>
            
            <p>If you did not request this verification, you can safely ignore this email.</p>
            
            <p style="margin-top: 40px;">Best regards,<br><strong>Team BussPass</strong></p>
        </div>
    `
}};


export function to24HourFormat(time) {
    let [t, meridian] = time.split(" ");
    let [hour, minute] = t.split(":").map(Number);

    if (meridian === "PM" && hour !== 12) hour += 12;
    if (meridian === "AM" && hour === 12) hour = 0;

    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

export function calculateFare(distance) {
  switch (true) {
    case (distance <= 20):
      return 30;

    case (distance <= 50):
      return 50;

    case (distance <= 80):
      return 70;
    
    case (distance <= 120):
        return 90;
    case (distance <= 150):
        return 110;
    case (distance > 150):
        return 150;
    default:
      return 0;
  }
}

export function checkDateAndGetTime(datetimeStr) {
  const inputDate = new Date(datetimeStr);
  const now = new Date();

  const inputDay = new Date(inputDate.getFullYear(), inputDate.getMonth(), inputDate.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let dayStatus;
  if (inputDay.getTime() === today.getTime()) {
    dayStatus = "today";
  } else if (inputDay < today) {
    dayStatus = "previous";
  } else {
    return "all";
  }

  const time = inputDate.toLocaleTimeString([], { 
    hour: "2-digit", 
    minute: "2-digit", 
    hour12: true 
  });

  return { day: dayStatus, time: time };
}
