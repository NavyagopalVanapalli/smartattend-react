import React from 'react';

export default function SummaryCard({ students, attendance }) {
  const presentList = [];
  const absentList = [];

  students.forEach(student => {
    const isPresent = attendance[student.roll_no]?.checked;
    if (isPresent) {
      presentList.push(student);
    } else {
      absentList.push(student);
    }
  });

  return (
    <section className="summary-card">
      <div className="summary-stats">
        <div className="stat-box">
          <h4>Total Students</h4>
          <span>{students.length}</span>
        </div>
        <div className="stat-box present-box">
          <h4>Present</h4>
          <span>{presentList.length}</span>
        </div>
        <div className="stat-box absent-box">
          <h4>Absent</h4>
          <span>{absentList.length}</span>
        </div>
      </div>

      <div className="summary-lists">
        <div className="list-column">
          <h5>Present List</h5>
          <ul>
            {presentList.map(s => (
              <li key={s.roll_no}>{s.roll_no} - {s.full_name}</li>
            ))}
          </ul>
        </div>

        <div className="list-column">
          <h5>Absent List</h5>
          <ul>
            {absentList.length === 0 ? (
              <li className="empty-msg">No students marked absent.</li>
            ) : (
              absentList.map(s => (
                <li key={s.roll_no}>{s.roll_no} - {s.full_name}</li>
              ))
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}