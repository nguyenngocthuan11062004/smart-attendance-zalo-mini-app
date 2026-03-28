import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card, Table, Button, Space, Typography, Tag, Descriptions, Upload, Spin,
  Popconfirm, App, Modal, Input, Form, Alert, Badge,
} from "antd";
import {
  ArrowLeftOutlined, UploadOutlined, DeleteOutlined, DownloadOutlined,
  UserOutlined, PlusOutlined, CheckCircleFilled, CloseCircleFilled,
} from "@ant-design/icons";
import {
  getClassById, getClassStudents, addStudentsToClass,
  removeStudentFromClass, getTeachers,
} from "@/services/admin-class.service";
import { getSessionsByClass } from "@/services/admin-attendance.service";
import { createOrFindStudents } from "@/services/admin-user.service";
import { parseStudentFile, exportUsersToExcel, downloadStudentTemplate, type ImportedStudent } from "@/services/import-export.service";
import type { ClassDoc, UserDoc, SessionDoc } from "@/types";
import type { ColumnsType } from "antd/es/table";

const { Title, Text } = Typography;

export default function ClassDetailPage() {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const [cls, setCls] = useState<ClassDoc | null>(null);
  const [students, setStudents] = useState<UserDoc[]>([]);
  const [sessions, setSessions] = useState<SessionDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const { message } = App.useApp();

  // Add student modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addForm] = Form.useForm();
  const [addLoading, setAddLoading] = useState(false);

  // Import modal
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportedStudent[]>([]);
  const [importLoading, setImportLoading] = useState(false);

  const load = async () => {
    if (!classId) return;
    setLoading(true);
    try {
      const classDoc = await getClassById(classId);
      if (!classDoc) return;
      setCls(classDoc);

      const [studs, sess] = await Promise.all([
        getClassStudents(classDoc.studentIds),
        getSessionsByClass(classId),
      ]);
      setStudents(studs);
      setSessions(sess);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [classId]);

  // ── Add single student ────────────────────────────────────────────────
  const handleAddStudent = async () => {
    if (!classId) return;
    const values = await addForm.validateFields();
    setAddLoading(true);
    try {
      const ids = await createOrFindStudents([{
        mssv: values.mssv,
        name: values.name,
        email: values.email,
        department: values.department,
      }]);
      await addStudentsToClass(classId, ids);
      message.success(`Đã thêm ${values.name} vào lớp`);
      setAddModalOpen(false);
      addForm.resetFields();
      load();
    } catch {
      message.error("Lỗi thêm sinh viên");
    } finally {
      setAddLoading(false);
    }
  };

  // ── Import file ───────────────────────────────────────────────────────
  const handleFileSelect = async (file: File) => {
    try {
      const parsed = await parseStudentFile(file);
      setImportPreview(parsed);
      setImportModalOpen(true);
    } catch {
      message.error("Không thể đọc file. Kiểm tra định dạng.");
    }
  };

  const handleConfirmImport = async () => {
    if (!classId) return;
    const valid = importPreview.filter((s) => s.valid);
    if (valid.length === 0) {
      message.error("Không có sinh viên hợp lệ để import");
      return;
    }

    setImportLoading(true);
    try {
      const ids = await createOrFindStudents(valid);
      await addStudentsToClass(classId, ids);
      message.success(`Đã thêm ${ids.length} sinh viên vào lớp`);
      setImportModalOpen(false);
      setImportPreview([]);
      load();
    } catch {
      message.error("Lỗi import sinh viên");
    } finally {
      setImportLoading(false);
    }
  };

  // ── Remove student ────────────────────────────────────────────────────
  const handleRemoveStudent = async (studentId: string) => {
    if (!classId) return;
    await removeStudentFromClass(classId, studentId);
    message.success("Đã xóa sinh viên khỏi lớp");
    load();
  };

  // ── Columns ───────────────────────────────────────────────────────────
  const studentColumns: ColumnsType<UserDoc> = [
    {
      title: "#", key: "index", width: 50,
      render: (_, __, i) => i + 1,
    },
    {
      title: "Sinh viên", key: "name",
      render: (_, r) => (
        <Space>
          <UserOutlined />
          <div>
            <div style={{ fontWeight: 500 }}>{r.name}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>{r.mssv || r.id}</Text>
          </div>
        </Space>
      ),
    },
    { title: "Khoa", dataIndex: "department", key: "department", render: (v: string) => v || "—" },
    { title: "Email", dataIndex: "email", key: "email", render: (v: string) => v || "—" },
    { title: "SĐT", dataIndex: "phone", key: "phone", width: 130, render: (v: string) => v || "—" },
    {
      title: "Face", key: "face", width: 80,
      render: (_, r) => r.faceRegistered ? <Tag color="green">OK</Tag> : <Tag>Chưa</Tag>,
    },
    {
      title: "", key: "actions", width: 60,
      render: (_, r) => (
        <Popconfirm title="Xóa sinh viên khỏi lớp?" onConfirm={() => handleRemoveStudent(r.id)} okText="Xóa" cancelText="Hủy">
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  const sessionColumns: ColumnsType<SessionDoc> = [
    {
      title: "Trạng thái", dataIndex: "status", key: "status", width: 120,
      render: (s: string) => <Tag color={s === "active" ? "green" : "default"}>{s === "active" ? "Đang mở" : "Đã kết thúc"}</Tag>,
    },
    { title: "Bắt đầu", dataIndex: "startedAt", key: "startedAt", render: (t: number) => new Date(t).toLocaleString("vi-VN") },
    {
      title: "Kết thúc", dataIndex: "endedAt", key: "endedAt",
      render: (t: number | undefined) => t ? new Date(t).toLocaleString("vi-VN") : "—",
    },
  ];

  const importColumns: ColumnsType<ImportedStudent> = [
    {
      title: "", key: "status", width: 40,
      render: (_, r) => r.valid
        ? <CheckCircleFilled style={{ color: "#22c55e" }} />
        : <CloseCircleFilled style={{ color: "#ef4444" }} />,
    },
    { title: "MSSV", dataIndex: "mssv", key: "mssv", width: 120 },
    { title: "Họ tên", dataIndex: "name", key: "name" },
    { title: "Email", dataIndex: "email", key: "email" },
    { title: "Khoa", dataIndex: "department", key: "department" },
    {
      title: "Lỗi", dataIndex: "error", key: "error",
      render: (v: string) => v ? <Text type="danger">{v}</Text> : null,
    },
  ];

  if (loading) {
    return <div style={{ display: "flex", justifyContent: "center", paddingTop: 120 }}><Spin size="large" /></div>;
  }

  if (!cls) return <div>Không tìm thấy lớp</div>;

  const validCount = importPreview.filter((s) => s.valid).length;
  const invalidCount = importPreview.length - validCount;

  return (
    <div>
      <Space style={{ marginBottom: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/classes")}>Quay lại</Button>
        <Title level={4} style={{ margin: 0 }}>{cls.name}</Title>
        <Tag>{cls.code}</Tag>
      </Space>

      <Card style={{ marginBottom: 24 }}>
        <Descriptions column={{ xs: 1, sm: 2, lg: 3 }}>
          <Descriptions.Item label="Mã lớp">{cls.code}</Descriptions.Item>
          <Descriptions.Item label="Giảng viên">{cls.teacherName}</Descriptions.Item>
          <Descriptions.Item label="Số sinh viên">{cls.studentIds.length}</Descriptions.Item>
          <Descriptions.Item label="Face Verification">
            <Tag color={cls.faceRequired !== false ? "green" : "default"}>
              {cls.faceRequired !== false ? "Bật" : "Tắt"}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Peer Exchange">
            <Tag color={cls.peerRequired !== false ? "green" : "default"}>
              {cls.peerRequired !== false ? "Bật" : "Tắt"}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Số phiên">{sessions.length}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card
        title={`Sinh viên (${students.length})`}
        extra={
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddModalOpen(true)}>
              Thêm sinh viên
            </Button>
            <Upload
              accept=".xlsx,.xls,.csv"
              showUploadList={false}
              beforeUpload={(file) => { handleFileSelect(file); return false; }}
            >
              <Button icon={<UploadOutlined />}>Import Excel/CSV</Button>
            </Upload>
            <Button
              icon={<DownloadOutlined />}
              onClick={() => exportUsersToExcel(students, `${cls.code}_students.xlsx`)}
              disabled={students.length === 0}
            >
              Xuất Excel
            </Button>
          </Space>
        }
        style={{ marginBottom: 24 }}
      >
        {students.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
            <UserOutlined style={{ fontSize: 40, marginBottom: 16, display: "block" }} />
            <p>Chưa có sinh viên nào trong lớp</p>
            <Space>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddModalOpen(true)}>Thêm thủ công</Button>
              <Upload accept=".xlsx,.xls,.csv" showUploadList={false} beforeUpload={(file) => { handleFileSelect(file); return false; }}>
                <Button icon={<UploadOutlined />}>Import từ file</Button>
              </Upload>
            </Space>
          </div>
        ) : (
          <Table dataSource={students} columns={studentColumns} rowKey="id" pagination={{ pageSize: 20 }} size="middle" scroll={{ x: 800 }} />
        )}
      </Card>

      <Card title={`Phiên điểm danh (${sessions.length})`}>
        <Table dataSource={sessions} columns={sessionColumns} rowKey="id" pagination={{ pageSize: 10 }} size="middle" />
      </Card>

      {/* ── Add Student Modal ──────────────────────────────────────────── */}
      <Modal
        title="Thêm sinh viên"
        open={addModalOpen}
        onOk={handleAddStudent}
        onCancel={() => { setAddModalOpen(false); addForm.resetFields(); }}
        okText="Thêm"
        cancelText="Hủy"
        confirmLoading={addLoading}
      >
        <Form form={addForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="mssv" label="MSSV" rules={[{ required: true, message: "Bắt buộc" }]}>
            <Input placeholder="VD: 20210001" />
          </Form.Item>
          <Form.Item name="name" label="Họ tên" rules={[{ required: true, message: "Bắt buộc" }]}>
            <Input placeholder="VD: Nguyễn Văn A" />
          </Form.Item>
          <Form.Item name="email" label="Email">
            <Input placeholder="VD: a.nv@sis.hust.edu.vn" />
          </Form.Item>
          <Form.Item name="department" label="Khoa/Viện">
            <Input placeholder="VD: Công nghệ thông tin" />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Import Preview Modal ───────────────────────────────────────── */}
      <Modal
        title="Import sinh viên từ file"
        open={importModalOpen}
        onOk={handleConfirmImport}
        onCancel={() => { setImportModalOpen(false); setImportPreview([]); }}
        okText={`Import ${validCount} sinh viên`}
        cancelText="Hủy"
        confirmLoading={importLoading}
        width={800}
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
              message={`${invalidCount} dòng bị lỗi sẽ bị bỏ qua (thiếu MSSV hoặc Họ tên)`}
              showIcon
            />
          )}

          <Alert
            type="info"
            message={
              <span>
                File cần có cột: <b>MSSV</b>, <b>Họ tên</b>. Tùy chọn: Email, Khoa.{" "}
                <Button type="link" size="small" onClick={downloadStudentTemplate} style={{ padding: 0 }}>
                  Tải file mẫu
                </Button>
              </span>
            }
            showIcon
          />

          <Table
            dataSource={importPreview}
            columns={importColumns}
            rowKey={(_, i) => String(i)}
            pagination={{ pageSize: 10 }}
            size="small"
            scroll={{ x: 600 }}
          />
        </Space>
      </Modal>
    </div>
  );
}
