import { useState, useEffect, useCallback } from "react";
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Typography,
  Modal,
  InputNumber,
  App,
  Tooltip,
} from "antd";
import {
  PlusOutlined,
  CopyOutlined,
  ReloadOutlined,
  KeyOutlined,
} from "@ant-design/icons";
import {
  getInviteCodes,
  createInviteCode,
  getInviteStatus,
  type TeacherInviteDoc,
} from "@/services/admin-invite.service";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import type { ColumnsType } from "antd/es/table";

const { Title, Text } = Typography;

export default function InviteCodesPage() {
  const [invites, setInvites] = useState<TeacherInviteDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [expiryDays, setExpiryDays] = useState(7);
  const [creating, setCreating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const { userDoc } = useAdminAuth();
  const { message } = App.useApp();

  const loadInvites = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getInviteCodes();
      setInvites(result);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInvites();
  }, [loadInvites]);

  const handleCreate = async () => {
    if (!userDoc) return;
    setCreating(true);
    try {
      const invite = await createInviteCode(userDoc.id, expiryDays);
      setGeneratedCode(invite.code);
      message.success("Tạo mã mời thành công");
      await loadInvites();
    } catch {
      message.error("Không thể tạo mã mời");
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      message.success("Đã sao chép mã mời");
    }).catch(() => {
      message.error("Không thể sao chép");
    });
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setGeneratedCode(null);
    setExpiryDays(7);
  };

  const statusColor: Record<string, string> = {
    available: "green",
    used: "default",
    expired: "red",
  };

  const statusLabel: Record<string, string> = {
    available: "Khả dụng",
    used: "Đã sử dụng",
    expired: "Hết hạn",
  };

  const columns: ColumnsType<TeacherInviteDoc> = [
    {
      title: "Mã mời",
      dataIndex: "code",
      key: "code",
      width: 160,
      render: (code: string) => (
        <Space>
          <Text code strong style={{ fontSize: 14, letterSpacing: 1 }}>
            {code}
          </Text>
          <Tooltip title="Sao chép">
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => handleCopy(code)}
            />
          </Tooltip>
        </Space>
      ),
    },
    {
      title: "Trạng thái",
      key: "status",
      width: 120,
      render: (_, r) => {
        const status = getInviteStatus(r);
        return <Tag color={statusColor[status]}>{statusLabel[status]}</Tag>;
      },
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 150,
      render: (t: number) =>
        new Date(t).toLocaleString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
    },
    {
      title: "Hết hạn",
      dataIndex: "expiresAt",
      key: "expiresAt",
      width: 150,
      render: (t: number) =>
        new Date(t).toLocaleString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
    },
    {
      title: "Người sử dụng",
      dataIndex: "usedBy",
      key: "usedBy",
      width: 200,
      render: (v: string | null) => v || "—",
    },
    {
      title: "Ngày sử dụng",
      dataIndex: "usedAt",
      key: "usedAt",
      width: 150,
      render: (t: number | null) =>
        t
          ? new Date(t).toLocaleString("vi-VN", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "—",
    },
  ];

  const availableCount = invites.filter(
    (i) => getInviteStatus(i) === "available",
  ).length;
  const usedCount = invites.filter(
    (i) => getInviteStatus(i) === "used",
  ).length;

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <Title level={4} style={{ margin: 0 }}>
          Mã mời giảng viên
        </Title>
        <Space>
          <Tag color="green">{availableCount} khả dụng</Tag>
          <Tag>{usedCount} đã dùng</Tag>
          <Tag>{invites.length} tổng</Tag>
        </Space>
      </div>

      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setModalOpen(true)}
          >
            Tạo mã mời GV
          </Button>
          <Button icon={<ReloadOutlined />} onClick={loadInvites}>
            Làm mới
          </Button>
        </Space>

        <Table
          dataSource={invites}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (t) => `${t} mã mời`,
          }}
          scroll={{ x: 900 }}
          size="middle"
        />
      </Card>

      <Modal
        title={
          <Space>
            <KeyOutlined style={{ color: "#be1d2c" }} />
            <span>Tạo mã mời giảng viên</span>
          </Space>
        }
        open={modalOpen}
        onCancel={handleCloseModal}
        footer={
          generatedCode
            ? [
                <Button key="close" onClick={handleCloseModal}>
                  Đóng
                </Button>,
                <Button
                  key="copy"
                  type="primary"
                  icon={<CopyOutlined />}
                  onClick={() => handleCopy(generatedCode)}
                >
                  Sao chép mã
                </Button>,
              ]
            : [
                <Button key="cancel" onClick={handleCloseModal}>
                  Hủy
                </Button>,
                <Button
                  key="create"
                  type="primary"
                  loading={creating}
                  onClick={handleCreate}
                >
                  Tạo mã mời
                </Button>,
              ]
        }
      >
        {generatedCode ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                background: "rgba(34, 197, 94, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <KeyOutlined
                style={{ fontSize: 28, color: "#22c55e" }}
              />
            </div>
            <Text
              strong
              style={{
                fontSize: 28,
                letterSpacing: 4,
                display: "block",
                marginBottom: 8,
              }}
            >
              {generatedCode}
            </Text>
            <Text type="secondary">
              Mã mời có hiệu lực trong {expiryDays} ngày. Gửi mã này cho giảng
              viên để đăng nhập.
            </Text>
          </div>
        ) : (
          <div style={{ padding: "16px 0" }}>
            <Text style={{ display: "block", marginBottom: 8 }}>
              Thời hạn (ngày):
            </Text>
            <InputNumber
              min={1}
              max={90}
              value={expiryDays}
              onChange={(v) => setExpiryDays(v || 7)}
              style={{ width: "100%" }}
              addonAfter="ngày"
            />
            <Text
              type="secondary"
              style={{ display: "block", marginTop: 12 }}
            >
              Mã mời sẽ được tạo tự động (8 ký tự, chữ hoa + số). Mỗi mã chỉ
              dùng được một lần.
            </Text>
          </div>
        )}
      </Modal>
    </div>
  );
}
