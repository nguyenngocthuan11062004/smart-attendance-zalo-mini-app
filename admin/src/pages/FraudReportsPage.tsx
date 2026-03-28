import { useState, useEffect } from "react";
import { Card, Table, Tag, Typography, Collapse, Space, Spin } from "antd";
import { WarningOutlined } from "@ant-design/icons";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/config/firebase";
import type { FraudReport, SuspiciousPattern } from "@/types";
import type { ColumnsType } from "antd/es/table";

const { Title, Text } = Typography;

const patternLabels: Record<string, string> = {
  always_same_peers: "Luôn cùng nhóm peer",
  rapid_verification: "Xác minh quá nhanh",
  low_peer_count: "Ít peer verification",
  face_mismatch: "Khuôn mặt không khớp",
  ai_detected: "AI phát hiện bất thường",
};

const severityConfig: Record<string, { color: string; label: string }> = {
  low: { color: "blue", label: "Thấp" },
  medium: { color: "orange", label: "Trung bình" },
  high: { color: "red", label: "Cao" },
};

export default function FraudReportsPage() {
  const [reports, setReports] = useState<FraudReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const q = query(collection(db, "fraud_reports"), orderBy("generatedAt", "desc"));
        const snap = await getDocs(q);
        setReports(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as FraudReport));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const columns: ColumnsType<FraudReport> = [
    {
      title: "Ngày", dataIndex: "generatedAt", key: "generatedAt", width: 170,
      render: (t: number) => new Date(t).toLocaleString("vi-VN"),
      sorter: (a, b) => a.generatedAt - b.generatedAt,
      defaultSortOrder: "descend",
    },
    { title: "Mã phiên", dataIndex: "sessionId", key: "sessionId", ellipsis: true, width: 200 },
    {
      title: "Patterns", key: "patterns", width: 100,
      render: (_, r) => <Tag color="red">{r.suspiciousPatterns.length}</Tag>,
    },
    {
      title: "Mức độ cao nhất", key: "maxSeverity",
      render: (_, r) => {
        const severities = r.suspiciousPatterns.map((p) => p.severity);
        const max = severities.includes("high") ? "high" : severities.includes("medium") ? "medium" : "low";
        const c = severityConfig[max];
        return <Tag color={c.color}>{c.label}</Tag>;
      },
    },
    {
      title: "Tóm tắt", dataIndex: "summary", key: "summary", ellipsis: true,
    },
  ];

  if (loading) {
    return <div style={{ display: "flex", justifyContent: "center", paddingTop: 120 }}><Spin size="large" /></div>;
  }

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>
        <WarningOutlined style={{ color: "#ef4444", marginRight: 8 }} />
        Báo cáo gian lận
      </Title>

      <Card>
        <Table
          dataSource={reports}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 20, showTotal: (t) => `${t} báo cáo` }}
          scroll={{ x: 800 }}
          size="middle"
          expandable={{
            expandedRowRender: (report) => (
              <Collapse
                items={report.suspiciousPatterns.map((p, i) => ({
                  key: i,
                  label: (
                    <Space>
                      <Tag color={severityConfig[p.severity]?.color}>{severityConfig[p.severity]?.label}</Tag>
                      {patternLabels[p.type] || p.type}
                    </Space>
                  ),
                  children: (
                    <div>
                      <p>{p.description}</p>
                      {p.studentIds.length > 0 && (
                        <Text type="secondary">
                          Sinh viên liên quan: {p.studentIds.join(", ")}
                        </Text>
                      )}
                    </div>
                  ),
                }))}
              />
            ),
          }}
        />
      </Card>
    </div>
  );
}
