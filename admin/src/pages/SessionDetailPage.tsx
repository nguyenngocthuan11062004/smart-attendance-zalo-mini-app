import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card, Descriptions, Tag, Space, Button, Typography, Table, Spin, Empty, Row, Col, Statistic, Avatar, App,
} from "antd";
import { ArrowLeftOutlined, UserOutlined } from "@ant-design/icons";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/config/firebase";
import { getSessionAttendance } from "@/services/admin-attendance.service";
import { getClassById } from "@/services/admin-class.service";
import { getUserById } from "@/services/admin-user.service";
import type { AttendanceDoc, ClassDoc, SessionDoc, UserDoc } from "@/types";
import type { ColumnsType } from "antd/es/table";

const { Title, Text } = Typography;

// Trạng thái mỗi SV trong phiên: present / review / absent / late-manual
type Status = "present" | "review" | "absent";

interface StudentRow {
  studentId: string;
  studentName: string;
  status: Status;
  checkedInAt?: number;
  peerCount?: number;
  faceMatched?: boolean;
  faceConfidence?: number;
  manualBy?: string;
  manualReason?: string;
}

const STATUS_CONFIG: Record<Status, { label: string; color: string }> = {
  present: { label: "Có mặt", color: "green" },
  review: { label: "Cần xem xét", color: "orange" },
  absent: { label: "Vắng", color: "red" },
};

export default function SessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();

  const [session, setSession] = useState<SessionDoc | null>(null);
  const [classDoc, setClassDoc] = useState<ClassDoc | null>(null);
  const [teacher, setTeacher] = useState<UserDoc | null>(null);
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;
    let mounted = true;

    (async () => {
      setLoading(true);
      try {
        // 1. Load session
        const sessSnap = await getDoc(doc(db, "sessions", sessionId));
        if (!sessSnap.exists()) {
          if (mounted) {
            message.error("Không tìm thấy phiên");
            setLoading(false);
          }
          return;
        }
        const sess = { id: sessSnap.id, ...sessSnap.data() } as SessionDoc;
        if (!mounted) return;
        setSession(sess);

        // 2. Load class, teacher, attendance trong parallel
        const [cls, tch, attendance] = await Promise.all([
          getClassById(sess.classId).catch(() => null),
          getUserById(sess.teacherId).catch(() => null),
          getSessionAttendance(sessionId).catch(() => [] as AttendanceDoc[]),
        ]);
        if (!mounted) return;
        setClassDoc(cls);
        setTeacher(tch);

        // 3. Build student rows: bao gồm cả SV không check-in (mặc định "absent")
        const attendanceMap = new Map(attendance.map((a) => [a.studentId, a]));
        const studentIds = cls?.studentIds ?? [];

        // Fetch names cho student không có trong attendance (chưa check-in)
        const missingIds = studentIds.filter((id) => !attendanceMap.has(id));
        const missingUsers = await Promise.all(
          missingIds.map((id) => getUserById(id).catch(() => null))
        );
        if (!mounted) return;
        const nameMap = new Map<string, string>();
        missingUsers.forEach((u, i) => {
          if (u) nameMap.set(missingIds[i], u.name);
        });

        const result: StudentRow[] = studentIds.map((sid) => {
          const att = attendanceMap.get(sid);
          if (!att) {
            return {
              studentId: sid,
              studentName: nameMap.get(sid) || sid,
              status: "absent",
            };
          }
          // Effective status = teacherOverride nếu có, ngược lại trustScore
          const effectiveStatus = (att.teacherOverride || att.trustScore || "absent") as Status;
          return {
            studentId: sid,
            studentName: att.studentName,
            status: effectiveStatus,
            checkedInAt: att.checkedInAt,
            peerCount: att.peerCount,
            faceMatched: att.faceVerification?.matched,
            faceConfidence: att.faceVerification?.confidence,
            manualBy: (att as any).manualBy,
            manualReason: (att as any).manualReason,
          };
        });

        // Cũng include SV không trong studentIds nhưng có attendance (data anomaly)
        attendance.forEach((a) => {
          if (!studentIds.includes(a.studentId)) {
            const effectiveStatus = (a.teacherOverride || a.trustScore || "absent") as Status;
            result.push({
              studentId: a.studentId,
              studentName: a.studentName,
              status: effectiveStatus,
              checkedInAt: a.checkedInAt,
              peerCount: a.peerCount,
              faceMatched: a.faceVerification?.matched,
              faceConfidence: a.faceVerification?.confidence,
              manualBy: (a as any).manualBy,
              manualReason: (a as any).manualReason,
            });
          }
        });

        setRows(result);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [sessionId, message]);

  const columns: ColumnsType<StudentRow> = [
    {
      title: "Sinh viên",
      key: "name",
      render: (_, r) => (
        <Space>
          <Avatar size="small" icon={<UserOutlined />} />
          <a onClick={() => navigate(`/users/${r.studentId}`)}>{r.studentName}</a>
        </Space>
      ),
    },
    {
      title: "Trạng thái", dataIndex: "status", key: "status", width: 130,
      render: (s: Status) => <Tag color={STATUS_CONFIG[s].color}>{STATUS_CONFIG[s].label}</Tag>,
      filters: [
        { text: "Có mặt", value: "present" },
        { text: "Cần xem xét", value: "review" },
        { text: "Vắng", value: "absent" },
      ],
      onFilter: (v, r) => r.status === v,
    },
    {
      title: "Thời gian", dataIndex: "checkedInAt", key: "checkedInAt", width: 170,
      render: (t?: number) => t ? new Date(t).toLocaleString("vi-VN") : "—",
      sorter: (a, b) => (a.checkedInAt || 0) - (b.checkedInAt || 0),
    },
    {
      title: "Peer", dataIndex: "peerCount", key: "peerCount", width: 80,
      render: (v?: number) => v ?? "—",
    },
    {
      title: "Khuôn mặt", key: "face", width: 140,
      render: (_, r) => {
        if (r.faceMatched === undefined) return "—";
        if (r.faceMatched) {
          return <Tag color="green">Khớp ({Math.round((r.faceConfidence || 0) * 100)}%)</Tag>;
        }
        return <Tag color="default">Không khớp</Tag>;
      },
    },
    {
      title: "Ghi chú", key: "note", ellipsis: true,
      render: (_, r) => {
        if (r.manualBy) {
          return <Text type="secondary" style={{ fontSize: 12 }}>GV: {r.manualReason || "Điểm danh thủ công"}</Text>;
        }
        return r.status === "absent" && r.checkedInAt ? null : null;
      },
    },
  ];

  if (loading) {
    return <div style={{ display: "flex", justifyContent: "center", padding: 80 }}><Spin size="large" /></div>;
  }

  if (!session) {
    return (
      <Card>
        <Empty description="Không tìm thấy phiên điểm danh" />
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <Button onClick={() => navigate("/attendance")}>Quay lại</Button>
        </div>
      </Card>
    );
  }

  const presentCount = rows.filter((r) => r.status === "present").length;
  const reviewCount = rows.filter((r) => r.status === "review").length;
  const absentCount = rows.filter((r) => r.status === "absent").length;

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
          Quay lại
        </Button>
        <Title level={4} style={{ margin: 0 }}>Chi tiết phiên điểm danh</Title>
      </Space>

      {/* Session info */}
      <Card style={{ marginBottom: 16 }}>
        <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
          <Descriptions.Item label="Lớp" span={2}>
            {classDoc ? (
              <a onClick={() => navigate(`/classes/${classDoc.id}`)}>
                {classDoc.name} ({classDoc.code})
              </a>
            ) : <Text type="secondary">Lớp không tồn tại</Text>}
          </Descriptions.Item>
          <Descriptions.Item label="Giảng viên">
            {teacher ? (
              <a onClick={() => navigate(`/users/${teacher.id}`)}>{teacher.name}</a>
            ) : session.teacherId}
          </Descriptions.Item>
          <Descriptions.Item label="Trạng thái">
            {session.status === "active"
              ? <Tag color="processing">Đang diễn ra</Tag>
              : <Tag>Đã kết thúc</Tag>}
          </Descriptions.Item>
          <Descriptions.Item label="Bắt đầu">
            {new Date(session.startedAt).toLocaleString("vi-VN")}
          </Descriptions.Item>
          <Descriptions.Item label="Kết thúc">
            {session.endedAt ? new Date(session.endedAt).toLocaleString("vi-VN") : "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Yêu cầu khuôn mặt">
            {session.faceRequired === false ? <Tag>Không</Tag> : <Tag color="green">Có</Tag>}
          </Descriptions.Item>
          <Descriptions.Item label="Yêu cầu peer">
            {session.peerRequired === false ? <Tag>Không</Tag> : <Tag color="green">Có</Tag>}
          </Descriptions.Item>
          {session.location && (
            <Descriptions.Item label="Vị trí GPS" span={2}>
              {session.location.latitude.toFixed(5)}, {session.location.longitude.toFixed(5)}
              {session.geoFenceRadius ? ` (bán kính ${session.geoFenceRadius}m)` : ""}
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      {/* Summary */}
      <Card title="Tóm tắt điểm danh" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col xs={12} sm={6}>
            <Statistic title="Tổng SV" value={rows.length} />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic title="Có mặt" value={presentCount} valueStyle={{ color: "#22c55e" }} />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic title="Xem xét" value={reviewCount} valueStyle={{ color: "#f59e0b" }} />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic title="Vắng" value={absentCount} valueStyle={{ color: absentCount > 0 ? "#ef4444" : "#6b7280" }} />
          </Col>
        </Row>
      </Card>

      {/* Student list */}
      <Card title={`Danh sách sinh viên (${rows.length})`}>
        {rows.length === 0 ? (
          <Empty description="Không có sinh viên" />
        ) : (
          <Table
            dataSource={rows}
            columns={columns}
            rowKey="studentId"
            pagination={{ pageSize: 20, showTotal: (t) => `${t} SV` }}
            size="middle"
            scroll={{ x: 800 }}
          />
        )}
      </Card>
    </div>
  );
}
