import React from "react";
import {
  Container,
  Row,
  Col,
  Table,
  Button,
  Form,
  Card,
  Spinner,
} from "react-bootstrap";

export default function Dashboard({
  jobs = [],
  nodes = [],
  uploading = false,
  onFileChange,
  onUpload,
  onToggleNode,
  onRefresh,
}) {
  return (
    <Container fluid className="py-4 px-5">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center border-bottom pb-3">
            <h2 className="fw-semibold m-0">ComfyQueue Dashboard</h2>
          </div>
        </Col>
      </Row>

      {/* Dashboard Grid */}
      <Row className="g-4">
        {/* Upload Workflow */}
        <Col xl={4} lg={6} md={6} sm={12}>
          <Card className="shadow-sm border-0">
            <Card.Header className="fw-semibold bg-body-secondary">
              Upload Workflow
            </Card.Header>
            <Card.Body>
              <Form onSubmit={onUpload}>
                <Form.Group className="mb-3">
                  <Form.Control
                    type="file"
                    accept=".json"
                    onChange={onFileChange}
                  />
                </Form.Group>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={uploading}
                  className="w-100"
                >
                  {uploading ? (
                    <>
                      <Spinner
                        animation="border"
                        size="sm"
                        className="me-2"
                      />
                      Uploading…
                    </>
                  ) : (
                    "Upload"
                  )}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        {/* Nodes */}
        <Col xl={4} lg={6} md={6} sm={12}>
          <Card className="shadow-sm border-0">
            <Card.Header className="fw-semibold bg-body-secondary">
              Nodes
            </Card.Header>
            <Card.Body>
              {nodes.length === 0 && (
                <p className="text-muted mb-0">Waiting for node data…</p>
              )}
              {nodes.map((node) => (
                <Form.Check
                  key={node.name}
                  type="switch"
                  id={node.name}
                  label={`${node.name} (${node.enabled ? "Enabled" : "Disabled"})`}
                  checked={node.enabled}
                  onChange={(e) => onToggleNode(node.name, e.target.checked)}
                  className="mb-2"
                />
              ))}
            </Card.Body>
          </Card>
        </Col>

        {/* Job Queue */}
        <Col xl={4} lg={12}>
          <Card className="shadow-sm border-0">
            <Card.Header className="d-flex justify-content-between align-items-center bg-body-secondary fw-semibold">
              <span>Job Queue</span>
              <Button
                size="sm"
                variant="outline-secondary"
                onClick={onRefresh}
              >
                Refresh
              </Button>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="table-responsive">
                <Table
                  hover
                  bordered
                  className="align-middle mb-0"
                  style={{ fontSize: "0.9rem" }}
                >
                  <thead className="table-light">
                    <tr>
                      <th>ID</th>
                      <th>File</th>
                      <th>User</th>
                      <th>Status</th>
                      <th>Node</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center text-muted py-3">
                          No jobs yet.
                        </td>
                      </tr>
                    ) : (
                      jobs.map((job) => (
                        <tr key={job.id}>
                          <td>{job.id}</td>
                          <td className="text-truncate" style={{ maxWidth: "160px" }}>
                            {job.filename}
                          </td>
                          <td className="text-muted">
                            {job.user || "Unknown"}
                          </td>
                          <td
                            className={`fw-semibold ${
                              job.status === "pending"
                                ? "text-warning"
                                : job.status === "running"
                                ? "text-info"
                                : "text-success"
                            }`}
                          >
                            {job.status}
                          </td>
                          <td>{job.node || "-"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
