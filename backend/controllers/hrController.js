export class HrController {
  constructor(hrService){ this.hrService=hrService; }
  overview=async(req,res,next)=>{try{res.json(await this.hrService.overview(req.currentUser));}catch(e){next(e);}};
  saveStaff=async(req,res,next)=>{try{res.status(201).json({staff:await this.hrService.saveStaff(req.body,req.currentUser)});}catch(e){next(e);}};
  removeStaff=async(req,res,next)=>{try{await this.hrService.removeStaff(req.params.id,req.currentUser);res.json({success:true});}catch(e){next(e);}};
  markAttendance=async(req,res,next)=>{try{res.status(201).json({attendance:await this.hrService.markAttendance(req.body,req.currentUser)});}catch(e){next(e);}};
  requestLeave=async(req,res,next)=>{try{res.status(201).json({leave:await this.hrService.requestLeave(req.body,req.currentUser)});}catch(e){next(e);}};
  reviewLeave=async(req,res,next)=>{try{await this.hrService.reviewLeave(req.params.id,req.body.status,req.currentUser);res.json({success:true});}catch(e){next(e);}};
  savePayroll=async(req,res,next)=>{try{res.status(201).json({payroll:await this.hrService.savePayroll(req.body,req.currentUser)});}catch(e){next(e);}};
  addDocument=async(req,res,next)=>{try{res.status(201).json({document:await this.hrService.addDocument(req.body,req.currentUser)});}catch(e){next(e);}};
  addNote=async(req,res,next)=>{try{res.status(201).json({note:await this.hrService.addNote(req.body,req.currentUser)});}catch(e){next(e);}};
}