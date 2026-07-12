import { Button, Hr, Text } from "@react-email/components";
import { MovixEmailLayout, emailStyles } from "./MovixEmailLayout";

interface VerifyEmailEmailProps {
  userName: string;
  verifyUrl: string;
}

export function VerifyEmailEmail({ userName, verifyUrl }: VerifyEmailEmailProps) {
  return (
    <MovixEmailLayout preview="Confirm your Movix account — one click and you're in">
      <Text style={emailStyles.heading}>Verify your email 🎬</Text>
      <Text style={emailStyles.subtext}>
        Hey {userName}, welcome to Movix! Click the button below to confirm your
        email address. The link expires in&nbsp;<strong style={{ color: "#ffedc3" }}>24&nbsp;hours</strong>.
      </Text>

      <Button href={verifyUrl} style={emailStyles.button}>
        Confirm my email
      </Button>

      <Hr style={emailStyles.divider} />

      <Text style={emailStyles.footerText}>
        If you didn&apos;t create a Movix account, you can safely ignore this email.
      </Text>
      <Text style={{ ...emailStyles.footerText, marginTop: "8px" }}>
        Or copy this link into your browser:
      </Text>
      <Text style={emailStyles.linkText}>{verifyUrl}</Text>
    </MovixEmailLayout>
  );
}

export default VerifyEmailEmail;
