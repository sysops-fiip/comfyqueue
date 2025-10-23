import React, { useState, useEffect } from "react";
import axios from "../api/axiosConfig";
import { io } from "socket.io-client";
import DashboardUI from "../DashboardUI";

export default function Dashboard() {
  const [jobs, setJobs] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const api = window.location.origin;

  // Fetch nodes
  const loadNodes = async () => {
    try {
      const res = await axios.get(`${api}/api/nodes`);
      setNodes(res.data);
    } catch (err) {
      console.error("Failed to load nodes:", err);
    }
  };

  // Fetch jobs
  const loadJobs = async () => {
    try {
      const res = await axios.get(`${api}/api/jobs`);
      setJobs(res.data);
    } catch (err) {
      console.error("Failed to load jobs:", err);
    }
  };

  useEffect(() => {
    loadNodes();
    loadJobs();

    // Setup Socket.IO for real-time updates
    const socket = io(api);

    socket.on("new_job", (data) => {
      console.log("New job received:", data);
      loadJobs(); // Reload jobs when a new one arrives
    });

    socket.on("job_update", (data) => {
      console.log("Job status update:", data);
      loadJobs(); // Reload jobs when status changes
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append("file", selectedFile);

    setUploading(true);
    try {
      await axios.post(`${api}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert("File uploaded successfully!");
      setSelectedFile(null);
      // Clear the file input
      e.target.reset();
      loadJobs();
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Upload failed: " + (err.response?.data?.msg || err.message));
    } finally {
      setUploading(false);
    }
  };

  const handleToggleNode = async (name, enabled) => {
    try {
      await axios.post(`${api}/api/nodes/toggle`, { name, enabled });
      loadNodes();
    } catch (err) {
      console.error("Toggle node failed:", err);
      alert("Failed to toggle node");
    }
  };

  const handleRefresh = () => {
    loadJobs();
    loadNodes();
  };

  return (
    <DashboardUI
      jobs={jobs}
      nodes={nodes}
      uploading={uploading}
      onFileChange={handleFileChange}
      onUpload={handleUpload}
      onToggleNode={handleToggleNode}
      onRefresh={handleRefresh}
    />
  );
}
