import * as XLSX from "xlsx";
import type { AttendanceDoc, UserDoc } from "@/types";

export interface ImportedStudent {
  mssv: string;
  name: string;
  email?: string;
  department?: string;
  valid: boolean;
  error?: string;
}

export function parseStudentFile(file: File): Promise<ImportedStudent[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);

        const students: ImportedStudent[] = rows.map((row) => {
          const mssv = (row["MSSV"] || row["mssv"] || row["Ma SV"] || "").trim();
          const name = (row["Họ tên"] || row["Name"] || row["name"] || row["Ho ten"] || "").trim();
          const email = (row["Email"] || row["email"] || "").trim();
          const department = (row["Khoa"] || row["Department"] || row["department"] || "").trim();

          const valid = mssv.length > 0 && name.length > 0;
          return {
            mssv,
            name,
            email: email || undefined,
            department: department || undefined,
            valid,
            error: !valid ? "Thiếu MSSV hoặc Họ tên" : undefined,
          };
        });

        resolve(students);
      } catch {
        reject(new Error("Không thể đọc file. Vui lòng kiểm tra định dạng."));
      }
    };
    reader.onerror = () => reject(new Error("Lỗi đọc file"));
    reader.readAsArrayBuffer(file);
  });
}

export function exportUsersToExcel(users: UserDoc[], filename: string = "users.xlsx"): void {
  const data = users.map((u) => ({
    "MSSV": u.mssv || "",
    "Họ tên": u.name,
    "Email": u.email || "",
    "SĐT": u.phone || "",
    "Khoa": u.department || "",
    "Chương trình": u.program || "",
    "Lớp": u.className || "",
    "Vai trò": u.role === "student" ? "Sinh viên" : u.role === "teacher" ? "Giảng viên" : "Admin",
    "Ngày tạo": new Date(u.createdAt).toLocaleDateString("vi-VN"),
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Users");
  XLSX.writeFile(wb, filename);
}

export function exportAttendanceToExcel(
  attendance: AttendanceDoc[],
  filename: string = "attendance.xlsx"
): void {
  const data = attendance.map((a) => ({
    "Sinh viên": a.studentName,
    "Mã phiên": a.sessionId,
    "Thời gian": new Date(a.checkedInAt).toLocaleString("vi-VN"),
    "Peer count": a.peerCount,
    "Trust Score": a.trustScore === "present" ? "Có mặt" : a.trustScore === "review" ? "Cần xem xét" : "Vắng",
    "GV override": a.teacherOverride || "",
    "Thủ công": a.manualBy ? "Có" : "",
    "Lý do thủ công": a.manualReason || "",
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Attendance");
  XLSX.writeFile(wb, filename);
}

// ── Import classes from Excel ────────────────────────────────────────────

export interface ImportedClass {
  name: string;
  code: string;
  teacherName: string;
  teacherEmail: string;
  faceRequired: boolean;
  peerRequired: boolean;
  valid: boolean;
  error?: string;
}

export function parseClassFile(file: File): Promise<ImportedClass[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);

        const classes: ImportedClass[] = rows.map((row) => {
          const name = (row["Tên lớp"] || row["Ten lop"] || row["Class Name"] || "").trim();
          const code = (row["Mã lớp"] || row["Ma lop"] || row["Class Code"] || "").trim();
          const teacherName = (row["Giảng viên"] || row["Giang vien"] || row["Teacher"] || "").trim();
          const teacherEmail = (row["Email GV"] || row["Teacher Email"] || "").trim();
          const faceStr = (row["Face"] || row["face"] || "").trim().toLowerCase();
          const peerStr = (row["Peer"] || row["peer"] || "").trim().toLowerCase();

          const faceRequired = faceStr !== "0" && faceStr !== "không" && faceStr !== "no" && faceStr !== "false";
          const peerRequired = peerStr !== "0" && peerStr !== "không" && peerStr !== "no" && peerStr !== "false";

          const valid = name.length > 0 && code.length > 0;
          return {
            name,
            code,
            teacherName,
            teacherEmail,
            faceRequired,
            peerRequired,
            valid,
            error: !valid ? "Thiếu Tên lớp hoặc Mã lớp" : undefined,
          };
        });

        resolve(classes);
      } catch {
        reject(new Error("Không thể đọc file. Vui lòng kiểm tra định dạng."));
      }
    };
    reader.onerror = () => reject(new Error("Lỗi đọc file"));
    reader.readAsArrayBuffer(file);
  });
}

// ── Download sample templates ───────────────────────────────────────────

export function downloadStudentTemplate(): void {
  const sampleData = [
    { "MSSV": "20210001", "Họ tên": "Nguyễn Văn A", "Email": "a.nv210001@sis.hust.edu.vn", "Khoa": "Công nghệ thông tin" },
    { "MSSV": "20210002", "Họ tên": "Trần Thị B", "Email": "b.tt210002@sis.hust.edu.vn", "Khoa": "Công nghệ thông tin" },
    { "MSSV": "20210003", "Họ tên": "Lê Minh C", "Email": "c.lm210003@sis.hust.edu.vn", "Khoa": "Điện tử viễn thông" },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  ws["!cols"] = [{ wch: 12 }, { wch: 20 }, { wch: 30 }, { wch: 25 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sinh viên");
  XLSX.writeFile(wb, "mau_import_sinh_vien.xlsx");
}

export function downloadClassTemplate(): void {
  const sampleData = [
    { "Tên lớp": "Nhập môn CNPM", "Mã lớp": "IT3030-01", "Giảng viên": "PGS.TS Nguyễn Văn X", "Email GV": "x.nv@hust.edu.vn", "Face": "Có", "Peer": "Có" },
    { "Tên lớp": "Cơ sở dữ liệu", "Mã lớp": "IT3090-02", "Giảng viên": "TS. Trần Thị Y", "Email GV": "y.tt@hust.edu.vn", "Face": "Có", "Peer": "Không" },
    { "Tên lớp": "Mạng máy tính", "Mã lớp": "IT4610-01", "Giảng viên": "PGS.TS Lê Minh Z", "Email GV": "z.lm@hust.edu.vn", "Face": "Không", "Peer": "Không" },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  ws["!cols"] = [{ wch: 22 }, { wch: 14 }, { wch: 25 }, { wch: 25 }, { wch: 8 }, { wch: 8 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Lớp học");
  XLSX.writeFile(wb, "mau_import_lop_hoc.xlsx");
}

export function exportToCSV(data: Record<string, unknown>[], filename: string): void {
  const ws = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
