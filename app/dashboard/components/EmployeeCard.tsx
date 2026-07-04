import React from "react";
import Link from "next/link";

export type EmployeeStatus = "present" | "leave" | "absent";

export type Employee = {
  id: string;
  name: string;
  avatarUrl: string;
  status: EmployeeStatus;
};

export default function EmployeeCard({ employee }: { employee: Employee }) {
  // Status indicator styles based on wireframe requirements:
  // Green dot: present
  // Airplane icon: on leave
  // Yellow dot: absent
  const renderStatus = () => {
    switch (employee.status) {
      case "present":
        return <div className="h-3 w-3 rounded-full bg-green-500" title="Present"></div>;
      case "absent":
        return <div className="h-3 w-3 rounded-full bg-yellow-400" title="Absent"></div>;
      case "leave":
        return (
          <span className="text-blue-400" title="On Leave">
            ✈️
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <Link href={`/employees/${employee.id}`}>
      <div className="relative flex flex-col items-center justify-center rounded-lg border border-slate-700 bg-slate-800 p-4 transition-colors hover:bg-slate-700 cursor-pointer h-40 w-full group">
        <div className="absolute top-3 right-3">{renderStatus()}</div>
        <div className="h-16 w-16 overflow-hidden rounded-md border border-slate-600 bg-slate-700 mb-3">
          {employee.avatarUrl ? (
            <img src={employee.avatarUrl} alt={employee.name} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          )}
        </div>
        <h3 className="text-sm font-medium text-slate-200">{employee.name}</h3>
      </div>
    </Link>
  );
}
