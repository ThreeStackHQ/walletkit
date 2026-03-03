import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
  Row,
  Column,
} from "@react-email/components";
import * as React from "react";
import { escapeHtml } from "@/lib/escape";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TopConsumer {
  externalUserId: string;
  creditsSpent: number;
}

export interface LowBalanceWallet {
  externalUserId: string;
  balance: number;
  threshold: number;
}

export interface DigestEmailProps {
  workspaceName: string;
  periodStart: string;
  periodEnd: string;
  creditsGranted: number;
  creditsSpent: number;
  topConsumers: TopConsumer[];
  lowBalanceWallets: LowBalanceWallet[];
  monthlyLimitUsedPercent: number | null;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const main: React.CSSProperties = {
  backgroundColor: "#f4f4f7",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

const container: React.CSSProperties = {
  margin: "0 auto",
  padding: "40px 20px",
  maxWidth: "580px",
};

const card: React.CSSProperties = {
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  padding: "32px",
};

const headerBar: React.CSSProperties = {
  backgroundColor: "#7c3aed",
  borderRadius: "8px 8px 0 0",
  padding: "24px 32px",
  marginBottom: "0",
};

const headerTitle: React.CSSProperties = {
  color: "#ffffff",
  fontSize: "22px",
  fontWeight: 700,
  margin: 0,
};

const headerSubtitle: React.CSSProperties = {
  color: "#ddd6fe",
  fontSize: "14px",
  margin: "4px 0 0",
};

const cardBody: React.CSSProperties = {
  backgroundColor: "#ffffff",
  borderRadius: "0 0 8px 8px",
  padding: "32px",
};

const sectionTitle: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: 600,
  color: "#1f2937",
  marginBottom: "12px",
};

const statBox: React.CSSProperties = {
  backgroundColor: "#f5f3ff",
  borderRadius: "6px",
  padding: "16px",
  textAlign: "center" as const,
};

const statValue: React.CSSProperties = {
  fontSize: "28px",
  fontWeight: 700,
  color: "#7c3aed",
  margin: "0 0 4px",
};

const statLabel: React.CSSProperties = {
  fontSize: "12px",
  color: "#6b7280",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: 0,
};

const tableHeader: React.CSSProperties = {
  fontSize: "11px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  color: "#9ca3af",
  paddingBottom: "8px",
  borderBottom: "1px solid #e5e7eb",
};

const tableCell: React.CSSProperties = {
  fontSize: "14px",
  color: "#374151",
  padding: "8px 0",
  borderBottom: "1px solid #f3f4f6",
};

const warningBox: React.CSSProperties = {
  backgroundColor: "#fef3c7",
  border: "1px solid #f59e0b",
  borderRadius: "6px",
  padding: "12px 16px",
  fontSize: "14px",
  color: "#92400e",
};

const percentBar: React.CSSProperties = {
  backgroundColor: "#e5e7eb",
  borderRadius: "4px",
  height: "8px",
  overflow: "hidden",
  marginTop: "8px",
};

const footer: React.CSSProperties = {
  textAlign: "center" as const,
  fontSize: "12px",
  color: "#9ca3af",
  marginTop: "24px",
};

const hr: React.CSSProperties = {
  borderColor: "#e5e7eb",
  margin: "24px 0",
};

// ─── Component ───────────────────────────────────────────────────────────────

export function DigestEmail({
  workspaceName,
  periodStart,
  periodEnd,
  creditsGranted,
  creditsSpent,
  topConsumers,
  lowBalanceWallets,
  monthlyLimitUsedPercent,
}: DigestEmailProps): React.ReactElement {
  const safeName = escapeHtml(workspaceName);
  const netChange = creditsGranted - creditsSpent;

  return (
    <Html>
      <Head />
      <Preview>
        Weekly digest for {safeName}: {creditsSpent.toLocaleString()} credits
        spent
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={headerBar}>
            <Heading as="h1" style={headerTitle}>
              WalletKit Weekly Digest
            </Heading>
            <Text style={headerSubtitle}>
              {escapeHtml(periodStart)} &mdash; {escapeHtml(periodEnd)} &middot;{" "}
              {safeName}
            </Text>
          </Section>

          {/* Body */}
          <Section style={cardBody}>
            {/* Summary stats */}
            <Text style={sectionTitle}>Weekly Summary</Text>
            <Section>
              <Row>
                <Column style={{ width: "33%", paddingRight: "8px" }}>
                  <Section style={statBox}>
                    <Text style={statValue}>
                      {creditsGranted.toLocaleString()}
                    </Text>
                    <Text style={statLabel}>Granted</Text>
                  </Section>
                </Column>
                <Column style={{ width: "33%", padding: "0 4px" }}>
                  <Section style={statBox}>
                    <Text style={statValue}>
                      {creditsSpent.toLocaleString()}
                    </Text>
                    <Text style={statLabel}>Spent</Text>
                  </Section>
                </Column>
                <Column style={{ width: "33%", paddingLeft: "8px" }}>
                  <Section
                    style={{
                      ...statBox,
                      backgroundColor: netChange >= 0 ? "#ecfdf5" : "#fef2f2",
                    }}
                  >
                    <Text
                      style={{
                        ...statValue,
                        color: netChange >= 0 ? "#059669" : "#dc2626",
                      }}
                    >
                      {netChange >= 0 ? "+" : ""}
                      {netChange.toLocaleString()}
                    </Text>
                    <Text style={statLabel}>Net Change</Text>
                  </Section>
                </Column>
              </Row>
            </Section>

            {/* Monthly limit usage */}
            {monthlyLimitUsedPercent !== null && (
              <>
                <Hr style={hr} />
                <Text style={sectionTitle}>Monthly Limit Usage</Text>
                <Text style={{ fontSize: "14px", color: "#374151", margin: 0 }}>
                  {monthlyLimitUsedPercent.toFixed(1)}% of monthly credit limit
                  used
                </Text>
                <Section style={percentBar}>
                  <Section
                    style={{
                      backgroundColor:
                        monthlyLimitUsedPercent > 90
                          ? "#dc2626"
                          : monthlyLimitUsedPercent > 70
                            ? "#f59e0b"
                            : "#7c3aed",
                      height: "8px",
                      width: `${Math.min(monthlyLimitUsedPercent, 100)}%`,
                      borderRadius: "4px",
                    }}
                  />
                </Section>
              </>
            )}

            {/* Top consumers */}
            {topConsumers.length > 0 && (
              <>
                <Hr style={hr} />
                <Text style={sectionTitle}>Top Consumers</Text>
                <Section>
                  <Row>
                    <Column style={{ ...tableHeader, width: "60%" }}>
                      User
                    </Column>
                    <Column
                      style={{
                        ...tableHeader,
                        width: "40%",
                        textAlign: "right",
                      }}
                    >
                      Credits Spent
                    </Column>
                  </Row>
                  {topConsumers.map((consumer, i) => (
                    <Row key={i}>
                      <Column style={tableCell}>
                        {escapeHtml(consumer.externalUserId)}
                      </Column>
                      <Column style={{ ...tableCell, textAlign: "right" }}>
                        {consumer.creditsSpent.toLocaleString()}
                      </Column>
                    </Row>
                  ))}
                </Section>
              </>
            )}

            {/* Low-balance alerts */}
            {lowBalanceWallets.length > 0 && (
              <>
                <Hr style={hr} />
                <Text style={sectionTitle}>Low Balance Alerts</Text>
                <Section style={warningBox}>
                  <Text style={{ margin: "0 0 8px", fontWeight: 600 }}>
                    {lowBalanceWallets.length} wallet
                    {lowBalanceWallets.length === 1 ? "" : "s"} below threshold
                  </Text>
                  {lowBalanceWallets.map((w, i) => (
                    <Text key={i} style={{ margin: "2px 0", fontSize: "13px" }}>
                      {escapeHtml(w.externalUserId)}: {w.balance} credits
                      (threshold: {w.threshold})
                    </Text>
                  ))}
                </Section>
              </>
            )}
          </Section>

          {/* Footer */}
          <Text style={footer}>
            WalletKit &mdash; Credit management for your SaaS
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default DigestEmail;
