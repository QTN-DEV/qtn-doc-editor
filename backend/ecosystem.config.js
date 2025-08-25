module.exports = {
  apps: [
    {
      name: "quantum-doc-backend",
      script: "./venv/bin/python", // interpreter venv
      args: "-m uvicorn src.app:app --host 0.0.0.0 --port 8121",
      watch: false,
      instances: 1,
      env: {
        ENVIRONMENT: "production",
      },
    },
  ],
};
