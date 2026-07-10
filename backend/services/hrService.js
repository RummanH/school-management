import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
import * as repo from "../repositories/hrRepository.js";
import { upsertTransaction } from "../repositories/financeRepository.js";
const clean = (v) => String(v || '').trim();
export class HrService {
  constructor(databaseManager){ this.databaseManager=databaseManager; }
  requireTenant(actor){ assert(actor.tenantId,"No active organization.",403); }
  overview(actor){ this.requireTenant(actor); return this.databaseManager.withClient(async c=>({ staff:await repo.listStaff(c,actor.tenantId), attendance:await repo.listAttendance(c,actor.tenantId), leaves:await repo.listLeaves(c,actor.tenantId), payroll:await repo.listPayroll(c,actor.tenantId), documents:await repo.listDocuments(c,actor.tenantId), notes:await repo.listPerformanceNotes(c,actor.tenantId) })); }
  saveStaff(input,actor){ this.requireTenant(actor); const name=clean(input.name); assert(name,"Staff name is required.",400); return this.databaseManager.withTransaction(c=>repo.upsertStaff(c,actor.tenantId,{...input,id:input.id||createId('staff'),name})); }
  removeStaff(id,actor){ this.requireTenant(actor); return this.databaseManager.withTransaction(c=>repo.deleteStaff(c,actor.tenantId,id)); }
  markAttendance(input,actor){ this.requireTenant(actor); assert(input.staffId&&input.attendanceDate,"Staff and date are required.",400); return this.databaseManager.withTransaction(c=>repo.upsertAttendance(c,actor.tenantId,{...input,id:createId('staff_att'),markedBy:actor.id})); }
  requestLeave(input,actor){ this.requireTenant(actor); assert(input.staffId&&input.startDate&&input.endDate,"Staff and leave dates are required.",400); return this.databaseManager.withTransaction(c=>repo.createLeave(c,actor.tenantId,{...input,id:createId('staff_leave')})); }
  reviewLeave(id,status,actor){ this.requireTenant(actor); assert(['approved','rejected','pending'].includes(status),"Invalid leave status.",400); return this.databaseManager.withTransaction(c=>repo.reviewLeave(c,actor.tenantId,id,status,actor.id)); }
  savePayroll(input,actor){
    this.requireTenant(actor);
    assert(input.staffId&&input.period,"Staff and period are required.",400);
    return this.databaseManager.withTransaction(async c=>{
      const payroll=await repo.upsertPayroll(c,actor.tenantId,{...input,id:input.id||createId('staff_pay')});
      if(payroll.status==='paid'){
        await upsertTransaction(c,{
          id:createId('fintx'),tenantId:actor.tenantId,direction:'out',sourceType:'payroll',sourceId:payroll.id,
          amount:payroll.netSalary,method:'bank',category:'Staff Payroll',
          transactionDate:payroll.paidAt||`${payroll.period}-01`,recordedBy:actor.id,
          notes:`Salary for ${payroll.staffName} (${payroll.period})`,
        });
      }
      return payroll;
    });
  }
  addDocument(input,actor){ this.requireTenant(actor); assert(input.staffId&&clean(input.title),"Staff and document title are required.",400); return this.databaseManager.withTransaction(c=>repo.createDocument(c,actor.tenantId,{...input,id:createId('staff_doc')})); }
  addNote(input,actor){ this.requireTenant(actor); assert(input.staffId&&clean(input.note),"Staff and note are required.",400); return this.databaseManager.withTransaction(c=>repo.createPerformanceNote(c,actor.tenantId,{...input,id:createId('staff_note'),createdBy:actor.id})); }
}