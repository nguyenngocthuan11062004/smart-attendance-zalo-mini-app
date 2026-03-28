import { useState, useEffect } from "react";
import { Card, Table, Select, DatePicker, Tag, Space, Button, Typography, App } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { getAttendanceByDateRange, getAllSessions } from "@/services/admin-attendance.service";
import { getAllClasses } from "@/services/admin-class.service";
import { exportAttendanceToExcel } from "@/services/import-export.service";
import type { AttendanceDoc, ClassDoc, SessionDoc } from "@/types";
import type { ColumnsType } from "antd/es/table";

const { Title } = Typography;
const { RangePicker } = DatePicker;

export default function AttendancePage() {
  const [attendance, setAttendance] = useState<AttendanceDoc[]>([]);
  const [classes, setClasses] = useState<ClassDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [classFilter, setClassFilter] = useState<string>("");
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(7, "day"),
    dayjs(),
  ]);
  const { message } = App.useApp();

  useEffect(() => {
    getAllClasses().then(setClasses);
  }, []);

  useEffect(() => {
    loadAttendance();
  }, [classFilter, dateRange]);

  const loadAttendance = async () => {
    setLoading(true);
    try {
      const start = dateRange[0].startOf("day").valueOf();
      const end = dateRange[1].endOf("day").valueOf();
      const data = await getAttendanceByDateRange(start, end, classFilter || undefined);
      setAttendance(data);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    exportAttendanceToExcel(attendance, `attendance_${dateRange[0].format("YYYYMMDD")}_${dateRange[1].format("YYYYMMDD")}.xlsx`);
    message.success("Đã xuất file Excel");
  };

  const trustScoreTag = (score: string) => {
    const config: Record<string, { color: string; label: string }> = {
      present: { color: "green", label: "Có mặt" },
      review: { color: "orange", label: "Cần xem xét" },
      absent: { color: "red", label: "Vắng" },
    };
    const c = config[score] || { color: "default", label: score };
    return <Tag color={c.color}>{c.label}</Tag>;
  };

  const columns: ColumnsType<AttendanceDoc> = [
    { title: "Sinh viên", dataIndex: "studentName", key: "studentName" },
    {
      title: "Thời gian", dataIndex: "checkedInAt", key: "checkedInAt", width: 170,
      render: (t: number) => new Date(t).toLocaleString("vi-VN"),
      sorter: (a, b) => a.checkedInAt - b.checkedInAt,
    },
    { title: "Peer", dataIndex: "peerCount", key: "peerCount", width: 70, sorter: (a, b) => a.peerCount - b.peerCount },
    {
      title: "Trust Score", dataIndex: "trustScore", key: "trustScore", width: 130,
      render: (s: string) => trustScoreTag(s),
      filters: [
        { text: "Có mặt", value: "present" },
        { text: "Cần xem xét", value: "review" },
        { text: "Vắng", value: "absent" },
      ],
      onFilter: (v, r) => r.trustScore === v,
    },
    {
      title: "GV Override", key: "override", width: 110,
      render: (_, r) => r.teacherOverride ? <Tag color={r.teacherOverride === "present" ? "green" : "red"}>{r.teacherOverride === "present" ? "Có mặt" : "Vắng"}</Tag> : "—",
    },
    {
      title: "Thủ công", key: "manual", width: 100,
      render: (_, r) => r.manualBy ? <Tag color="blue">GV</Tag> : "—",
    },
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>Báo cáo điểm danh</Title>

      <Card>
        <Space style={{ marginBottom: 16, width: "100%", justifyContent: "space-between" }} wrap>
          <Space wrap>
            <RangePicker
              value={dateRange}
              onChange={(dates) => {
                if (dates?.[0] && dates?.[1]) setDateRange([dates[0], dates[1]]);
              }}
              format="DD/MM/YYYY"
            />
            <Select
              value={classFilter}
              onChange={setClassFilter}
              style={{ width: 240 }}
              placeholder="Tất cả lớp"
              allowClear
              showSearch
              optionFilterProp="label"
              options={[
                { value: "", label: "Tất cả lớp" },
                ...classes.map((c) => ({ value: c.id, label: `${c.name} (${c.code})` })),
              ]}
            />
          </Space>
          <Button icon={<DownloadOutlined />} onClick={handleExport}>Xuất Excel</Button>
        </Space>

        <Table
          dataSource={attendance}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `${t} bản ghi` }}
          scroll={{ x: 800 }}
          size="middle"
        />
      </Card>
    </div>
  );
}
