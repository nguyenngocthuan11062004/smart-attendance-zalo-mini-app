import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card, Table, Button, Modal, Form, Input, Select, Switch, Space, Typography,
  Tag, App, Upload, Alert, Badge, TimePicker,
} from "antd";
import dayjs from "dayjs";
import {
  PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined,
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
    form.setFieldsValue({ faceRequired: false, peerRequired: false });
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
      location: cls.location || "",
      dayOfWeek: cls.schedule?.dayOfWeek,
      startTime: cls.schedule?.startTime ? dayjs(cls.schedule.startTime, "HH:mm") : null,
      endTime: cls.schedule?.endTime ? dayjs(cls.schedule.endTime, "HH:mm") : null,
    });
    setModalOpen(true);
  };

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (submitting) return; // Chặn double-click
    setSubmitting(true);
    try {
      const values = await form.validateFields();
      const teacher = teachers.find((t) => t.id === values.teacherId);

      // Schedule validation: nếu user đã điền 1+ trường thì phải đủ cả 3.
      // Đầy đủ → lưu. Trống hoàn toàn → bỏ qua (không touch schedule).
      const scheduleFieldsCount =
        (values.dayOfWeek ? 1 : 0) +
        (values.startTime ? 1 : 0) +
        (values.endTime ? 1 : 0);

      if (scheduleFieldsCount > 0 && scheduleFieldsCount < 3) {
        message.error("Lịch dạy phải có đủ Thứ + giờ bắt đầu + giờ kết thúc, hoặc bỏ trống cả 3");
        setSubmitting(false);
        return;
      }

      // Build payload — CHỈ thêm field có giá trị (Firestore reject undefined).
      const payload: any = {
        name: values.name,
        code: values.code,
        teacherId: values.teacherId,
        teacherName: teacher?.name || "",
        faceRequired: values.faceRequired,
        peerRequired: values.peerRequired,
      };

      if (scheduleFieldsCount === 3) {
        payload.schedule = {
          dayOfWeek: values.dayOfWeek,
          startTime: (values.startTime as dayjs.Dayjs).format("HH:mm"),
          endTime: (values.endTime as dayjs.Dayjs).format("HH:mm"),
        };
      }
      // location chỉ thêm khi có giá trị; khi rỗng giữ nguyên giá trị cũ
      // (không truyền undefined → tránh Firestore error)
      if (values.location && values.location.trim()) {
        payload.location = values.location.trim();
      }

      if (editingClass) {
        await updateClass(editingClass.id, payload);
        message.success("Đã cập nhật lớp");
      } else {
        await createClass(payload);
        message.success("Đã tạo lớp mới");
      }

      setModalOpen(false);
      load();
    } catch (err: any) {
      // Nếu validateFields fail (lỗi trường name/code/teacher), antd tự hiển thị.
      // Catch ở đây cho các lỗi khác (Firestore, network).
      if (err?.errorFields) return; // form validation, đã có UI
      message.error("Lưu thất bại: " + (err?.message || "Vui lòng thử lại"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (cls: ClassDoc) => {
    modal.confirm({
      title: `Xóa lớp "${cls.name}"?`,
      content: `Lớp có ${cls.rosterMssv?.length ?? cls.studentIds.length} sinh viên. Hành động này không thể hoàn tác.`,
      okText: "Xóa",
      okType: "danger",
      cancelText: "Hủy",
      onOk: async () => {
        try {
          await deleteClass(cls.id);
          message.success("Đã xóa lớp");
          load();
        } catch (err: any) {
          message.error("Xóa thất bại: " + (err?.message || "Vui lòng thử lại"));
          throw err; // giữ modal mở khi lỗi
        }
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
  const dayLabels = ["", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "CN"];
  const formatSchedule = (s?: ClassDoc["schedule"]) =>
    s ? `${dayLabels[s.dayOfWeek] || "?"} · ${s.startTime}-${s.endTime}` : "—";

  const columns: ColumnsType<ClassDoc> = [
    { title: "Tên lớp", dataIndex: "name", key: "name", sorter: (a, b) => a.name.localeCompare(b.name) },
    { title: "Mã lớp", dataIndex: "code", key: "code", width: 120 },
    { title: "Giảng viên", dataIndex: "teacherName", key: "teacherName", width: 180 },
    {
      title: "SV", dataIndex: "studentIds", key: "students", width: 70,
      // Sĩ số = roster (danh sách chính thức), không phải studentIds (chỉ tài khoản đã login)
      render: (_, r) => r.rosterMssv?.length ?? r.studentIds.length,
      sorter: (a, b) => (a.rosterMssv?.length ?? a.studentIds.length) - (b.rosterMssv?.length ?? b.studentIds.length),
    },
    {
      title: "Lịch", key: "schedule", width: 140,
      render: (_, r) => <span style={{ fontSize: 13 }}>{formatSchedule(r.schedule)}</span>,
    },
    {
      title: "Phòng", dataIndex: "location", key: "location", width: 110,
      render: (v: string) => v || "—",
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
      title: "", key: "actions", width: 100,
      // Chặn nổi bọt: bấm Sửa/Xóa không kích hoạt mở chi tiết của cả dòng
      onCell: () => ({ onClick: (e: React.MouseEvent) => e.stopPropagation() }),
      render: (_, r) => (
        <Space>
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
        {/* Hover dòng → nền đỏ mờ; bấm cả dòng → mở chi tiết */}
        <style>{`
          .classes-table .ant-table-tbody > tr.ant-table-row { cursor: pointer; }
          .classes-table .ant-table-tbody > tr.ant-table-row:hover > td {
            background: rgba(190,29,44,0.06) !important;
          }
        `}</style>
        <Table
          className="classes-table"
          dataSource={classes}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20, showTotal: (t) => `${t} lớp` }}
          scroll={{ x: 900 }}
          size="middle"
          onRow={(r) => ({ onClick: () => navigate(`/classes/${r.id}`) })}
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
        confirmLoading={submitting}
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

          {/* Lịch dạy — không bắt buộc, nếu nhập đủ 3 trường thì lưu */}
          <Form.Item label="Lịch dạy" style={{ marginBottom: 0 }}>
            <Space.Compact style={{ width: "100%" }}>
              <Form.Item name="dayOfWeek" noStyle>
                <Select
                  placeholder="Thứ"
                  style={{ width: 110 }}
                  allowClear
                  options={[
                    { value: 1, label: "Thứ 2" },
                    { value: 2, label: "Thứ 3" },
                    { value: 3, label: "Thứ 4" },
                    { value: 4, label: "Thứ 5" },
                    { value: 5, label: "Thứ 6" },
                    { value: 6, label: "Thứ 7" },
                    { value: 7, label: "Chủ Nhật" },
                  ]}
                />
              </Form.Item>
              <Form.Item name="startTime" noStyle>
                <TimePicker format="HH:mm" minuteStep={5} placeholder="Bắt đầu" style={{ flex: 1 }} />
              </Form.Item>
              <Form.Item name="endTime" noStyle>
                <TimePicker format="HH:mm" minuteStep={5} placeholder="Kết thúc" style={{ flex: 1 }} />
              </Form.Item>
            </Space.Compact>
          </Form.Item>

          <Form.Item name="location" label="Phòng học / Giảng đường">
            <Input placeholder="VD: D9-201, Hội trường C2" />
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
