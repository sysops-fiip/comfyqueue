import React, { useEffect, useState } from "react";
import axios from "axios";

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [form, setForm] = useState({ username: "", password: "", role: "editor" });
  const [nodeForm, setNodeForm] = useState({ name: "", url: "" });
  const [editUser, setEditUser] = useState(null);
  const [editNode, setEditNode] = useState(null);
  const [error, setError] = useState("");
  const [nodeError, setNodeError] = useState("");

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

  const loadNodes = async () => {
    try {
      const res = await axios.get(`${api}/api/nodes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNodes(res.data);
    } catch (err) {
      console.error("Fetch nodes error:", err);
      setNodeError("Failed to fetch nodes.");
    }
  };

  useEffect(() => {
    loadUsers();
    loadNodes();
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

  // --- Node Management Functions ---
  const handleCreateNode = async (e) => {
    e.preventDefault();
    setNodeError("");
    if (!nodeForm.name || !nodeForm.url) {
      setNodeError("Please fill all fields");
      return;
    }
    try {
      await axios.post(`${api}/api/nodes/add`, nodeForm, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNodeForm({ name: "", url: "" });
      await loadNodes();
    } catch (err) {
      console.error(err);
      setNodeError(err.response?.data?.error || "Failed to create node.");
    }
  };

  const handleToggleNode = async (name, enabled) => {
    try {
      await axios.post(
        `${api}/api/nodes/toggle`,
        { name, enabled },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await loadNodes();
    } catch (err) {
      console.error(err);
      setNodeError("Failed to toggle node.");
    }
  };

  const handleDeleteNode = async (id, name) => {
    if (!window.confirm(`Delete node ${name}?`)) return;
    try {
      await axios.delete(`${api}/api/nodes/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await loadNodes();
    } catch (err) {
      console.error(err);
      setNodeError("Failed to delete node.");
    }
  };

  const handleEditNodeSave = async (node) => {
    try {
      await axios.put(`${api}/api/nodes/${node.id}`, node, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEditNode(null);
      await loadNodes();
    } catch (err) {
      console.error(err);
      setNodeError("Failed to update node.");
    }
  };

  return (
    <div className="min-vh-100">
      {/* Heading */}
      <div className="mb-4">
        <h1 className="display-6 fw-bold text-center">ComfyQueue Admin Panel</h1>
        <p className="text-center text-secondary">Manage users, roles, and ComfyUI nodes</p>
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

      {/* Node Management Section */}
      <div className="row g-4 mt-4">
        <div className="col-12">
          <h2 className="h4 fw-semibold mb-3">Node Management</h2>
        </div>

        {/* Create Node */}
        <div className="col-12 col-md-6 col-lg-4">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <h5 className="card-title fw-semibold mb-4">Add New Node</h5>

              <form onSubmit={handleCreateNode}>
                <div className="mb-3">
                  <label className="form-label">Node Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g., Main3090"
                    value={nodeForm.name}
                    onChange={(e) => setNodeForm({ ...nodeForm, name: e.target.value })}
                  />
                </div>

                <div className="mb-4">
                  <label className="form-label">Node URL</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g., http://192.168.1.101:8188"
                    value={nodeForm.url}
                    onChange={(e) => setNodeForm({ ...nodeForm, url: e.target.value })}
                  />
                </div>

                <button type="submit" className="btn btn-primary w-100 fw-semibold">
                  Add Node
                </button>
              </form>

              {nodeError && <div className="alert alert-danger mt-3 mb-0">{nodeError}</div>}
            </div>
          </div>
        </div>

        {/* Nodes Table */}
        <div className="col-12 col-md-6 col-lg-8">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <h5 className="card-title fw-semibold mb-4">Existing Nodes</h5>

              <div className="table-responsive">
                <table className="table align-middle table-hover">
                  <thead className="table-light">
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>URL</th>
                      <th>Status</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nodes.map((n) => (
                      <tr key={n.id}>
                        <td>{n.id}</td>

                        <td>
                          {editNode?.id === n.id ? (
                            <input
                              className="form-control form-control-sm"
                              value={editNode.name}
                              onChange={(e) =>
                                setEditNode({ ...editNode, name: e.target.value })
                              }
                            />
                          ) : (
                            n.name
                          )}
                        </td>

                        <td>
                          {editNode?.id === n.id ? (
                            <input
                              className="form-control form-control-sm"
                              value={editNode.url}
                              onChange={(e) =>
                                setEditNode({ ...editNode, url: e.target.value })
                              }
                            />
                          ) : (
                            n.url
                          )}
                        </td>

                        <td>
                          <div className="form-check form-switch">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={n.enabled}
                              onChange={(e) => handleToggleNode(n.name, e.target.checked)}
                              disabled={editNode?.id === n.id}
                            />
                            <label className="form-check-label">
                              {n.enabled ? "Enabled" : "Disabled"}
                            </label>
                          </div>
                        </td>

                        <td className="text-end">
                          {editNode?.id === n.id ? (
                            <>
                              <button
                                className="btn btn-success btn-sm me-2"
                                onClick={() => handleEditNodeSave(editNode)}
                              >
                                Save
                              </button>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => setEditNode(null)}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className="btn btn-warning btn-sm me-2 text-white"
                                onClick={() => setEditNode(n)}
                              >
                                Edit
                              </button>
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => handleDeleteNode(n.id, n.name)}
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
