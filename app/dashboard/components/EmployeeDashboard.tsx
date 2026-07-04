import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Profile } from "../page";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type Task = {
  id: string;
  employee_id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
};

export default function EmployeeDashboard({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskStatus, setTaskStatus] = useState("To Do");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("employee_id", profile.employee_id)
      .order("created_at", { ascending: false });
      
    if (data) setTasks(data);
  };

  useEffect(() => {
    fetchTasks();
  }, [profile.employee_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const { error: insertError } = await supabase
        .from("tasks")
        .insert({
          employee_id: profile.employee_id,
          title: taskTitle,
          description: taskDescription,
          status: taskStatus,
        });

      if (insertError) throw insertError;
      
      setIsModalOpen(false);
      setTaskTitle("");
      setTaskDescription("");
      setTaskStatus("To Do");
      
      fetchTasks();
    } catch (err: any) {
      setError(err.message ?? "Failed to add task.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await supabase
        .from("tasks")
        .update({ status: newStatus })
        .eq("id", id);
      fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 relative">
      <div className="mb-8 rounded-[28px] border border-slate-700 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 shadow-card">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">Employee workspace</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Welcome back, {profile.full_name}</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Stay on top of your tasks, keep track of your attendance, and quickly jump to the tools you use most.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <Link href="/profile" className="block p-6 bg-slate-800 border border-slate-700 rounded-xl hover:bg-slate-700 transition-colors">
          <div className="text-3xl mb-4">👤</div>
          <h3 className="text-lg font-semibold text-white mb-2">My Profile</h3>
          <p className="text-sm text-slate-400">View and edit your personal information and documents.</p>
        </Link>
        
        <Link href="/attendance" className="block p-6 bg-slate-800 border border-slate-700 rounded-xl hover:bg-slate-700 transition-colors">
          <div className="text-3xl mb-4">📅</div>
          <h3 className="text-lg font-semibold text-white mb-2">Attendance</h3>
          <p className="text-sm text-slate-400">Check your daily and weekly attendance records.</p>
        </Link>

        <Link href="/leave" className="block p-6 bg-slate-800 border border-slate-700 rounded-xl hover:bg-slate-700 transition-colors">
          <div className="text-3xl mb-4">✈️</div>
          <h3 className="text-lg font-semibold text-white mb-2">Leave Requests</h3>
          <p className="text-sm text-slate-400">Apply for time off and check your approval status.</p>
        </Link>

        <button onClick={handleLogout} className="text-left block p-6 bg-slate-800 border border-slate-700 rounded-xl hover:bg-slate-700 transition-colors">
          <div className="text-3xl mb-4">🚪</div>
          <h3 className="text-lg font-semibold text-red-400 mb-2">Logout</h3>
          <p className="text-sm text-slate-400">Securely sign out of your account.</p>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Task Table Section */}
        <div>
          <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
            <h2 className="text-xl font-bold">My Assigned Tasks</h2>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="rounded bg-blue-600 px-4 py-1 text-xs font-semibold text-white hover:bg-blue-500 transition-colors"
            >
              + Add Task
            </button>
          </div>
          
          <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
            {tasks.length === 0 ? (
              <p className="p-6 text-sm text-slate-500 text-center">No tasks assigned yet.</p>
            ) : (
              <ul className="divide-y divide-slate-700 max-h-[400px] overflow-y-auto">
                {tasks.map((task) => (
                  <li key={task.id} className="p-4 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <h4 className="font-semibold text-white">{task.title}</h4>
                      <select 
                        value={task.status}
                        onChange={(e) => handleStatusChange(task.id, e.target.value)}
                        className={`text-xs font-medium px-2 py-1 rounded bg-[#0f111a] border border-slate-600 focus:outline-none ${
                          task.status === 'Completed' ? 'text-green-400' :
                          task.status === 'In Progress' ? 'text-blue-400' :
                          'text-yellow-400'
                        }`}
                      >
                        <option value="To Do">To Do</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>
                    {task.description && (
                      <p className="text-sm text-slate-400">{task.description}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div>
          <h2 className="text-xl font-bold mb-4 border-b border-slate-700 pb-2">Recent Activity & Alerts</h2>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-h-[400px] overflow-y-auto">
            {tasks.length === 0 ? (
              <p className="text-sm text-slate-500 text-center">No recent activity.</p>
            ) : (
              <ul className="space-y-6">
                {tasks.slice(0, 5).map((task) => (
                  <li key={`activity-${task.id}`} className="flex items-start gap-4">
                    <div className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${
                      task.status === 'Completed' ? 'bg-green-500' :
                      task.status === 'In Progress' ? 'bg-blue-500' :
                      'bg-yellow-500'
                    }`}></div>
                    <div>
                      <p className="text-white font-medium">
                        {task.status === 'Completed' ? 'Completed task' : 
                         task.status === 'In Progress' ? 'Started working on' : 
                         'Added new task'}: <span className="text-slate-300">{task.title}</span>
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(task.created_at).toLocaleString()}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Add Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-xl bg-slate-800 border border-slate-700 p-6 shadow-2xl relative">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              ✕
            </button>
            
            <h2 className="text-xl font-bold text-white mb-6">Add New Task</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full rounded bg-[#0f111a] border border-slate-700 px-4 py-2 text-white focus:outline-none focus:border-slate-500"
                  placeholder="e.g., Update Marketing Deck"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  className="w-full rounded bg-[#0f111a] border border-slate-700 px-4 py-2 text-white focus:outline-none focus:border-slate-500"
                  placeholder="Optional details..."
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Initial Status</label>
                <select
                  value={taskStatus}
                  onChange={(e) => setTaskStatus(e.target.value)}
                  className="w-full rounded bg-[#0f111a] border border-slate-700 px-4 py-2 text-white focus:outline-none focus:border-slate-500"
                >
                  <option value="To Do">To Do</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              {error && (
                <p className="text-sm text-red-400 bg-red-400/10 p-3 rounded-lg border border-red-400/20">
                  {error}
                </p>
              )}

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 rounded border border-slate-600 bg-transparent px-4 py-2 font-semibold text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-500 transition-colors disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
