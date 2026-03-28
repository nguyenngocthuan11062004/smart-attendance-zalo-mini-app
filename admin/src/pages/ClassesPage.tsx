import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card, Table, Button, Modal, Form, Input, Select, Switch, Space, Typography,
  Tag, App, Upload, Alert, Badge,
} from "antd";
import {
  PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, UploadOutlined,
  DownloadOutlined, CheckCircleFilled, CloseCircleFilled, FileExcelOutlined,
} from "@ant-design/icons";
import {
  getAllClasses, createClass, updateClass, deleteClass, getTeachers,
} from "@/services/admin-class.service";
import {
  parseClassFile, downloadClassTemplate, downloadStudentTemplate,
  type ImportedClass,
} from "@/services/import-export.service";
import type { ClassDoc, UserDoc } from "@/types";
import type { ColumnsType } from "antd/es/table";

const { Title, Text } = Typography;

export default function ClassesPage() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<ClassDoc[]>([]);
  const [teachers, setTeachers] = useState<UserDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassDoc | null>(null);
  const [form] = Form.useForm();
  const { message, modal } = App.useApp();

  // Import classes
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportedClass[]>([]);
  const [importLoading, setImportLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [cls, tch] = await Promise.all([getAllClasses(), getTeachers()]);
      setClasses(cls);
      setTeachers(tch);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // ── Create / Edit class ───────────────────────────────────────────────
  const openCreateModal = () => {
    setEditingClass(null);
    form.resetFields();
    form.setFieldsValue({ faceRequired: true, peerRequired: true });
    setModalOpen(true);
  };

  const openEditModal = (cls: ClassDoc) => {
    setEditingClass(cls);
    form.setFieldsValue({
      name: cls.name,
      code: cls.code,
      teacherId: cls.teacherId,
      faceRequired: cls.faceRequired !== false,
      peerRequired: cls.peerRequired !== false,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const teacher = teachers.find((t) => t.id === values.teacherId);

    if (editingClass) {
      await updateClass(editingClass.id, {
        name: values.name,
        code: values.code,
        teacherId: values.teacherId,
        teacherName: teacher?.name || "",
        faceRequired: values.faceRequired,
        peerRequired: values.peerRequired,
      });
      message.success("Đã cập nhật lớp");
    } else {
      await createClass({
        name: values.name,
        code: values.code,
        teacherId: values.teacherId,
        teacherName: teacher?.name || "",
        faceRequired: values.faceRequired,
        peerRequired: values.peerRequired,
      });
      message.success("Đã tạo lớp mới");
    }

    setModalOpen(false);
    load();
  };

  const handleDelete = (cls: ClassDoc) => {
    modal.confirm({
      title: `Xóa lớp "${cls.name}"?`,
      content: `Lớp có ${cls.studentIds.length} sinh viên. Hành động này không thể hoàn tác.`,
      okText: "Xóa",
      okType: "danger",
      cancelText: "Hủy",
      onOk: async () => {
        await deleteClass(cls.id);
        message.success("Đã xóa lớp");
        load();
      },
    });
  };

  // ── Import classes from Excel ─────────────────────────────────────────
  const handleFileSelect = async (file: File) => {
    try {
      const parsed = await parseClassFile(file);
      setImportPreview(parsed);
      setImportModalOpen(true);
    } catch {
      message.error("Không thể đọc file. Kiểm tra định dạng.");
    }
  };

  const handleConfirmImport = async () => {
    const valid = importPreview.filter((c) => c.valid);
    if (valid.length === 0) {
      message.error("Không có lớp hợp lệ để import");
      return;
    }

    setImportLoading(true);
    try {
      let created = 0;
      for (const cls of valid) {
        // Find teacher by name or email
        const teacher = teachers.find(
          (t) =>
            t.name === cls.teacherName ||
            t.email === cls.teacherEmail ||
            t.microsoftEmail === cls.teacherEmail
        );

        await createClass({
          name: cls.name,
          code: cls.code,
          teacherId: teacher?.id || "",
          teacherName: teacher?.name || cls.teacherName,
          faceRequired: cls.faceRequired,
          peerRequired: cls.peerRequired,
        });
        created++;
      }
      message.success(`Đã tạo ${created} lớp`);
      setImportModalOpen(false);
      setImportPreview([]);
      load();
    } catch {
      message.error("Lỗi import lớp");
    } finally {
      setImportLoading(false);
    }
  };

  // ── Table columns ─────────────────────────────────────────────────────
  const columns: ColumnsType<ClassDoc> = [
    { title: "Tên lớp", dataIndex: "name", key: "name", sorter: (a, b) => a.name.localeCompare(b.name) },
    { title: "Mã lớp", dataIndex: "code", key: "code", width: 120 },
    { title: "Giảng viên", dataIndex: "teacherName", key: "teacherName", width: 180 },
    {
      title: "SV", dataIndex: "studentIds", key: "students", width: 70,
      render: (ids: string[]) => ids.length,
      sorter: (a, b) => a.studentIds.length - b.studentIds.length,
    },
    {
      title: "Cấu hình", key: "config", width: 160,
      render: (_, r) => (
        <Space size={4}>
          <Tag color={r.faceRequired !== false ? "green" : "default"}>Face</Tag>
          <Tag color={r.peerRequired !== false ? "green" : "default"}>Peer</Tag>
        </Space>
      ),
    },
    {
      title: "Ngày tạo", dataIndex: "createdAt", key: "createdAt", width: 120,
      render: (t: number) => new Date(t).toLocaleDateString("vi-VN"),
    },
    {
      title: "", key: "actions", width: 140,
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/classes/${r.id}`)} />
          <Button size="small" icon={<EditOutlined />} onClick={() => openEditModal(r)} />
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(r)} />
        </Space>
      ),
    },
  ];

  const importColumns: ColumnsType<ImportedClass> = [
    {
      title: "", key: "status", width: 40,
      render: (_, r) => r.valid
        ? <CheckCircleFilled style={{ color: "#22c55e" }} />
        : <CloseCircleFilled style={{ color: "#ef4444" }} />,
    },
    { title: "Tên lớp", dataIndex: "name", key: "name" },
    { title: "Mã lớp", dataIndex: "code", key: "code", width: 120 },
    { title: "Giảng viên", dataIndex: "teacherName", key: "teacherName" },
    { title: "Email GV", dataIndex: "teacherEmail", key: "teacherEmail" },
    {
      title: "Face", dataIndex: "faceRequired", key: "face", width: 60,
      render: (v: boolean) => v ? <Tag color="green">Có</Tag> : <Tag>Không</Tag>,
    },
    {
      title: "Peer", dataIndex: "peerRequired", key: "peer", width: 60,
      render: (v: boolean) => v ? <Tag color="green">Có</Tag> : <Tag>Không</Tag>,
    },
    {
      title: "Lỗi", dataIndex: "error", key: "error",
      render: (v: string) => v ? <Text type="danger">{v}</Text> : null,
    },
  ];

  const validCount = importPreview.filter((c) => c.valid).length;
  const invalidCount = importPreview.length - validCount;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>Quản lý lớp học</Title>
        <Space>
          <Button icon={<PlusOutlined />} type="primary" onClick={openCreateModal}>
            Tạo lớp mới
          </Button>
          <Upload
            accept=".xlsx,.xls,.csv"
            showUploadList={false}
            beforeUpload={(file) => { handleFileSelect(file); return false; }}
          >
            <Button icon={<UploadOutlined />}>Import Excel</Button>
          </Upload>
        </Space>
      </div>

      {/* Download templates */}
      <Card size="small" style={{ marginBottom: 16, background: "#f9fafb" }}>
        <Space>
          <FileExcelOutlined style={{ color: "#22c55e" }} />
          <Text type="secondary">Tải file mẫu:</Text>
          <Button type="link" size="small" icon={<DownloadOutlined />} onClick={downloadClassTemplate}>
            Mẫu import lớp học
          </Button>
          <Button type="link" size="small" icon={<DownloadOutlined />} onClick={downloadStudentTemplate}>
            Mẫu import sinh viên
          </Button>
        </Space>
      </Card>

      <Card>
        <Table
          dataSource={classes}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20, showTotal: (t) => `${t} lớp` }}
          scroll={{ x: 900 }}
          size="middle"
        />
      </Card>

      {/* ── Create/Edit Modal ────────────────────────────────────────── */}
      <Modal
        title={editingClass ? "Sửa lớp" : "Tạo lớp mới"}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        okText={editingClass ? "Cập nhật" : "Tạo"}
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Tên lớp" rules={[{ required: true, message: "Bắt buộc" }]}>
            <Input placeholder="VD: IT3030 - Nhập môn CNPM" />
          </Form.Item>
          <Form.Item name="code" label="Mã lớp" rules={[{ required: true, message: "Bắt buộc" }]}>
            <Input placeholder="VD: IT3030-01" />
          </Form.Item>
          <Form.Item name="teacherId" label="Giảng viên" rules={[{ required: true, message: "Bắt buộc" }]}>
            <Select
              showSearch
              placeholder="Chọn giảng viên"
              optionFilterProp="label"
              options={teachers.map((t) => ({ value: t.id, label: `${t.name} (${t.email || t.phone || ""})` }))}
            />
          </Form.Item>
          <Space size={32}>
            <Form.Item name="faceRequired" label="Face Verification" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="peerRequired" label="Peer Exchange" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Space>
        </Form>
      </Modal>

      {/* ── Import Preview Modal ─────────────────────────────────────── */}
      <Modal
        title="Import lớp học từ file"
        open={importModalOpen}
        onOk={handleConfirmImport}
        onCancel={() => { setImportModalOpen(false); setImportPreview([]); }}
        okText={`Import ${validCount} lớp`}
        cancelText="Hủy"
        confirmLoading={importLoading}
        width={900}
        okButtonProps={{ disabled: validCount === 0 }}
      >
        <Space direction="vertical" style={{ width: "100%", marginTop: 16 }}>
          <Space>
            <Badge count={validCount} style={{ backgroundColor: "#22c55e" }} showZero>
              <Tag>Hợp lệ</Tag>
            </Badge>
            {invalidCount > 0 && (
              <Badge count={invalidCount} style={{ backgroundColor: "#ef4444" }} showZero>
                <Tag>Lỗi</Tag>
              </Badge>
            )}
          </Space>

          {invalidCount > 0 && (
            <Alert
              type="warning"
              message={`${invalidCount} dòng bị lỗi sẽ bị bỏ qua`}
              showIcon
            />
          )}

          <Alert
            type="info"
            message="File cần có cột: Tên lớp, Mã lớp. Tùy chọn: Giảng viên, Email GV, Face, Peer"
            showIcon
          />

          <Table
            dataSource={importPreview}
            columns={importColumns}
            rowKey={(_, i) => String(i)}
            pagination={{ pageSize: 10 }}
            size="small"
            scroll={{ x: 700 }}
          />
        </Space>
      </Modal>
    </div>
  );
}
