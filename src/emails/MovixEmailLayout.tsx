import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
  Img,
} from "@react-email/components";

interface MovixEmailLayoutProps {
  preview: string;
  children: React.ReactNode;
}

const styles = {
  html: {
    backgroundColor: "#0e0e13",
    fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
  },
  body: {
    backgroundColor: "#0e0e13",
    margin: "0",
    padding: "0",
  },
  container: {
    maxWidth: "560px",
    margin: "0 auto",
    padding: "0",
  },
  accentBar: {
    background: "linear-gradient(90deg, #ffcc00 0%, #f1c100 50%, #00daf3 100%)",
    height: "4px",
    borderRadius: "4px 4px 0 0",
  },
  card: {
    backgroundColor: "#1b1b20",
    borderRadius: "0 0 16px 16px",
    padding: "40px 40px 32px",
    border: "1px solid rgba(255,255,255,0.08)",
    borderTop: "none",
  },
  logoBadge: {
    display: "inline-block",
    backgroundColor: "rgba(255,204,0,0.12)",
    border: "1px solid rgba(255,204,0,0.25)",
    borderRadius: "100px",
    padding: "4px 14px",
    fontSize: "11px",
    fontWeight: "700",
    letterSpacing: "0.32em",
    textTransform: "uppercase" as const,
    color: "#ffcc00",
    marginBottom: "24px",
  },
  heading: {
    color: "#ffedc3",
    fontSize: "28px",
    fontWeight: "700",
    lineHeight: "1.3",
    margin: "0 0 12px",
  },
  subtext: {
    color: "#a09891",
    fontSize: "15px",
    lineHeight: "1.6",
    margin: "0 0 32px",
  },
  button: {
    backgroundColor: "#ffcc00",
    color: "#241a00",
    fontWeight: "700",
    fontSize: "15px",
    borderRadius: "100px",
    padding: "14px 36px",
    textDecoration: "none",
    display: "inline-block",
  },
  divider: {
    borderColor: "rgba(255,255,255,0.08)",
    margin: "32px 0 24px",
  },
  footerText: {
    color: "#4e4632",
    fontSize: "12px",
    lineHeight: "1.6",
    margin: "0",
  },
  linkText: {
    color: "#9a9078",
    fontSize: "12px",
    wordBreak: "break-all" as const,
  },
};

export function MovixEmailLayout({ preview, children }: MovixEmailLayoutProps) {
  return (
    <Html lang="en" style={styles.html}>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <div style={styles.accentBar} />
          <div style={styles.card}>
            <div style={styles.logoBadge}>Movix</div>
            {children}
          </div>
          <Text style={{ color: "#35343a", fontSize: "11px", textAlign: "center", padding: "16px 0" }}>
            © {new Date().getFullYear()} Movix. All rights reserved.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export { styles as emailStyles };
