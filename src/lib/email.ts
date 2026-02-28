// src/lib/email.ts
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port: Number(process.env.EMAIL_SERVER_PORT),
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
});

interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export const sendEmail = async ({
  to,
  subject,
  text,
  html,
}: SendEmailOptions) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      text,
      html,
    });
    console.log("Email sent successfully to:", to);
  } catch (error) {
    console.error("Error sending email:", error);
    // Em um app real, você pode querer lançar o erro ou usar um sistema de log mais robusto
  }
};
