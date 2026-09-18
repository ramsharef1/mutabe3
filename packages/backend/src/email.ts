import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: process.env.SMTP_USER ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  } : undefined,
});

export async function sendVerificationEmail(email: string, name: string, verificationLink: string): Promise<void> {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@mutabe3.news',
      to: email,
      subject: 'تفعيل حسابك في المتابع',
      html: `
        <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right;">
          <h2>مرحباً ${name}</h2>
          <p>شكراً لتسجيلك في موقع المتابع. يرجى تفعيل حسابك بالنقر على الزر أدناه:</p>
          <a href="${verificationLink}" style="display: inline-block; padding: 12px 24px; background-color: #c41e3a; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0;">تفعيل الحساب</a>
          <p style="color: #666; font-size: 12px;">أو انسخ الرابط التالي في متصفحك:</p>
          <p style="color: #666; font-size: 12px; word-break: break-all;">${verificationLink}</p>
          <p style="color: #999; font-size: 11px;">ينتهي صلاحية هذا الرابط خلال 6 ساعات.</p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Failed to send verification email:', error);
    throw new Error('Failed to send verification email');
  }
}

export async function sendPasswordResetEmail(email: string, name: string, resetLink: string): Promise<void> {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@mutabe3.news',
      to: email,
      subject: 'إعادة تعيين كلمة المرور',
      html: `
        <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right;">
          <h2>مرحباً ${name}</h2>
          <p>تم طلب إعادة تعيين كلمة المرور. انقر على الزر أدناه:</p>
          <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #c41e3a; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0;">إعادة تعيين كلمة المرور</a>
          <p style="color: #999; font-size: 11px;">ينتهي صلاحية هذا الرابط خلال ساعة واحدة.</p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
}
