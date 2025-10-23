import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Button,
  Alert,
} from "react-bootstrap";

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const api = window.location.origin;

  useEffect(() => {
    // Force Bootstrap dark mode by default
    document.documentElement.setAttribute("data-bs-theme", "dark");
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await axios.post(`${api}/api/auth/login`, {
        username,
        password,
      });
      const { access_token, role } = res.data;

      localStorage.setItem("token", access_token);
      localStorage.setItem("role", role);

      window.location.href = role === "admin" ? "/admin" : "/";
    } catch (err) {
      console.error("Login failed:", err);
      setError("Invalid username or password.");
    }
  };

  return (
    <div
      className="d-flex align-items-center justify-content-center min-vh-100"
      style={{
        background:
          "linear-gradient(145deg, var(--bs-body-bg) 0%, var(--bs-secondary-bg) 100%)",
      }}
    >
      <Container>
        <Row className="justify-content-center">
          <Col xs={12} sm={10} md={8} lg={5}>
            <Card className="shadow-lg border-0 rounded-4 bg-body-tertiary">
              <Card.Body className="p-5">
                <h2 className="fw-bold mb-4 text-center">ComfyQueue Login</h2>

                <Form onSubmit={handleLogin}>
                  <Form.Group className="mb-3" controlId="formUsername">
                    <Form.Label>Username</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Enter username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                  </Form.Group>

                  <Form.Group className="mb-4" controlId="formPassword">
                    <Form.Label>Password</Form.Label>
                    <Form.Control
                      type="password"
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </Form.Group>

                  <Button
                    type="submit"
                    variant="primary"
                    className="w-100 fw-semibold py-2"
                  >
                    Login
                  </Button>
                </Form>

                {error && (
                  <Alert
                    variant="danger"
                    className="mt-4 mb-0 text-center fw-medium"
                  >
                    {error}
                  </Alert>
                )}
              </Card.Body>
            </Card>

            <div className="text-center mt-4 text-secondary small">
              © {new Date().getFullYear()} ComfyQueue — Admin Portal
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
}
