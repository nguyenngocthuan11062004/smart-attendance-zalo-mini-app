import { useMemo, useState, useEffect } from "react";
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
  getClassById, getClassStudents, addStudentsToRoster,
  removeStudentFromClass, removeRosterEntry, getTeachers, setClassRoster,
} from "@/services/admin-class.service";
import { getSessionsByClass } from "@/services/admin-attendance.service";
import { getAllStudents } from "@/services/admin-user.service";
import { parseStudentFile, exportUsersToExcel, downloadStudentTemplate, type ImportedStudent } from "@/services/import-export.service";
import type { ClassDoc, UserDoc, SessionDoc } from "@/types";
import type { ColumnsType } from "antd/es/table";

const { Title, Text } = Typography;

/** 1 dòng trong bảng SV: entry roster + tài khoản liên kết (nếu có) */
interface StudentRow {
  key: string;
  mssv: string;
  name: string;
  linked: UserDoc | null;
  inRoster: boolean;
}

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
      setStudents(studs);
      setSessions(sess);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [classId]);

  // ── Bảng SV: roster (danh sách chính thức) là NGUỒN SỰ THẬT ──────────
  // `mssv` trên user doc là TỰ KHAI khi đăng nhập — 1 tài khoản Zalo có thể
  // đổi MSSV mỗi lần login. Nếu render thẳng studentIds → bảng hiện MSSV mới
  // nhất của tài khoản (vd "Zalo User · 20256666") thay vì danh sách lớp.
  // Cách đúng: duyệt roster → đối chiếu tài khoản liên kết theo MSSV;
  // tài khoản nằm trong studentIds nhưng MSSV ngoài roster → gắn cờ cảnh báo.
  const studentRows = useMemo<StudentRow[]>(() => {
    if (!cls) return [];
    const roster = cls.roster ?? [];
    if (roster.length === 0) {
      // Lớp cũ chưa có roster → hiển thị theo tài khoản liên kết như trước
      return students.map((u) => ({
        key: u.id, mssv: u.mssv || u.id, name: u.name, linked: u, inRoster: true,
      }));
    }
    const rows: StudentRow[] = roster.map((e) => ({
      key: e.mssv,
      mssv: e.mssv,
      name: e.name,
      // Tài khoản liên kết: user doc có mssv trùng, hoặc placeholder id = mssv
      linked: students.find((u) => u.mssv === e.mssv || u.id === e.mssv) ?? null,
      inRoster: true,
    }));
    const rosterSet = new Set(roster.map((e) => e.mssv));
    for (const u of students) {
      if (!rosterSet.has(u.mssv || "") && !rosterSet.has(u.id)) {
        rows.push({ key: `extra_${u.id}`, mssv: u.mssv || "—", name: u.name, linked: u, inRoster: false });
      }
    }
    return rows;
  }, [cls, students]);

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

  // MSSV/họ tên đang gõ tay trong form (để gộp vào nút "Thêm" duy nhất)
  const watchMssv = (Form.useWatch("mssv", addForm) || "").trim();
  const watchName = (Form.useWatch("name", addForm) || "").trim();
  const hasManualEntry = !!(watchMssv && watchName);
  const totalToAdd = selectedStudentIds.length + (hasManualEntry ? 1 : 0);

  // MỘT nút thêm duy nhất: gộp SV đã chọn từ gợi ý + SV gõ tay (nếu có).
  const handleAddStudents = async () => {
    if (!classId || totalToAdd === 0) return;
    setAddLoading(true);
    try {
      // Account thật đã chọn → lấy MSSV; SV gõ tay → lấy thẳng. Dedup theo MSSV,
      // ghi vào DANH SÁCH LỚP (roster), KHÔNG tạo account giả / không đụng studentIds.
      const map = new Map<string, string>();
      let skipped = 0;
      for (const id of selectedStudentIds) {
        const s = allDbStudents.find((st) => st.id === id);
        if (s?.mssv) map.set(s.mssv, s.name);
        else skipped++;
      }
      if (hasManualEntry) map.set(watchMssv, watchName);

      if (map.size === 0) {
        message.error("Không có sinh viên hợp lệ (cần MSSV) để thêm");
        return;
      }
      await addStudentsToRoster(classId, Array.from(map, ([mssv, name]) => ({ mssv, name })));
      message.success(
        `Đã thêm ${map.size} sinh viên vào lớp${skipped > 0 ? ` (bỏ qua ${skipped} SV thiếu MSSV)` : ""}`
      );
      setAddModalOpen(false);
      setSelectedStudentIds([]);
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
      // Import = đặt lại danh sách chính thức (roster). KHÔNG tạo tài khoản giả,
      // KHÔNG đụng studentIds. SV thấy lớp khi MSSV nằm trong rosterMssv.
      const count = await setClassRoster(classId, valid.map((s) => ({ mssv: s.mssv, name: s.name })));
      message.success(`Đã cập nhật danh sách lớp: ${count} sinh viên`);
      setImportModalOpen(false);
      setImportPreview([]);
      load();
    } catch {
      message.error("Lỗi import danh sách");
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

  // Xóa theo dòng roster: gỡ khỏi roster + rosterMssv + tài khoản liên kết
  const handleRemoveRow = async (row: StudentRow) => {
    if (!classId) return;
    if (row.inRoster) {
      await removeRosterEntry(classId, row.mssv, row.linked?.id);
    } else if (row.linked) {
      // Tài khoản ngoài danh sách → chỉ gỡ liên kết khỏi studentIds
      await removeStudentFromClass(classId, row.linked.id);
    }
    message.success("Đã xóa sinh viên khỏi lớp");
    load();
  };

  // ── Columns ───────────────────────────────────────────────────────────
  const studentColumns: ColumnsType<StudentRow> = [
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
            <Text type="secondary" style={{ fontSize: 12 }}>{r.mssv}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: "Tài khoản", key: "account", width: 150,
      render: (_, r) => {
        if (!r.inRoster) {
          return <Tag color="red">Ngoài danh sách lớp</Tag>;
        }
        return r.linked
          ? <Tag color="green">Đã liên kết</Tag>
          : <Tag>Chưa đăng nhập app</Tag>;
      },
    },
    { title: "Khoa", key: "department", render: (_, r) => r.linked?.department || "—" },
    { title: "Email", key: "email", render: (_, r) => r.linked?.email || "—" },
    { title: "SĐT", key: "phone", width: 130, render: (_, r) => r.linked?.phone || "—" },
    {
      title: "Face", key: "face", width: 80,
      render: (_, r) => r.linked
        ? (r.linked.faceRegistered ? <Tag color="green">OK</Tag> : <Tag>Chưa</Tag>)
        : "—",
    },
    {
      title: "", key: "actions", width: 60,
      render: (_, r) => (
        <Popconfirm title="Xóa sinh viên khỏi lớp?" onConfirm={() => handleRemoveRow(r)} okText="Xóa" cancelText="Hủy">
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
          <Descriptions.Item label="Số sinh viên">{cls.roster?.length ?? cls.studentIds.length}</Descriptions.Item>
          <Descriptions.Item label="Lịch dạy">
            {cls.schedule
              ? `${["", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ Nhật"][cls.schedule.dayOfWeek] || "?"} · ${cls.schedule.startTime}–${cls.schedule.endTime}`
              : <Text type="secondary">Chưa cấu hình</Text>}
          </Descriptions.Item>
          <Descriptions.Item label="Phòng học">
            {cls.location || <Text type="secondary">—</Text>}
          </Descriptions.Item>
          <Descriptions.Item label="Số phiên">{sessions.length}</Descriptions.Item>
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
        </Descriptions>
      </Card>

      <Card
        title={`Sinh viên (${studentRows.filter((r) => r.inRoster).length})`}
        extra={
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAddModal}>
              Thêm sinh viên
            </Button>
            <Button icon={<DownloadOutlined />} onClick={downloadStudentTemplate}>
              Tải file mẫu
            </Button>
            <Upload
              accept=".xlsx,.xls,.csv"
              showUploadList={false}
              beforeUpload={(file) => { handleFileSelect(file); return false; }}
            >
              <Button icon={<UploadOutlined />}>Import danh sách (Excel)</Button>
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
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="Định dạng file Excel hợp lệ"
          description={
            <span>
              File cần 2 cột <strong>bắt buộc</strong>: <strong>MSSV</strong> và <strong>Họ tên</strong>{" "}
              (tùy chọn: Email, Khoa). Mỗi sinh viên 1 dòng. Bấm <strong>“Tải file mẫu”</strong> để xem đúng định dạng.{" "}
              Sinh viên chỉ thấy lớp khi <strong>MSSV của họ nằm trong danh sách này</strong>.
            </span>
          }
        />
        <Table
          dataSource={studentRows}
          columns={studentColumns}
          rowKey="key"
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
        onOk={handleAddStudents}
        onCancel={() => { setAddModalOpen(false); setSelectedStudentIds([]); addForm.resetFields(); setSearchText(""); }}
        okText={totalToAdd > 0 ? `Thêm ${totalToAdd} sinh viên` : "Thêm vào lớp"}
        cancelText="Hủy"
        confirmLoading={addLoading}
        okButtonProps={{ disabled: totalToAdd === 0 }}
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
              Hoặc nhập tay sinh viên mới
            </Text>
            <Form form={addForm} layout="vertical" size="small">
              <Space style={{ width: "100%" }} wrap>
                <Form.Item name="mssv" label="MSSV" style={{ marginBottom: 4 }}>
                  <Input placeholder="20210001" style={{ width: 130 }} />
                </Form.Item>
                <Form.Item name="name" label="Họ tên" style={{ marginBottom: 4 }}>
                  <Input placeholder="Nguyễn Văn A" style={{ width: 180 }} />
                </Form.Item>
              </Space>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Nhập đủ MSSV + Họ tên rồi bấm <b>“{totalToAdd > 0 ? `Thêm ${totalToAdd} sinh viên` : "Thêm vào lớp"}”</b> bên dưới.
              </Text>
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
