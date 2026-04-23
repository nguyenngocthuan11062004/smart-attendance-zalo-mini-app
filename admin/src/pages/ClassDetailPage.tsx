import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card, Table, Button, Space, Typography, Tag, Descriptions, Upload, Spin,
  Popconfirm, App, Modal, Input, Form, Alert, Badge, AutoComplete, Divider,
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
import { createOrFindStudents, getAllStudents } from "@/services/admin-user.service";
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

  // Add student modal — search from DB
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addForm] = Form.useForm();
  const [addLoading, setAddLoading] = useState(false);
  const [allDbStudents, setAllDbStudents] = useState<UserDoc[]>([]);
  const [searchResults, setSearchResults] = useState<UserDoc[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [searchText, setSearchText] = useState("");

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
      console.log("studentIds:", classDoc.studentIds, "found:", studs.length, studs);
      setStudents(studs);
      setSessions(sess);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [classId]);

  // ── Search & add students from DB ─────────────────────────────────────
  const handleOpenAddModal = async () => {
    setAddModalOpen(true);
    setSearchText("");
    setSearchResults([]);
    setSelectedStudentIds([]);
    addForm.resetFields();
    setSearchLoading(true);
    try {
      const all = await getAllStudents();
      const available = all.filter((s) => !cls?.studentIds.includes(s.id));
      setAllDbStudents(available);
    } finally {
      setSearchLoading(false);
    }
  };

  // Realtime search khi gõ MSSV hoặc tên
  const handleSearch = (value: string) => {
    setSearchText(value);
    if (!value.trim()) { setSearchResults([]); return; }
    const q = value.toLowerCase();
    const filtered = allDbStudents.filter(
      (s) => (s.mssv || "").toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
    );
    setSearchResults(filtered.slice(0, 10)); // max 10 gợi ý
  };

  // Click vào gợi ý → auto-fill form + thêm vào selected
  const handleSelectStudent = (studentId: string) => {
    const student = allDbStudents.find((s) => s.id === studentId);
    if (!student) return;
    // Auto-fill form
    addForm.setFieldsValue({
      mssv: student.mssv || "",
      name: student.name,
      email: student.email || "",
      department: student.department || "",
    });
    // Thêm vào danh sách đã chọn
    if (!selectedStudentIds.includes(studentId)) {
      setSelectedStudentIds((prev) => [...prev, studentId]);
    }
    setSearchText(student.mssv || student.name);
    setSearchResults([]);
  };

  // Xóa SV khỏi danh sách đã chọn
  const handleRemoveSelected = (id: string) => {
    setSelectedStudentIds((prev) => prev.filter((sid) => sid !== id));
  };

  // Thêm tất cả SV đã chọn vào lớp
  const handleAddSelectedStudents = async () => {
    if (!classId || selectedStudentIds.length === 0) return;
    setAddLoading(true);
    try {
      await addStudentsToClass(classId, selectedStudentIds);
      message.success(`Đã thêm ${selectedStudentIds.length} sinh viên vào lớp`);
      setAddModalOpen(false);
      setSelectedStudentIds([]);
      load();
    } catch {
      message.error("Lỗi thêm sinh viên");
    } finally {
      setAddLoading(false);
    }
  };

  // Tạo SV mới nếu chưa có trong DB
  const handleCreateAndAddStudent = async () => {
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
      addForm.resetFields();
      setSearchText("");
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
        title={`Sinh viên (${cls.studentIds.length})`}
        extra={
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAddModal}>
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
        <Table
          dataSource={students}
          columns={studentColumns}
          rowKey="id"
          pagination={{ pageSize: 20 }}
          size="middle"
          scroll={{ x: 800 }}
          locale={{
            emptyText: (
              <div style={{ padding: 24 }}>
                <UserOutlined style={{ fontSize: 36, color: "#d4d4d4", display: "block", marginBottom: 12 }} />
                <p style={{ color: "#6b7280" }}>Chưa có sinh viên nào trong lớp</p>
                <Space style={{ marginTop: 8 }}>
                  <Button type="primary" size="small" icon={<PlusOutlined />} onClick={handleOpenAddModal}>Thêm sinh viên</Button>
                  <Upload accept=".xlsx,.xls,.csv" showUploadList={false} beforeUpload={(file) => { handleFileSelect(file); return false; }}>
                    <Button size="small" icon={<UploadOutlined />}>Import từ file</Button>
                  </Upload>
                </Space>
              </div>
            ),
          }}
        />
      </Card>

      <Card title={`Phiên điểm danh (${sessions.length})`}>
        <Table dataSource={sessions} columns={sessionColumns} rowKey="id" pagination={{ pageSize: 10 }} size="middle" />
      </Card>

      {/* ── Add Student Modal — Autocomplete Search ────────────────────── */}
      <Modal
        title="Thêm sinh viên vào lớp"
        open={addModalOpen}
        onOk={handleAddSelectedStudents}
        onCancel={() => { setAddModalOpen(false); setSelectedStudentIds([]); addForm.resetFields(); setSearchText(""); }}
        okText={`Thêm ${selectedStudentIds.length} sinh viên`}
        cancelText="Hủy"
        confirmLoading={addLoading}
        okButtonProps={{ disabled: selectedStudentIds.length === 0 }}
        width={600}
      >
        <Space direction="vertical" style={{ width: "100%", marginTop: 16 }} size="middle">

          {/* Autocomplete search */}
          <div>
            <Text strong style={{ display: "block", marginBottom: 8 }}>Tìm sinh viên trong hệ thống</Text>
            <AutoComplete
              style={{ width: "100%" }}
              value={searchText}
              onSearch={handleSearch}
              onSelect={handleSelectStudent}
              placeholder="Nhập MSSV hoặc tên sinh viên..."
              allowClear
              onClear={() => { setSearchText(""); setSearchResults([]); }}
              notFoundContent={searchLoading ? "Đang tải..." : searchText ? "Không tìm thấy" : null}
              options={searchResults.map((s) => ({
                value: s.id,
                label: (
                  <Space style={{ width: "100%", justifyContent: "space-between" }}>
                    <span>
                      <Text strong>{s.mssv || "—"}</Text>
                      <Text type="secondary" style={{ marginLeft: 12 }}>{s.name}</Text>
                    </span>
                    <Text type="secondary" style={{ fontSize: 12 }}>{s.email || ""}</Text>
                  </Space>
                ),
              }))}
            />
          </div>

          {/* Danh sách SV đã chọn */}
          {selectedStudentIds.length > 0 && (
            <div>
              <Text strong style={{ display: "block", marginBottom: 8 }}>
                Đã chọn ({selectedStudentIds.length})
              </Text>
              <Space wrap>
                {selectedStudentIds.map((id) => {
                  const s = allDbStudents.find((st) => st.id === id);
                  return (
                    <Tag
                      key={id}
                      closable
                      onClose={() => handleRemoveSelected(id)}
                      color="blue"
                      style={{ padding: "4px 8px", fontSize: 13 }}
                    >
                      {s?.mssv || "—"} — {s?.name || id}
                    </Tag>
                  );
                })}
              </Space>
            </div>
          )}

          {/* Auto-filled form (readonly khi đã chọn từ gợi ý) */}
          <div>
            <Divider style={{ margin: "8px 0" }} />
            <Text strong style={{ display: "block", marginBottom: 8 }}>
              Thông tin sinh viên {selectedStudentIds.length > 0 ? "(đã chọn)" : "— hoặc tạo mới"}
            </Text>
            <Form form={addForm} layout="vertical" size="small">
              <Space style={{ width: "100%" }} wrap>
                <Form.Item name="mssv" label="MSSV" style={{ marginBottom: 4 }} rules={[{ required: true, message: "Bắt buộc" }]}>
                  <Input placeholder="20210001" style={{ width: 130 }} />
                </Form.Item>
                <Form.Item name="name" label="Họ tên" style={{ marginBottom: 4 }} rules={[{ required: true, message: "Bắt buộc" }]}>
                  <Input placeholder="Nguyễn Văn A" style={{ width: 180 }} />
                </Form.Item>
                <Form.Item name="email" label="Email" style={{ marginBottom: 4 }}>
                  <Input placeholder="a@sis.hust.edu.vn" style={{ width: 200 }} />
                </Form.Item>
                <Form.Item name="department" label="Khoa" style={{ marginBottom: 4 }}>
                  <Input placeholder="CNTT" style={{ width: 130 }} />
                </Form.Item>
              </Space>
              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={handleCreateAndAddStudent}
                loading={addLoading}
                style={{ marginTop: 8 }}
              >
                Tạo sinh viên mới & thêm vào lớp
              </Button>
            </Form>
          </div>
        </Space>
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
