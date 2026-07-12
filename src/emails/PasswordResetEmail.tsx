import { Button, Hr, Text } from "@react-email/components";
import { MovixEmailLayout, emailStyles } from "./MovixEmailLayout";

interface PasswordResetEmailProps {
  userName: string;
  resetUrl: string;
}

export function PasswordResetEmail({ userName, resetUrl }: PasswordResetEmailProps) {
  return (
    <MovixEmailLayout preview="Reset your Movix password — link expires in 1 hour">
      <Text style={emailStyles.heading}>Reset your password 🔑</Text>
      <Text style={emailStyles.subtext}>
        Hey {userName}, we received a request to reset your Movix password. Click
        the button below to choose a new one. This link expires in&nbsp;
        <strong style={{ color: "#ffedc3" }}>1&nbsp;hour</strong>.
      </Text>

      <Button href={resetUrl} style={emailStyles.button}>
        Reset my password
      </Button>

      <Hr style={emailStyles.divider} />

      <Text style={emailStyles.footerText}>
        If you didn&apos;t request a password reset, you can safely ignore this email —
        your password won&apos;t change.
      </Text>
      <Text style={{ ...emailStyles.footerText, marginTop: "8px" }}>
        Or copy this link into your browser:
      </Text>
      <Text style={emailStyles.linkText}>{resetUrl}</Text>
    </MovixEmailLayout>
  );
}

export default PasswordResetEmail;
