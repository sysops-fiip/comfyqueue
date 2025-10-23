import React, { useEffect, useState } from "react";
import axios from "axios";

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ username: "", password: "", role: "editor" });
  const [editUser, setEditUser] = useState(null);
  const [error, setError] = useState("");

  const api = window.location.origin;
  const token = localStorage.getItem("token");

  const loadUsers = async () => {
    try {
      const res = await axios.get(`${api}/api/users/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data);
    } catch (err) {
      console.error("Fetch users error:", err);
      setError("Failed to fetch users. Check backend connection.");
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.username || !form.password) {
      setError("Please fill all fields");
      return;
    }
    try {
      await axios.post(`${api}/api/users/`, form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setForm({ username: "", password: "", role: "editor" });
      await loadUsers();
    } catch (err) {
      console.error(err);
      setError("Failed to create user.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this user?")) return;
    try {
      await axios.delete(`${api}/api/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await loadUsers();
    } catch (err) {
      console.error(err);
      setError("Failed to delete user.");
    }
  };

  const handleEditSave = async (user) => {
    try {
      // Update password if provided
      if (user.password && user.password.trim() !== "") {
        await axios.put(
          `${api}/api/users/${user.id}/password`,
          { password: user.password },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      // Update username/role
      await axios.put(`${api}/api/users/${user.id}`, user, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEditUser(null);
      await loadUsers();
    } catch (err) {
      console.error(err);
      setError("Failed to update user.");
    }
  };

  return (
    <div className="min-vh-100">
      {/* Heading */}
      <div className="mb-4">
        <h1 className="display-6 fw-bold text-center">ComfyQueue Admin Panel</h1>
        <p className="text-center text-secondary">Manage users and roles</p>
      </div>

      {/* Two-column layout */}
      <div className="row g-4">
        {/* Create User */}
        <div className="col-12 col-md-6 col-lg-4">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <h5 className="card-title fw-semibold mb-4">Create New User</h5>

              <form onSubmit={handleCreate}>
                <div className="mb-3">
                  <label className="form-label">Username</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Username"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                </div>

                <div className="mb-4">
                  <label className="form-label">Role</label>
                  <select
                    className="form-select"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                  >
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <button type="submit" className="btn btn-primary w-100 fw-semibold">
                  Create
                </button>
              </form>

              {error && <div className="alert alert-danger mt-3 mb-0">{error}</div>}
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="col-12 col-md-6 col-lg-8">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <h5 className="card-title fw-semibold mb-4">Existing Users</h5>

              <div className="table-responsive">
                <table className="table align-middle table-hover">
                  <thead className="table-light">
                    <tr>
                      <th>ID</th>
                      <th>Username</th>
                      <th>Role</th>
                      <th>Password</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td>{u.id}</td>

                        <td>
                          {editUser?.id === u.id ? (
                            <input
                              className="form-control form-control-sm"
                              value={editUser.username}
                              onChange={(e) =>
                                setEditUser({ ...editUser, username: e.target.value })
                              }
                            />
                          ) : (
                            u.username
                          )}
                        </td>

                        <td>
                          {editUser?.id === u.id ? (
                            <select
                              className="form-select form-select-sm"
                              value={editUser.role}
                              onChange={(e) =>
                                setEditUser({ ...editUser, role: e.target.value })
                              }
                            >
                              <option value="editor">Editor</option>
                              <option value="admin">Admin</option>
                            </select>
                          ) : (
                            u.role
                          )}
                        </td>

                        <td>
                          {/* password column always visible; editable only while editing */}
                          <input
                            type="password"
                            disabled={editUser?.id !== u.id}
                            value={editUser?.id === u.id ? editUser.password || "" : "********"}
                            onChange={(e) =>
                              setEditUser({ ...editUser, password: e.target.value })
                            }
                            className={`form-control form-control-sm ${
                              editUser?.id === u.id ? "" : "bg-body-secondary"
                            }`}
                          />
                        </td>

                        <td className="text-end">
                          {editUser?.id === u.id ? (
                            <>
                              <button
                                className="btn btn-success btn-sm me-2"
                                onClick={() => handleEditSave(editUser)}
                              >
                                Save
                              </button>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => setEditUser(null)}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className="btn btn-warning btn-sm me-2 text-white"
                                onClick={() => setEditUser(u)}
                              >
                                Edit
                              </button>
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => handleDelete(u.id)}
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
