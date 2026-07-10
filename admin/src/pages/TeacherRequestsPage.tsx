import { useState, useEffect } from "react";
import { Card, Table, Button, Space, Typography, Modal, App, Empty } from "antd";
import { CheckOutlined, CloseOutlined } from "@ant-design/icons";
import { subscribePendingTeachers, approveTeacher, rejectTeacher } from "@/services/admin-user.service";
import type { UserDoc } from "@/types";
import type { ColumnsType } from "antd/es/table";

const { Title, Text } = Typography;

export default function TeacherRequestsPage() {
  const [requests, setRequests] = useState<UserDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<{ user: UserDoc; type: "approve" | "reject" } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { message } = App.useApp();

  // Realtime: yêu cầu mới từ Mini App / thao tác ở tab khác đều tự hiện, khỏi F5
  useEffect(() => {
    const unsub = subscribePendingTeachers((users) => {
      setRequests(users);
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleConfirm = async () => {
    if (!action) return;
    setSubmitting(true);
    try {
      if (action.type === "approve") {
        await approveTeacher(action.user.id);
        message.success(`Đã cấp quyền giảng viên cho ${action.user.name}`);
      } else {
        await rejectTeacher(action.user.id);
        message.success(`Đã từ chối yêu cầu của ${action.user.name}`);
      }
      setAction(null); // danh sách tự cập nhật qua subscription realtime
    } catch {
      message.error("Thao tác thất bại. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnsType<UserDoc> = [
    { title: "Họ tên", dataIndex: "name", key: "name", render: (v: string) => <strong>{v || "—"}</strong> },
    { title: "Bộ môn / Khoa", dataIndex: "department", key: "department", render: (v: string) => v || "—" },
    { title: "Mã Zalo (ID)", dataIndex: "id", key: "id", ellipsis: true, width: 200 },
    {
      title: "Ngày gửi", dataIndex: "teacherRequestedAt", key: "teacherRequestedAt", width: 160,
      render: (t: number) => (t ? new Date(t).toLocaleString("vi-VN") : "—"),
      sorter: (a, b) => (a.teacherRequestedAt || 0) - (b.teacherRequestedAt || 0),
    },
    {
      title: "", key: "actions", width: 120,
      render: (_, r) => (
        <Space>
          <Button
            size="small" type="primary" icon={<CheckOutlined />}
            onClick={() => setAction({ user: r, type: "approve" })}
            style={{ background: "#22c55e", borderColor: "#22c55e" }}
          >Duyệt</Button>
          <Button
            size="small" danger icon={<CloseOutlined />}
            onClick={() => setAction({ user: r, type: "reject" })}
          />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>Duyệt giảng viên</Title>
      </div>

      <Card>
        <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
          Giảng viên đăng ký trong Mini App sẽ hiện ở đây. Bấm <strong>Duyệt</strong> để cấp quyền — app của họ tự cập nhật ngay.
        </Text>
        <Table
          dataSource={requests}
          columns={columns}
          rowKey="id"
          loading={loading}
          locale={{ emptyText: <Empty description="Không có yêu cầu nào đang chờ duyệt" /> }}
          pagination={{ pageSize: 20, showTotal: (t) => `${t} yêu cầu` }}
          scroll={{ x: 800 }}
          size="middle"
        />
      </Card>

      <Modal
        title={action?.type === "approve" ? "Duyệt làm giảng viên" : "Từ chối yêu cầu"}
        open={!!action}
        onOk={handleConfirm}
        onCancel={() => setAction(null)}
        okText={action?.type === "approve" ? "Duyệt" : "Từ chối"}
        okType={action?.type === "approve" ? "primary" : "danger"}
        cancelText="Hủy"
        confirmLoading={submitting}
        okButtonProps={action?.type === "approve" ? { style: { background: "#22c55e", borderColor: "#22c55e" } } : undefined}
      >
        {action && (
          <div style={{ marginTop: 16 }}>
            <p><strong>Họ tên:</strong> {action.user.name || "—"}</p>
            {action.user.department && <p><strong>Bộ môn/Khoa:</strong> {action.user.department}</p>}
            <p style={{ color: "#6b7280" }}>
              {action.type === "approve"
                ? "Người này sẽ được cấp vai trò giảng viên và truy cập đầy đủ tính năng GV."
                : "Yêu cầu sẽ bị từ chối. Người này vẫn có thể gửi lại yêu cầu sau."}
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
