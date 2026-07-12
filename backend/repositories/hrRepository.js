const money = (v) => Number(Number(v || 0).toFixed(2));
const mapStaff = (r) => r && ({ id:r.id, tenantId:r.tenant_id, staffType:r.staff_type, name:r.name, employeeId:r.employee_id||'', designation:r.designation||'', department:r.department||'', qualification:r.qualification||'', phone:r.phone||'', email:r.email||'', address:r.address||'', joiningDate:r.joining_date||'', contractType:r.contract_type, baseSalary:money(r.base_salary), status:r.status, createdAt:r.created_at, updatedAt:r.updated_at });
const mapAttendance = (r) => r && ({ id:r.id, staffId:r.staff_id, staffName:r.staff_name||'', attendanceDate:r.attendance_date, status:r.status, note:r.note||'', createdAt:r.created_at });
const mapLeave = (r) => r && ({ id:r.id, staffId:r.staff_id, staffName:r.staff_name||'', leaveType:r.leave_type, startDate:r.start_date, endDate:r.end_date, reason:r.reason||'', status:r.status, reviewedBy:r.reviewed_by, reviewedAt:r.reviewed_at, createdAt:r.created_at });
const mapPayroll = (r) => r && ({ id:r.id, staffId:r.staff_id||null, teacherId:r.teacher_id||null, staffName:r.staff_name||'', period:r.period, baseSalary:money(r.base_salary), allowances:money(r.allowances), deductions:money(r.deductions), netSalary:money(r.net_salary), status:r.status, method:r.method||'cash', paidAt:r.paid_at||'', notes:r.notes||'', createdAt:r.created_at });
const mapDocument = (r) => r && ({ id:r.id, staffId:r.staff_id, staffName:r.staff_name||'', documentType:r.document_type, title:r.title, fileUrl:r.file_url||'', notes:r.notes||'', createdAt:r.created_at });
const mapNote = (r) => r && ({ id:r.id, staffId:r.staff_id, staffName:r.staff_name||'', note:r.note, rating:r.rating, createdAt:r.created_at });

export async function listStaff(client, tenantId) {
  const res = await client.query(`SELECT * FROM staff_profiles WHERE tenant_id=$1 ORDER BY status ASC, name ASC`, [tenantId]);
  return res.rows.map(mapStaff);
}
export async function upsertStaff(client, tenantId, data) {
  const net = money(data.baseSalary);
  const vals = [data.id, tenantId, data.staffType||'non_teaching', data.name, data.employeeId||null, data.designation||'', data.department||'', data.qualification||'', data.phone||null, data.email||null, data.address||null, data.joiningDate||null, data.contractType||'permanent', net, data.status||'active'];
  const res = await client.query(`INSERT INTO staff_profiles (id,tenant_id,staff_type,name,employee_id,designation,department,qualification,phone,email,address,joining_date,contract_type,base_salary,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) ON CONFLICT (id) DO UPDATE SET staff_type=$3,name=$4,employee_id=$5,designation=$6,department=$7,qualification=$8,phone=$9,email=$10,address=$11,joining_date=$12,contract_type=$13,base_salary=$14,status=$15,updated_at=NOW() RETURNING *`, vals);
  return mapStaff(res.rows[0]);
}
export async function deleteStaff(client, tenantId, id) { await client.query(`DELETE FROM staff_profiles WHERE tenant_id=$1 AND id=$2`, [tenantId,id]); }
export async function staffExists(client, tenantId, id) { const r=await client.query(`SELECT 1 FROM staff_profiles WHERE tenant_id=$1 AND id=$2`,[tenantId,id]); return r.rows.length>0; }

export async function listAttendance(client, tenantId, date=null) { const r=await client.query(`SELECT sa.*, sp.name staff_name FROM staff_attendance sa JOIN staff_profiles sp ON sp.id=sa.staff_id WHERE sa.tenant_id=$1 AND ($2::text IS NULL OR sa.attendance_date=$2) ORDER BY sa.attendance_date DESC, sp.name ASC`,[tenantId,date]); return r.rows.map(mapAttendance); }
export async function upsertAttendance(client, tenantId, data) { const r=await client.query(`INSERT INTO staff_attendance (id,tenant_id,staff_id,attendance_date,status,note,marked_by) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (staff_id, attendance_date) DO UPDATE SET status=$5,note=$6,marked_by=$7 RETURNING *`,[data.id,tenantId,data.staffId,data.attendanceDate,data.status||'present',data.note||'',data.markedBy]); return mapAttendance(r.rows[0]); }

export async function listLeaves(client, tenantId) { const r=await client.query(`SELECT sl.*, sp.name staff_name FROM staff_leave_requests sl JOIN staff_profiles sp ON sp.id=sl.staff_id WHERE sl.tenant_id=$1 ORDER BY sl.created_at DESC`,[tenantId]); return r.rows.map(mapLeave); }
export async function createLeave(client, tenantId, data) { const r=await client.query(`INSERT INTO staff_leave_requests (id,tenant_id,staff_id,leave_type,start_date,end_date,reason) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,[data.id,tenantId,data.staffId,data.leaveType||'casual',data.startDate,data.endDate,data.reason||'']); return mapLeave(r.rows[0]); }
export async function reviewLeave(client, tenantId, id, status, reviewer) { await client.query(`UPDATE staff_leave_requests SET status=$3, reviewed_by=$4, reviewed_at=NOW() WHERE tenant_id=$1 AND id=$2`,[tenantId,id,status,reviewer]); }

export async function listPayroll(client, tenantId, period=null) {
  const r = await client.query(
    `SELECT pr.*, COALESCE(sp.name, u.name) AS staff_name
       FROM staff_payroll_records pr
       LEFT JOIN staff_profiles sp ON sp.id = pr.staff_id
       LEFT JOIN teacher_profiles tp ON tp.id = pr.teacher_id
       LEFT JOIN users u ON u.id = tp.user_id
      WHERE pr.tenant_id=$1 AND ($2::text IS NULL OR pr.period=$2)
      ORDER BY pr.period DESC, staff_name ASC`,
    [tenantId, period],
  );
  return r.rows.map(mapPayroll);
}

export async function upsertPayroll(client, tenantId, data) {
  const base=money(data.baseSalary), allow=money(data.allowances), ded=money(data.deductions), net=money(base+allow-ded);
  const status = data.status||'draft', method = data.method||'cash', paidAt = data.paidAt||null, notes = data.notes||'';
  const r = data.teacherId
    ? await client.query(
        `INSERT INTO staff_payroll_records (id,tenant_id,teacher_id,period,base_salary,allowances,deductions,net_salary,status,method,paid_at,notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT (teacher_id, period) DO UPDATE SET
           base_salary=$5,allowances=$6,deductions=$7,net_salary=$8,status=$9,method=$10,paid_at=$11,notes=$12,updated_at=NOW()
         RETURNING *`,
        [data.id, tenantId, data.teacherId, data.period, base, allow, ded, net, status, method, paidAt, notes],
      )
    : await client.query(
        `INSERT INTO staff_payroll_records (id,tenant_id,staff_id,period,base_salary,allowances,deductions,net_salary,status,method,paid_at,notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT (staff_id, period) DO UPDATE SET
           base_salary=$5,allowances=$6,deductions=$7,net_salary=$8,status=$9,method=$10,paid_at=$11,notes=$12,updated_at=NOW()
         RETURNING *`,
        [data.id, tenantId, data.staffId, data.period, base, allow, ded, net, status, method, paidAt, notes],
      );
  return mapPayroll(r.rows[0]);
}

export async function listDocuments(client, tenantId) { const r=await client.query(`SELECT sd.*, sp.name staff_name FROM staff_documents sd JOIN staff_profiles sp ON sp.id=sd.staff_id WHERE sd.tenant_id=$1 ORDER BY sd.created_at DESC`,[tenantId]); return r.rows.map(mapDocument); }
export async function createDocument(client, tenantId, data) { const r=await client.query(`INSERT INTO staff_documents (id,tenant_id,staff_id,document_type,title,file_url,notes) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,[data.id,tenantId,data.staffId,data.documentType||'joining',data.title,data.fileUrl||'',data.notes||'']); return mapDocument(r.rows[0]); }

export async function listPerformanceNotes(client, tenantId) { const r=await client.query(`SELECT pn.*, sp.name staff_name FROM staff_performance_notes pn JOIN staff_profiles sp ON sp.id=pn.staff_id WHERE pn.tenant_id=$1 ORDER BY pn.created_at DESC`,[tenantId]); return r.rows.map(mapNote); }
export async function createPerformanceNote(client, tenantId, data) { const r=await client.query(`INSERT INTO staff_performance_notes (id,tenant_id,staff_id,note,rating,created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,[data.id,tenantId,data.staffId,data.note,data.rating||null,data.createdBy]); return mapNote(r.rows[0]); }