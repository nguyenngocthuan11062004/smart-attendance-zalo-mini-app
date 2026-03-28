import { useState, useEffect } from "react";
import { Card, Table, Tag, Button, Space, Typography, Modal, Input, App } from "antd";
import { CheckOutlined, CloseOutlined } from "@ant-design/icons";
import { getAbsenceRequests, reviewAbsenceRequest } from "@/services/admin-absence.service";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import type { AbsenceRequestDoc } from "@/types";
import type { ColumnsType } from "antd/es/table";

const { Title } = Typography;
const { TextArea } = Input;

export default function AbsenceRequestsPage() {
  const [requests, setRequests] = useState<AbsenceRequestDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"pending" | "approved" | "rejected" | undefined>("pending");
  const [reviewModal, setReviewModal] = useState<{ request: AbsenceRequestDoc; action: "approved" | "rejected" } | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { userDoc } = useAdminAuth();
  const { message } = App.useApp();

  const load = async () => {
    setLoading(true);
    try {
      const data = await getAbsenceRequests(statusFilter);
      setRequests(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [statusFilter]);

  const handleReview = async () => {
    if (!reviewModal || !userDoc) return;
    setSubmitting(true);
    try {
      await reviewAbsenceRequest(
        reviewModal.request.id,
        reviewModal.action,
        userDoc.id,
        reviewNote || undefined
      );
      message.success(reviewModal.action === "approved" ? "Đã duyệt đơn" : "Đã từ chối đơn");
      setReviewModal(null);
      setReviewNote("");
      load();
    } finally {
      setSubmitting(false);
    }
  };

  const statusConfig: Record<string, { color: string; label: string }> = {
    pending: { color: "orange", label: "Chờ duyệt" },
    approved: { color: "green", label: "Đã duyệt" },
    rejected: { color: "red", label: "Từ chối" },
  };

  const columns: ColumnsType<AbsenceRequestDoc> = [
    { title: "Sinh viên", dataIndex: "studentName", key: "studentName" },
    { title: "Lớp", dataIndex: "className", key: "className" },
    {
      title: "Lý do", dataIndex: "reason", key: "reason",
      ellipsis: true, width: 250,
    },
    {
      title: "Trạng thái", dataIndex: "status", key: "status", width: 120,
      render: (s: string) => {
        const c = statusConfig[s] || { color: "default", label: s };
        return <Tag color={c.color}>{c.label}</Tag>;
      },
    },
    {
      title: "Ngày gửi", dataIndex: "createdAt", key: "createdAt", width: 140,
      render: (t: number) => new Date(t).toLocaleString("vi-VN"),
      sorter: (a, b) => a.createdAt - b.createdAt,
    },
    {
      title: "Ghi chú", dataIndex: "reviewNote", key: "reviewNote",
      ellipsis: true, width: 200,
      render: (v: string) => v || "—",
    },
    {
      title: "", key: "actions", width: 100,
      render: (_, r) =>
        r.status === "pending" ? (
          <Space>
            <Button
              size="small"
              type="primary"
              icon={<CheckOutlined />}
              onClick={() => setReviewModal({ request: r, action: "approved" })}
              style={{ background: "#22c55e", borderColor: "#22c55e" }}
            />
            <Button
              size="small"
              danger
              icon={<CloseOutlined />}
              onClick={() => setReviewModal({ request: r, action: "rejected" })}
            />
          </Space>
        ) : null,
    },
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>Đơn xin phép nghỉ</Title>

      <Card>
        <Space style={{ marginBottom: 16 }}>
          {(["pending", "approved", "rejected", undefined] as const).map((s) => (
            <Button
              key={s || "all"}
              type={statusFilter === s ? "primary" : "default"}
              onClick={() => setStatusFilter(s)}
              style={statusFilter === s ? { background: "#be1d2c", borderColor: "#be1d2c" } : {}}
            >
              {s === "pending" ? "Chờ duyệt" : s === "approved" ? "Đã duyệt" : s === "rejected" ? "Từ chối" : "Tất cả"}
            </Button>
          ))}
        </Space>

        <Table
          dataSource={requests}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20, showTotal: (t) => `${t} đơn` }}
          scroll={{ x: 900 }}
          size="middle"
        />
      </Card>

      <Modal
        title={reviewModal?.action === "approved" ? "Duyệt đơn xin phép" : "Từ chối đơn xin phép"}
        open={!!reviewModal}
        onOk={handleReview}
        onCancel={() => { setReviewModal(null); setReviewNote(""); }}
        okText={reviewModal?.action === "approved" ? "Duyệt" : "Từ chối"}
        okType={reviewModal?.action === "approved" ? "primary" : "danger"}
        cancelText="Hủy"
        confirmLoading={submitting}
      >
        {reviewModal && (
          <div style={{ marginTop: 16 }}>
            <p><strong>Sinh viên:</strong> {reviewModal.request.studentName}</p>
            <p><strong>Lý do:</strong> {reviewModal.request.reason}</p>
            <TextArea
              placeholder="Ghi chú (tùy chọn)"
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              rows={3}
              style={{ marginTop: 12 }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
