import React from "react";
import { Card } from "react-bootstrap";

export default function Settings() {
  return (
    <div className="container-fluid">
      <div className="row justify-content-center">
        <div className="col-12 col-md-10 col-lg-8">
          <Card className="p-4 shadow-sm border-0 bg-body-tertiary">
            <h1 className="mb-3 display-6 fw-bold text-center">User Settings</h1>
            <p className="text-center text-secondary">
              Future: theme, layout, and notification preferences.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
