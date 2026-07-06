import { User, Phone, MapPin, Calendar, Droplets, Users, BookMarked, ClipboardList } from 'lucide-react';
import { Card, InfoRow } from './Card.jsx';

export default function StudentProfile({ profile }) {
  return (
    <>
      <Card title="Academic">
        <InfoRow icon={ClipboardList} label="Student ID"     value={profile.studentId} />
        <InfoRow icon={BookMarked}   label="Class / Grade"   value={profile.className} />
        <InfoRow icon={BookMarked}   label="Section"         value={profile.section} />
        <InfoRow icon={ClipboardList} label="Roll Number"    value={profile.rollNumber} />
        <InfoRow icon={Calendar}     label="Admission Date"  value={profile.admissionDate} />
      </Card>

      <Card title="Personal">
        <InfoRow icon={Calendar}  label="Date of Birth" value={profile.dateOfBirth} />
        <InfoRow icon={User}      label="Gender"        value={profile.gender} />
        <InfoRow icon={Droplets}  label="Blood Group"   value={profile.bloodGroup} />
        <InfoRow icon={Phone}     label="Phone"         value={profile.phone} />
        <InfoRow icon={MapPin}    label="Address"       value={profile.address} />
      </Card>

      {(profile.guardianName || profile.guardianPhone) && (
        <Card title="Guardian">
          <InfoRow icon={User}  label="Name"     value={profile.guardianName} />
          <InfoRow icon={Phone} label="Phone"    value={profile.guardianPhone} />
          <InfoRow icon={Users} label="Relation" value={profile.guardianRelation} />
        </Card>
      )}
    </>
  );
}
